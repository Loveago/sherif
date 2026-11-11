import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { sendOrdersSchema } from "@/lib/validation";
import { createOrder, isOrderProcessingHalted, resolveUserWholesalePrice } from "@/lib/orders";
import { distributeAffiliateCommissions } from "@/lib/affiliate";
import {
  validateMtnOrderRecipient,
  isMtnVerificationEnabled,
  normalizeGhanaPhoneNumber,
  recordUnverifiedMtnNumbersBatch,
} from "@/lib/mtn-verification";
import { nextBatchCode } from "@/lib/batches";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, apiError } from "@/lib/api-helpers";
import { normalizeOrderStatus, sanitizeCustomerRefundNote } from "@/lib/types";
import { parseOrderCode } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    if (await isOrderProcessingHalted()) {
      return apiError(503, "Order processing is temporarily halted. Please try again later.");
    }

    const killSwitch = await prisma.systemSetting.findUnique({
      where: { key: "number_submission_page_enabled" },
    });
    if (killSwitch?.value === "false") {
      return apiError(503, "Number submission is currently disabled by administrator.");
    }

    const body = await request.json();
    const input = sendOrdersSchema.parse(body);

    // Deduplicate within the submission batch so only one unique bundle per phone number is processed
    const seenOrderKeys = new Set<string>();
    const deduplicatedOrders: typeof input.orders = [];
    for (const o of input.orders) {
      const orderKey = `${o.phoneNumber}:${o.packageId ?? `${o.network}:${o.gbAmount}`}`;
      if (!seenOrderKeys.has(orderKey)) {
        seenOrderKeys.add(orderKey);
        deduplicatedOrders.push(o);
      }
    }

    if (deduplicatedOrders.length === 0) {
      return apiError(400, "No valid orders provided.");
    }

    const maxOrdersSetting = await prisma.systemSetting.findUnique({
      where: { key: "max_orders_per_submission" },
    });
    const maxAllowed = maxOrdersSetting?.value ? parseInt(maxOrdersSetting.value, 10) : 500;
    if (deduplicatedOrders.length > maxAllowed) {
      return apiError(400, `Maximum ${maxAllowed} orders allowed per submission.`);
    }

    // Enforce package availability: admin-disabled packages must not be
    // orderable, even from a stale page or a crafted request.
    const activePackages = await prisma.dataPackage.findMany({
      where: { active: true },
      select: { id: true, network: true, gbAmount: true },
    });
    const activeKeys = new Set(activePackages.map((p) => `${p.network}:${p.gbAmount}`));
    const activeIds = new Set(activePackages.map((p) => p.id));
    for (const o of deduplicatedOrders) {
      if (o.packageId) {
        if (!activeIds.has(o.packageId)) {
          return apiError(400, "One or more selected packages are currently unavailable.");
        }
      } else if (!activeKeys.has(`${o.network}:${o.gbAmount}`)) {
        return apiError(
          400,
          `${o.network} ${o.gbAmount}GB is currently unavailable. Please refresh the page and try again.`
        );
      }
    }

    if (user.status === "FROZEN") {
      return apiError(403, "Your account is frozen. You cannot place orders. Please contact support.");
    }

    // Check if any recipient number currently has an active in-flight order (§15).
    // If a number was part of a batch and was completed (SUCCESS), failed, or cancelled,
    // it should not be blocked regardless of other pending recipients in the batch.
    for (const o of deduplicatedOrders) {
      const latestOrder = await prisma.order.findFirst({
        where: { phoneNumber: o.phoneNumber },
        orderBy: { createdAt: "desc" },
        select: { phoneNumber: true, status: true },
      });
      if (latestOrder && (latestOrder.status === "PENDING" || latestOrder.status === "PROCESSING")) {
        return apiError(
          400,
          `Cannot place order for ${latestOrder.phoneNumber}: this number currently has an active order in ${latestOrder.status.toLowerCase()} status.`
        );
      }
    }

    // MTN single order per number a day toggle check
    const singleOrderPerDay = await prisma.systemSetting.findUnique({
      where: { key: "mtn_single_order_per_day_enabled" },
    });
    if (singleOrderPerDay?.value === "true") {
      const now = new Date();
      const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      const seenMtnSubmissionPhones = new Set<string>();
      for (const o of deduplicatedOrders) {
        if (o.network === "MTN") {
          if (seenMtnSubmissionPhones.has(o.phoneNumber)) {
            return apiError(
              400,
              `MTN number ${o.phoneNumber} has multiple orders in this batch. Only 1 order per MTN number per day is permitted.`
            );
          }
          seenMtnSubmissionPhones.add(o.phoneNumber);
          const existingToday = await prisma.order.findFirst({
            where: {
              phoneNumber: o.phoneNumber,
              network: "MTN",
              createdAt: { gte: startOfDay },
              status: { notIn: ["CANCELLED", "REFUNDED"] },
            },
          });
          if (existingToday) {
            return apiError(
              400,
              `MTN number ${o.phoneNumber} already has an order placed today. Only 1 order per MTN number per day is permitted.`
            );
          }
        }
      }
    }

    // Resolve prices & total
    const profileId = user.pricingProfileId ?? null;
    const profile = profileId
      ? await prisma.pricingProfile.findUnique({ where: { id: profileId } })
      : null;
    const isCustomProfile = profile && !profile.isDefault;

    const tiers = (isCustomProfile && profileId)
      ? await prisma.priceTier.findMany({ where: { profileId } })
      : [];
    const priceMap = new Map(tiers.map((t) => [t.gbAmount, t.priceGHS]));

    // Check if custom profile has distinct per-network rates
    let profileNetworkRates: Record<string, Array<{ gbAmount: number; priceGHS: number }>> | null = null;
    if (isCustomProfile && profileId) {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: `pricing_profile_network_rates:${profileId}` },
      });
      if (setting?.value) {
        try {
          profileNetworkRates = JSON.parse(setting.value);
        } catch {
          // ignore
        }
      }
    }

    const packages = await prisma.dataPackage.findMany({ where: { active: true } });
    const pkgMap = new Map(packages.map((p) => [`${p.network.toUpperCase()}:${p.gbAmount}`, p]));

    let total = 0;
    const priced: Array<(typeof deduplicatedOrders)[number] & { price: number; packageId?: string }> = [];
    for (const o of deduplicatedOrders) {
      const netUpper = o.network.toUpperCase();
      const pkg = pkgMap.get(`${netUpper}:${o.gbAmount}`);

      let price: number | null = null;
      if (pkg) {
        price = await resolveUserWholesalePrice(user, pkg);
      }
      if (price == null && profileNetworkRates && Array.isArray(profileNetworkRates[netUpper])) {
        const match = profileNetworkRates[netUpper].find((t) => t.gbAmount === o.gbAmount);
        if (match && typeof match.priceGHS === "number" && match.priceGHS > 0) {
          price = match.priceGHS;
        }
      }
      if (price == null && isCustomProfile && priceMap.has(o.gbAmount)) {
        const customP = priceMap.get(o.gbAmount);
        if (typeof customP === "number" && customP > 0) price = customP;
      }
      if (price == null) {
        const fallback = pkg?.retailPriceGHS ?? priceMap.get(o.gbAmount) ?? null;
        if (typeof fallback === "number" && fallback > 0) price = fallback;
      }

      if (price == null || price <= 0) {
        return apiError(
          400,
          `Cannot place order: No valid price configured for ${o.network} ${o.gbAmount}GB. Orders must have a valid price.`
        );
      }
      total += price;
      priced.push({ ...o, price, packageId: pkg?.id ?? o.packageId });
    }

    if (total <= 0) {
      return apiError(400, "Cannot place order: Total order amount must be greater than zero.");
    }

    // Validate MTN numbers before balance deduction in batch (§2, §16)
    const mtnOrders = deduplicatedOrders.filter((o) => o.network.toUpperCase() === "MTN");
    if (mtnOrders.length > 0) {
      const verificationEnabled = await isMtnVerificationEnabled();
      const mtnCanonicalList = Array.from(
        new Set(mtnOrders.map((o) => normalizeGhanaPhoneNumber(o.phoneNumber)))
      );
      const acceptedRows = await prisma.acceptedMtnNumber.findMany({
        where: { normalizedNumber: { in: mtnCanonicalList } },
        select: { normalizedNumber: true },
      });
      const acceptedSet = new Set(acceptedRows.map((r) => r.normalizedNumber));

      if (verificationEnabled) {
        let unverified = mtnOrders.filter(
          (o) => !acceptedSet.has(normalizeGhanaPhoneNumber(o.phoneNumber))
        );

        // Fallback: If Tskconnect verification is enabled, check unverified numbers against Tskconnect
        if (unverified.length > 0) {
          const tskSetting = await prisma.systemSetting.findUnique({
            where: { key: "tskconnect_mtn_verification_enabled" },
          });
          if (tskSetting?.value !== "false") {
            try {
              const { getTskconnectClient } = await import("@/lib/provider-apis/router");
              const { addAcceptedMtnNumber } = await import("@/lib/mtn-verification");
              const client = await getTskconnectClient();
              const unverifiedPhones = Array.from(
                new Set(unverified.map((o) => normalizeGhanaPhoneNumber(o.phoneNumber)))
              );
              const res = await client.verifyNumbers(unverifiedPhones);
              const validNorms = new Set(res.validNumbers.map((n: string) => normalizeGhanaPhoneNumber(n)));
              for (const phone of unverifiedPhones) {
                if (validNorms.has(phone)) {
                  await addAcceptedMtnNumber(phone, "TSKCONNECT_API", "Automated Verification API").catch(() => {});
                  acceptedSet.add(phone);
                }
              }
              // Recompute remaining unverified
              unverified = mtnOrders.filter(
                (o) => !acceptedSet.has(normalizeGhanaPhoneNumber(o.phoneNumber))
              );
            } catch (err) {
              console.error("Tskconnect verification check in /api/orders error:", err);
            }
          }
        }

        if (unverified.length > 0) {
          // Record unverified numbers in BlockedMtnNumber registry for admin review & verification
          const unverifiedItems = unverified.map((o) => ({ number: o.phoneNumber, userId: user.id }));
          await recordUnverifiedMtnNumbersBatch(unverifiedItems).catch((err) => {
            console.error("Failed to record unverified MTN numbers during order submission:", err);
          });

          const sample = unverified.slice(0, 5).map((o) => o.phoneNumber).join(", ");
          const more = unverified.length > 5 ? ` and ${unverified.length - 5} more` : "";
          return apiError(
            400,
            `Cannot place order: ${unverified.length} MTN number(s) have not been verified yet (${sample}${more}). Please submit for verification or remove them.`
          );
        }
      } else {
        // Verification toggle is OFF: allow orders, but log unverified numbers in bulk
        const unverifiedItems = mtnOrders
          .filter((o) => !acceptedSet.has(normalizeGhanaPhoneNumber(o.phoneNumber)))
          .map((o) => ({ number: o.phoneNumber, userId: user.id }));
        if (unverifiedItems.length > 0) {
          await recordUnverifiedMtnNumbersBatch(unverifiedItems);
        }
      }
    }


    if (user.balance < total) {
      return apiError(402, `Insufficient balance. You need GHS ${total.toFixed(2)} but have GHS ${user.balance.toFixed(2)}.`);
    }

    // Group recipients by network — one OrderBatch per network (§2: never mixed)
    const groups = new Map<string, Array<(typeof priced)[number]>>();
    for (const o of priced) {
      const list = groups.get(o.network) ?? [];
      list.push(o);
      groups.set(o.network, list);
    }

    // Execute atomic transaction for balance decrement, batches, orders, and ledger debit
    let created: any[] = [];
    let createdBatches: any[] = [];
    let updatedBalance = user.balance;

    try {
      const txResult = await prisma.$transaction(
        async (tx) => {
          // 1. Atomic balance deduction with balance check
          const debited = await tx.user.updateMany({
            where: { id: user.id, balance: { gte: total }, status: "ACTIVE" },
            data: { balance: { decrement: total } },
          });

          if (debited.count === 0) {
            throw new Error(
              `INSUFFICIENT_BALANCE: Insufficient balance. You need GHS ${total.toFixed(2)} but your active balance is insufficient.`
            );
          }

          const txBatches: any[] = [];
          const txOrders: any[] = [];

          for (const [network, lines] of groups) {
            const batchCode = await nextBatchCode();
            const batch = await tx.orderBatch.create({
              data: {
                batchCode,
                userId: user.id,
                network,
                totalRecipients: lines.length,
                totalGb: lines.reduce((s, l) => s + l.gbAmount, 0),
                totalAmount: lines.reduce((s, l) => s + l.price, 0),
                status: "PENDING",
              },
            });
            txBatches.push(batch);

            for (const o of lines) {
              const ord = await tx.order.create({
                data: {
                  userId: user.id,
                  phoneNumber: o.phoneNumber,
                  network: o.network,
                  gbAmount: o.gbAmount,
                  packageId: o.packageId ?? null,
                  amount: o.price,
                  status: "PENDING",
                  source: "WEB",
                  batchId: batch.id,
                  isSandbox: false,
                  history: {
                    create: {
                      status: "PENDING",
                      previousStatus: null,
                      note: "Order created via dashboard",
                      changedBy: user.email || "web",
                    },
                  },
                },
              });
              txOrders.push(ord);
            }
          }

          // Itemized ledger debit records
          if (txOrders.length === 1) {
            const o = txOrders[0];
            await tx.walletTransaction.create({
              data: {
                userId: user.id,
                type: "DEBIT",
                amount: o.amount,
                status: "APPROVED",
                reference: `order:${o.id}`,
                note: `Data: ${o.network} ${o.gbAmount}GB to ${o.phoneNumber} (Order #${o.id})`,
              },
            });
          } else if (txOrders.length > 1) {
            await tx.walletTransaction.createMany({
              data: txOrders.map((o) => ({
                userId: user.id,
                type: "DEBIT",
                amount: o.amount,
                status: "APPROVED",
                reference: `order:${o.id}`,
                note: `Data: ${o.network} ${o.gbAmount}GB to ${o.phoneNumber} (Order #${o.id})`,
              })),
            });
          }

          // Distribute cascading affiliate commissions
          for (const ord of txOrders) {
            await distributeAffiliateCommissions(tx, {
              originOrderId: ord.id,
              userId: user.id,
              packageId: ord.packageId,
              gbAmount: ord.gbAmount,
              network: ord.network,
              amount: ord.amount,
            });
          }

          const freshUser = await tx.user.findUnique({
            where: { id: user.id },
            select: { balance: true },
          });

          return {
            batches: txBatches,
            orders: txOrders,
            newBalance: freshUser?.balance ?? (user.balance - total),
          };
        },
        {
          timeout: 45000,
        }
      );

      createdBatches = txResult.batches;
      created = txResult.orders;
      updatedBalance = txResult.newBalance;
    } catch (err: any) {
      if (err?.message?.includes("INSUFFICIENT_BALANCE")) {
        return apiError(402, "Insufficient balance. Please top up and try again.");
      }
      throw err;
    }

    await recordAudit({
      userId: user.id,
      actorLabel: user.email,
      action: "order.create",
      target: `batch:${createdBatches.map((b) => b.batchCode).join(",")}`,
      newValue: JSON.stringify({
        count: created.length,
        total,
        batches: createdBatches.map((b) => ({ code: b.batchCode, network: b.network, recipients: b.totalRecipients })),
      }),
    });

    // If automated provider routing is enabled (or Clickify sandbox is active), dispatch to assigned APIs
    try {
      const { getProviderRoutingConfig, dispatchOrdersBatch, shouldAutoDispatch } = await import("@/lib/provider-apis/router");
      const config = await getProviderRoutingConfig();
      if (shouldAutoDispatch(config)) {
        // Trigger batch dispatch
        dispatchOrdersBatch(created.map((o) => o.id)).catch((err) => {
          console.error("Auto dispatch error:", err);
        });
      }
    } catch (err) {
      console.error("Auto-dispatch check error:", err);
    }

    return NextResponse.json({
      orders: created,
      batches: createdBatches,
      total,
      count: created.length,
      newBalance: updatedBalance,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 20)));
    const status = searchParams.get("status");
    const network = searchParams.get("network");
    const q = searchParams.get("q");
    const source = searchParams.get("source");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = { userId: user.id };
    if (status) where.status = normalizeOrderStatus(status);
    if (network) where.network = network;
    if (source === "API") {
      where.source = "API";
    } else if (source === "WEB" || source === "SINGLE") {
      where.source = { not: "API" };
    }
    if (q) {
      const trimmed = q.trim();
      const parsedId = parseOrderCode(trimmed);
      const idMatch = trimmed.match(/^(?:ORD-|API-)?0*(\d+)$/i);
      const orConditions: any[] = [
        { phoneNumber: { contains: trimmed } },
        { externalReference: { contains: trimmed } },
        { batch: { is: { batchCode: { contains: trimmed } } } },
      ];
      if (parsedId && parsedId > 0 && parsedId < 2147483647) {
        orConditions.push({ id: parsedId });
      } else if (idMatch && Number(idMatch[1]) < 2147483647) {
        orConditions.push({ id: Number(idMatch[1]) });
      }
      where.OR = orConditions;
    }
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, Date>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, Date>).lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          dataPackage: {
            select: { name: true },
          },
          apiCredential: {
            select: { name: true, keyPrefix: true },
          },
          batch: {
            select: {
              id: true,
              batchCode: true,
              status: true,
            },
          },
          deliveryReports: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              seq: true,
              status: true,
              proofImageMime: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    // On-demand sync for in-flight Tskconnect orders on this page (throttled to 120s and poller enabled)
    const pollerSetting = await prisma.systemSetting.findUnique({
      where: { key: "provider_sync_poller_enabled" },
    });
    const pollerEnabled = pollerSetting?.value !== "false";

    if (pollerEnabled) {
      const inFlightTskconnect = data.filter(
        (o) =>
          (o.status === "PENDING" || o.status === "PROCESSING") &&
          o.providerReference?.startsWith("TSKCONNECT:") &&
          Date.now() - new Date(o.updatedAt).getTime() > 120000
      );

      if (inFlightTskconnect.length > 0) {
        try {
          const { syncTskconnectOrder } = await import("@/lib/provider-apis/router");
          await Promise.allSettled(
            inFlightTskconnect.slice(0, 5).map(async (o) => {
              const res = await syncTskconnectOrder(o, "User Dashboard Sync");
              if (res.changed && res.newStatus) {
                o.status = res.newStatus;
              }
            })
          );
        } catch (syncErr) {
          console.error("On-demand orders sync error:", syncErr);
        }
      }
    }

    // Queue positions across the user's pending/processing orders
    const queueRows = await prisma.order.findMany({
      where: { userId: user.id, status: { in: ["PENDING", "PROCESSING"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    const queueTotal = queueRows.length;
    const positionOf = new Map<number, number>();
    queueRows.forEach((row, index) => positionOf.set(row.id, index + 1));

    const isStaff = user.role === "ADMIN" || user.role === "MANAGER";
    const dataWithQueue = data.map((order) => {
      const isDelivered = order.status === "SUCCESS" || order.status === "COMPLETED";
      const deliveredAt = isDelivered ? (order.completedAt ?? order.updatedAt) : null;
      return {
        ...order,
        providerReference: isStaff ? order.providerReference : null,
        completedAt: deliveredAt ? new Date(deliveredAt).toISOString() : null,
        failureReason: sanitizeCustomerRefundNote(order.failureReason, order.amount),
        queuePosition: positionOf.get(order.id) ?? null,
        queueTotal,
      };
    });

    return NextResponse.json({
      data: dataWithQueue,
      total,
      queueTotal,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
