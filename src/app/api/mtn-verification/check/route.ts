import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleRouteError } from "@/lib/api-helpers";
import {
  isMtnVerificationEnabled,
  normalizeGhanaPhoneNumber,
  isValidGhanaPhoneNumber,
  recordUnverifiedMtnNumbersBatch,
} from "@/lib/mtn-verification";
import { z } from "zod";

const checkSchema = z.object({
  phoneNumbers: z.array(z.string()).min(1).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { phoneNumbers } = checkSchema.parse(body);

    const verificationEnabled = await isMtnVerificationEnabled();

    // Normalize and filter valid Ghanaian phone numbers (including ported numbers)
    const mtnNumbersMap = new Map<string, string>(); // normalized -> original
    for (const raw of phoneNumbers) {
      const canonical = normalizeGhanaPhoneNumber(raw);
      if (isValidGhanaPhoneNumber(canonical)) {
        if (!mtnNumbersMap.has(canonical)) {
          mtnNumbersMap.set(canonical, raw);
        }
      }
    }

    if (mtnNumbersMap.size === 0) {
      return NextResponse.json({
        verificationEnabled,
        unverifiedNumbers: [],
      });
    }

    const canonicalList = Array.from(mtnNumbersMap.keys());
    const acceptedRows = await prisma.acceptedMtnNumber.findMany({
      where: { normalizedNumber: { in: canonicalList } },
      select: { normalizedNumber: true },
    });

    const acceptedSet = new Set(acceptedRows.map((r) => r.normalizedNumber));
    let pendingVerification: string[] = [];

    for (const [canonical, original] of mtnNumbersMap) {
      if (!acceptedSet.has(canonical)) {
        pendingVerification.push(original);
      }
    }

    // If provider verification is enabled, verify unverified numbers on active provider endpoint
    if (pendingVerification.length > 0) {
      try {
        const { getProviderRoutingConfig } = await import("@/lib/provider-apis/router");
        const { addAcceptedMtnNumber } = await import("@/lib/mtn-verification");
        const config = await getProviderRoutingConfig();

        // Tskconnect verification endpoint
        if (config.tskconnect.enabled && config.tskconnect.numberVerificationEnabled && config.tskconnect.apiKey) {
          try {
            const { TskconnectClient } = await import("@/lib/provider-apis/tskconnect");
            const client = new TskconnectClient(config.tskconnect);
            const verifyRes = await client.verifyNumbers(pendingVerification);
            const validSet = new Set(verifyRes.validNumbers.map((n) => normalizeGhanaPhoneNumber(n)));

            for (const raw of pendingVerification) {
              const canon = normalizeGhanaPhoneNumber(raw);
              if (validSet.has(canon)) {
                await addAcceptedMtnNumber(canon, "TSKCONNECT_API", "Automated Tskconnect Verification").catch(() => {});
                acceptedSet.add(canon);
              }
            }

            pendingVerification = pendingVerification.filter(
              (raw) => !acceptedSet.has(normalizeGhanaPhoneNumber(raw))
            );
          } catch (tskErr) {
            console.error("Tskconnect number verification error:", tskErr);
          }
        }
      } catch (err) {
        console.error("Provider verification check error:", err);
      }
    }

    const unverifiedNumbers = pendingVerification;

    // Capture unverified numbers in BlockedMtnNumber registry for admin review & verification
    if (unverifiedNumbers.length > 0) {
      await recordUnverifiedMtnNumbersBatch(
        unverifiedNumbers.map((num) => ({
          number: num,
          userId: user.id,
        }))
      ).catch((err) => {
        console.error("Failed to record unverified MTN numbers during check:", err);
      });
    }

    return NextResponse.json({
      verificationEnabled,
      unverifiedNumbers,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
