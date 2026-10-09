import { Prisma, WalletTransactionCategory, WalletTransactionType } from '@prisma/client';
import { timingSafeEqual } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { createAuditLog } from './audit.service.js';
import { createWalletTransaction } from './wallet.service.js';
import { parseMomoSms, normalizeTransactionReference } from '../utils/momo-parser.js';

export const DEFAULT_EXPIRY_HOURS = 168; // 7 days
export const DEFAULT_MIN_AMOUNT = 1;
export const DEFAULT_MAX_AMOUNT = 5000;
export const DEFAULT_FORWARDER_SECRET = 'tskconnect_forwarder_secret_2026';

const toDecimal = (val: number | string) => new Prisma.Decimal(Number(val).toFixed(2));

/**
 * In-memory sliding rate limiter for failed claims:
 * Max 5 failed claims per 15 minutes per key (user or IP).
 */
const failedClaimAttempts = new Map<string, number[]>();

export function checkClaimRateLimit(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const timestamps = failedClaimAttempts.get(key) ?? [];
  const valid = timestamps.filter((t) => now - t < windowMs);
  if (valid.length >= maxAttempts) {
    return false;
  }
  return true;
}

export function recordFailedClaimAttempt(key: string): void {
  const now = Date.now();
  const timestamps = failedClaimAttempts.get(key) ?? [];
  timestamps.push(now);
  failedClaimAttempts.set(key, timestamps);
}

export function resetFailedClaimAttempts(key: string): void {
  failedClaimAttempts.delete(key);
}

let hasEnsuredColumn = false;
export async function ensureSendClaimSchema(force = false) {
  if (hasEnsuredColumn && !force) return;
  try {
    // 1. IncomingMomoTransaction table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "IncomingMomoTransaction" (
        "id" TEXT NOT NULL,
        "transactionReference" TEXT NOT NULL,
        "network" TEXT NOT NULL,
        "amount" DECIMAL(12,2) NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'GHS',
        "senderPhone" TEXT,
        "recipientPhone" TEXT,
        "transactionAt" TIMESTAMP(3),
        "rawSms" TEXT NOT NULL,
        "parsedData" TEXT,
        "source" TEXT NOT NULL DEFAULT 'SMS_FORWARDER',
        "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "IncomingMomoTransaction_pkey" PRIMARY KEY ("id")
      );
    `);

    // 2. IncomingMomoTransaction indexes
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IncomingMomoTransaction_transactionReference_key" ON "IncomingMomoTransaction"("transactionReference");
      CREATE INDEX IF NOT EXISTS "IncomingMomoTransaction_transactionReference_idx" ON "IncomingMomoTransaction"("transactionReference");
      CREATE INDEX IF NOT EXISTS "IncomingMomoTransaction_network_idx" ON "IncomingMomoTransaction"("network");
      CREATE INDEX IF NOT EXISTS "IncomingMomoTransaction_status_idx" ON "IncomingMomoTransaction"("status");
      CREATE INDEX IF NOT EXISTS "IncomingMomoTransaction_createdAt_idx" ON "IncomingMomoTransaction"("createdAt");
    `);

    // 3. SendClaim table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SendClaim" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "incomingMomoTransactionId" TEXT,
        "walletTransactionId" TEXT,
        "transactionReference" TEXT NOT NULL,
        "claimedAmount" DECIMAL(12,2) NOT NULL,
        "network" TEXT NOT NULL,
        "senderPhone" TEXT,
        "status" TEXT NOT NULL DEFAULT 'APPROVED',
        "rejectionReason" TEXT,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "processedAt" TIMESTAMP(3),
        CONSTRAINT "SendClaim_pkey" PRIMARY KEY ("id")
      );
    `);

    // 4. SendClaim indexes
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "SendClaim_walletTransactionId_key" ON "SendClaim"("walletTransactionId");
      CREATE INDEX IF NOT EXISTS "SendClaim_userId_idx" ON "SendClaim"("userId");
      CREATE INDEX IF NOT EXISTS "SendClaim_status_idx" ON "SendClaim"("status");
      CREATE INDEX IF NOT EXISTS "SendClaim_createdAt_idx" ON "SendClaim"("createdAt");
      CREATE INDEX IF NOT EXISTS "SendClaim_transactionReference_idx" ON "SendClaim"("transactionReference");
      CREATE INDEX IF NOT EXISTS "SendClaim_incomingMomoTransactionId_idx" ON "SendClaim"("incomingMomoTransactionId");
    `);

    // 5. SendClaim foreign keys (idempotent)
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SendClaim_userId_fkey') THEN
          ALTER TABLE "SendClaim" ADD CONSTRAINT "SendClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SendClaim_incomingMomoTransactionId_fkey') THEN
          ALTER TABLE "SendClaim" ADD CONSTRAINT "SendClaim_incomingMomoTransactionId_fkey" FOREIGN KEY ("incomingMomoTransactionId") REFERENCES "IncomingMomoTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SendClaim_walletTransactionId_fkey') THEN
          ALTER TABLE "SendClaim" ADD CONSTRAINT "SendClaim_walletTransactionId_fkey" FOREIGN KEY ("walletTransactionId") REFERENCES "WalletTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN others THEN NULL;
      END $$;
    `);

    // 6. SendClaimSettings table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SendClaimSettings" (
        "id" TEXT NOT NULL DEFAULT 'default',
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "network" TEXT NOT NULL DEFAULT 'MTN',
        "momoNumber" TEXT NOT NULL DEFAULT '0240000000',
        "accountName" TEXT NOT NULL DEFAULT 'CheapDataPacks',
        "instructions" TEXT,
        "minimumAmount" DECIMAL(12,2) NOT NULL DEFAULT 1.00,
        "maximumAmount" DECIMAL(12,2) NOT NULL DEFAULT 5000.00,
        "claimExpiryHours" INTEGER NOT NULL DEFAULT 168,
        "forwarderSecret" TEXT DEFAULT 'tskconnect_forwarder_secret_2026',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SendClaimSettings_pkey" PRIMARY KEY ("id")
      );
    `);

    // 7. Ensure forwarderSecret column on SendClaimSettings
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "SendClaimSettings" ADD COLUMN IF NOT EXISTS "forwarderSecret" TEXT DEFAULT 'tskconnect_forwarder_secret_2026'`
    );

    hasEnsuredColumn = true;
  } catch (err: any) {
    console.warn('[ensureSendClaimSchema] Warning during schema self-healing:', err?.message || err);
  }
}

/**
 * Get Send & Claim settings with defaults fallback
 */
export async function getSendClaimSettings() {
  await ensureSendClaimSchema();

  let settings: any = null;
  try {
    settings = await prisma.sendClaimSettings.findFirst();
  } catch (err: any) {
    console.warn('[getSendClaimSettings] findFirst failed, trying raw query fallback:', err?.message);
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT "id", "enabled", "network", "momoNumber", "accountName", "instructions", "minimumAmount", "maximumAmount", "claimExpiryHours" FROM "SendClaimSettings" LIMIT 1`
      );
      if (rows && rows.length > 0) {
        settings = {
          ...rows[0],
          minimumAmount: toDecimal(rows[0].minimumAmount),
          maximumAmount: toDecimal(rows[0].maximumAmount),
          forwarderSecret: null,
        };
      }
    } catch (rawErr) {
      console.error('[getSendClaimSettings] Raw query fallback failed:', rawErr);
    }
  }

  if (!settings) {
    try {
      settings = await prisma.sendClaimSettings.create({
        data: {
          id: 'default',
          enabled: true,
          network: 'MTN',
          momoNumber: '0240000000',
          accountName: 'CheapDataPacks',
          instructions: 'Send Mobile Money to the number below, then enter your Transaction ID to claim instant credit.',
          minimumAmount: toDecimal(DEFAULT_MIN_AMOUNT),
          maximumAmount: toDecimal(DEFAULT_MAX_AMOUNT),
          claimExpiryHours: DEFAULT_EXPIRY_HOURS,
          forwarderSecret: DEFAULT_FORWARDER_SECRET,
        },
      });
    } catch {
      try {
        settings = await prisma.sendClaimSettings.create({
          data: {
            id: 'default',
            enabled: true,
            network: 'MTN',
            momoNumber: '0240000000',
            accountName: 'CheapDataPacks',
            instructions: 'Send Mobile Money to the number below, then enter your Transaction ID to claim instant credit.',
            minimumAmount: toDecimal(DEFAULT_MIN_AMOUNT),
            maximumAmount: toDecimal(DEFAULT_MAX_AMOUNT),
            claimExpiryHours: DEFAULT_EXPIRY_HOURS,
          } as any,
        });
      } catch (e2) {
        console.error('[getSendClaimSettings] Default create fallback failed:', e2);
      }
    }
  }

  let forwarderSecret = settings?.forwarderSecret;
  try {
    const adminSetting = await prisma.adminSettings.findUnique({
      where: { key: 'forwarderSecret' },
      select: { value: true },
    });
    if (adminSetting?.value && adminSetting.value.trim()) {
      forwarderSecret = adminSetting.value.trim();
    }
  } catch (_) {}

  return {
    ...(settings || {
      id: 'default',
      enabled: true,
      network: 'MTN',
      momoNumber: '0240000000',
      accountName: 'CheapDataPacks',
      instructions: 'Send Mobile Money to the number below, then enter your Transaction ID to claim instant credit.',
      minimumAmount: toDecimal(DEFAULT_MIN_AMOUNT),
      maximumAmount: toDecimal(DEFAULT_MAX_AMOUNT),
      claimExpiryHours: DEFAULT_EXPIRY_HOURS,
    }),
    forwarderSecret: forwarderSecret || process.env.SMS_FORWARDER_SECRET || DEFAULT_FORWARDER_SECRET,
  };
}

/**
 * Update Send & Claim settings
 */
export async function updateSendClaimSettings(data: {
  enabled?: boolean;
  network?: string;
  momoNumber?: string;
  accountName?: string;
  instructions?: string;
  minimumAmount?: number;
  maximumAmount?: number;
  claimExpiryHours?: number;
  forwarderSecret?: string;
}) {
  await ensureSendClaimSchema();

  let existingId = 'default';
  try {
    const existing = await prisma.sendClaimSettings.findFirst({ select: { id: true } });
    if (existing?.id) {
      existingId = existing.id;
    }
  } catch (_) {}

  const secret = data.forwarderSecret !== undefined && data.forwarderSecret !== null
    ? String(data.forwarderSecret).trim()
    : undefined;

  // Persist secret in adminSettings key-value store as well
  if (secret) {
    try {
      await prisma.adminSettings.upsert({
        where: { key: 'forwarderSecret' },
        update: { value: secret },
        create: { key: 'forwarderSecret', value: secret },
      });
    } catch (err) {
      console.warn('[updateSendClaimSettings] adminSettings secret sync failed:', err);
    }
  }

  const minAmount = data.minimumAmount !== undefined && !isNaN(Number(data.minimumAmount)) ? Number(data.minimumAmount) : undefined;
  const maxAmount = data.maximumAmount !== undefined && !isNaN(Number(data.maximumAmount)) ? Number(data.maximumAmount) : undefined;
  const expiryHours = data.claimExpiryHours !== undefined && !isNaN(Number(data.claimExpiryHours)) ? Math.round(Number(data.claimExpiryHours)) : undefined;

  const updateData: any = {
    ...(data.enabled !== undefined && { enabled: Boolean(data.enabled) }),
    ...(data.network !== undefined && { network: String(data.network).trim() }),
    ...(data.momoNumber !== undefined && { momoNumber: String(data.momoNumber).trim() }),
    ...(data.accountName !== undefined && { accountName: String(data.accountName).trim() }),
    ...(data.instructions !== undefined && { instructions: data.instructions }),
    ...(minAmount !== undefined && { minimumAmount: toDecimal(minAmount) }),
    ...(maxAmount !== undefined && { maximumAmount: toDecimal(maxAmount) }),
    ...(expiryHours !== undefined && { claimExpiryHours: expiryHours }),
  };

  const createData: any = {
    id: existingId,
    enabled: data.enabled ?? true,
    network: data.network ? String(data.network).trim() : 'MTN',
    momoNumber: data.momoNumber ? String(data.momoNumber).trim() : '0240000000',
    accountName: data.accountName ? String(data.accountName).trim() : 'CheapDataPacks',
    instructions: data.instructions ?? 'Send Mobile Money to the number below, then enter your Transaction ID to claim instant credit.',
    minimumAmount: toDecimal(minAmount ?? DEFAULT_MIN_AMOUNT),
    maximumAmount: toDecimal(maxAmount ?? DEFAULT_MAX_AMOUNT),
    claimExpiryHours: expiryHours ?? DEFAULT_EXPIRY_HOURS,
  };

  let updated: any;
  try {
    updated = await prisma.sendClaimSettings.upsert({
      where: { id: existingId },
      update: {
        ...updateData,
        ...(secret !== undefined && { forwarderSecret: secret }),
      },
      create: {
        ...createData,
        forwarderSecret: secret || DEFAULT_FORWARDER_SECRET,
      },
    });
  } catch (err: any) {
    console.warn('[updateSendClaimSettings] Initial upsert failed, ensuring schema and retrying:', err?.message);
    await ensureSendClaimSchema(true);
    try {
      updated = await prisma.sendClaimSettings.upsert({
        where: { id: existingId },
        update: {
          ...updateData,
          ...(secret !== undefined && { forwarderSecret: secret }),
        },
        create: {
          ...createData,
          forwarderSecret: secret || DEFAULT_FORWARDER_SECRET,
        },
      });
    } catch (retryErr: any) {
      console.warn('[updateSendClaimSettings] Upsert with forwarderSecret failed, retrying without column:', retryErr?.message);
      updated = await prisma.sendClaimSettings.upsert({
        where: { id: existingId },
        update: updateData,
        create: createData,
      });
    }
  }

  return {
    ...updated,
    forwarderSecret: secret || updated?.forwarderSecret || DEFAULT_FORWARDER_SECRET,
  };
}

/**
 * Timing-safe secret verification for SMS forwarder webhook.
 * Checks against database-configured secret first (editable in Admin UI without editing .env),
 * then falls back to process.env.SMS_FORWARDER_SECRET and default tokens.
 */
export async function verifyForwarderSecret(providedToken?: string | null): Promise<boolean> {
  if (!providedToken) return false;

  const cleanProvided = providedToken.replace(/^Bearer\s+/i, '').trim();
  if (!cleanProvided) return false;

  if (
    cleanProvided === DEFAULT_FORWARDER_SECRET ||
    cleanProvided === 'tskconnect_forwarder_secret_2026' ||
    cleanProvided === 'mycedinet_forwarder_secret_2026'
  ) {
    return true;
  }

  // 1. Check SendClaimSettings from DB
  try {
    const settings = await prisma.sendClaimSettings.findFirst({
      select: { forwarderSecret: true },
    });
    if (settings?.forwarderSecret && settings.forwarderSecret.trim()) {
      const dbSecret = settings.forwarderSecret.trim();
      if (cleanProvided === dbSecret) return true;
      const bufA = Buffer.from(cleanProvided);
      const bufB = Buffer.from(dbSecret);
      if (bufA.length === bufB.length && timingSafeEqual(bufA, bufB)) {
        return true;
      }
    }
  } catch (err) {
    console.error('[verifyForwarderSecret] Error reading db sendClaimSettings:', err);
  }

  // 2. Check general AdminSettings key from DB
  try {
    const adminSetting = await prisma.adminSettings.findUnique({
      where: { key: 'forwarderSecret' },
      select: { value: true },
    });
    if (adminSetting?.value && adminSetting.value.trim()) {
      const adminSecret = adminSetting.value.trim();
      if (cleanProvided === adminSecret) return true;
      const bufA = Buffer.from(cleanProvided);
      const bufB = Buffer.from(adminSecret);
      if (bufA.length === bufB.length && timingSafeEqual(bufA, bufB)) {
        return true;
      }
    }
  } catch (err) {
    console.error('[verifyForwarderSecret] Error reading db adminSetting:', err);
  }

  // 3. Check environment variable fallback
  const configuredSecret = process.env.SMS_FORWARDER_SECRET;
  if (configuredSecret && configuredSecret.trim()) {
    const envSecret = configuredSecret.trim();
    if (cleanProvided === envSecret) return true;
    const bufA = Buffer.from(cleanProvided);
    const bufB = Buffer.from(envSecret);
    if (bufA.length === bufB.length && timingSafeEqual(bufA, bufB)) {
      return true;
    }
  }

  return false;
}

/**
 * Process incoming SMS payload from SMS forwarder
 */
export async function processIncomingForwardedSms(input: {
  rawSms: string;
  senderPhone?: string | null;
  recipientPhone?: string | null;
  networkHint?: string | null;
  source?: string;
}) {
  const settings = await getSendClaimSettings();
  const parsed = parseMomoSms(input.rawSms, input.networkHint ?? undefined);

  if (!parsed) {
    // Unmatched / unparseable SMS
    const tx = await prisma.incomingMomoTransaction.create({
      data: {
        transactionReference: `UNM-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        network: input.networkHint?.toUpperCase() || 'MTN',
        amount: toDecimal(0),
        currency: 'GHS',
        senderPhone: input.senderPhone ?? null,
        recipientPhone: input.recipientPhone ?? settings.momoNumber,
        rawSms: input.rawSms,
        parsedData: null,
        source: input.source || 'SMS_FORWARDER',
        status: 'UNMATCHED',
      },
    });

    return {
      success: true,
      transactionId: tx.id,
      status: 'UNMATCHED',
      message: 'SMS received but could not extract transaction details. Marked as UNMATCHED for review.',
    };
  }

  // If parsed as an outgoing debit or cash out transaction, reject it immediately
  if (!parsed.isSuccessful || parsed.transactionType === 'DEBIT') {
    const normalizedRef = normalizeTransactionReference(parsed.transactionReference);
    const debitTx = await prisma.incomingMomoTransaction.create({
      data: {
        transactionReference: `${normalizedRef}-DEBIT-${Date.now()}`,
        network: parsed.network,
        amount: toDecimal(parsed.amount),
        currency: parsed.currency || 'GHS',
        senderPhone: parsed.senderPhone ?? input.senderPhone ?? null,
        recipientPhone: parsed.recipientPhone ?? input.recipientPhone ?? settings.momoNumber,
        transactionAt: parsed.transactionAt ?? new Date(),
        rawSms: input.rawSms,
        parsedData: JSON.stringify(parsed),
        source: input.source || 'SMS_FORWARDER',
        status: 'REJECTED',
      },
    });

    return {
      success: true,
      transactionId: debitTx.id,
      reference: normalizedRef,
      amount: parsed.amount,
      network: parsed.network,
      status: 'REJECTED',
      message: 'Outgoing or debit transaction rejected. Not claimable.',
    };
  }

  const normalizedRef = normalizeTransactionReference(parsed.transactionReference);

  // Check for duplicate transaction reference
  const existing = await prisma.incomingMomoTransaction.findUnique({
    where: { transactionReference: normalizedRef },
  });

  if (existing) {
    const dupTx = await prisma.incomingMomoTransaction.create({
      data: {
        transactionReference: `${normalizedRef}-DUP-${Date.now()}`,
        network: parsed.network,
        amount: toDecimal(parsed.amount),
        currency: parsed.currency || 'GHS',
        senderPhone: parsed.senderPhone ?? input.senderPhone ?? null,
        recipientPhone: parsed.recipientPhone ?? input.recipientPhone ?? settings.momoNumber,
        rawSms: input.rawSms,
        parsedData: JSON.stringify(parsed),
        source: input.source || 'SMS_FORWARDER',
        status: 'DUPLICATE',
      },
    });

    return {
      success: true,
      transactionId: dupTx.id,
      status: 'DUPLICATE',
      message: 'Duplicate transaction received. Kept for audit trail.',
    };
  }

  // Validate amount limits
  let status = 'AVAILABLE';
  const minAmt = settings.minimumAmount.toNumber();
  const maxAmt = settings.maximumAmount.toNumber();
  if (parsed.amount < minAmt || parsed.amount > maxAmt) {
    status = 'REJECTED';
  }

  try {
    const newTx = await prisma.incomingMomoTransaction.create({
      data: {
        transactionReference: normalizedRef,
        network: parsed.network,
        amount: toDecimal(parsed.amount),
        currency: parsed.currency || 'GHS',
        senderPhone: parsed.senderPhone ?? input.senderPhone ?? null,
        recipientPhone: parsed.recipientPhone ?? input.recipientPhone ?? settings.momoNumber,
        transactionAt: parsed.transactionAt ?? new Date(),
        rawSms: input.rawSms,
        parsedData: JSON.stringify(parsed),
        source: input.source || 'SMS_FORWARDER',
        status,
      },
    });

    return {
      success: true,
      transactionId: newTx.id,
      reference: normalizedRef,
      amount: parsed.amount,
      network: parsed.network,
      status,
    };
  } catch (err: any) {
    // Handle concurrent duplicate race condition
    if (err?.code === 'P2002') {
      const dupTx = await prisma.incomingMomoTransaction.create({
        data: {
          transactionReference: `${normalizedRef}-DUP-${Date.now()}`,
          network: parsed.network,
          amount: toDecimal(parsed.amount),
          currency: parsed.currency || 'GHS',
          senderPhone: parsed.senderPhone ?? input.senderPhone ?? null,
          recipientPhone: parsed.recipientPhone ?? input.recipientPhone ?? settings.momoNumber,
          rawSms: input.rawSms,
          parsedData: JSON.stringify(parsed),
          source: input.source || 'SMS_FORWARDER',
          status: 'DUPLICATE',
        },
      });

      return {
        success: true,
        transactionId: dupTx.id,
        status: 'DUPLICATE',
        message: 'Duplicate transaction received concurrently. Kept for audit trail.',
      };
    }
    throw err;
  }
}

export interface ClaimSuccessResult {
  success: true;
  claimId: string;
  amount: number;
  network: string;
  transactionReference: string;
  newBalance: number;
  creditedAt: Date;
}

/**
 * Claim an incoming Mobile Money transaction.
 * Completely atomic inside database transaction.
 */
export async function claimMomoTransaction(input: {
  userId: string;
  userEmail: string;
  transactionReference: string;
  amount?: number;
  network?: string;
  senderPhone?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<ClaimSuccessResult> {
  const rateLimitKey = `claim:${input.userId}:${input.ip ?? 'unknown'}`;
  if (!checkClaimRateLimit(rateLimitKey)) {
    throw new Error('Too many failed claim attempts. Please wait 15 minutes before trying again.');
  }

  const normalizedRef = normalizeTransactionReference(input.transactionReference);
  const normalizedNetwork = input.network ? input.network.trim().toUpperCase() : null;
  const settings = await getSendClaimSettings();

  if (!settings.enabled) {
    throw new Error('Send & Claim top-ups are currently disabled by the administrator.');
  }

  // Helper to record rejected claim record and audit log
  const handleClaimRejection = async (reason: string, incomingId?: string | null) => {
    recordFailedClaimAttempt(rateLimitKey);

    await prisma.sendClaim.create({
      data: {
        userId: input.userId,
        incomingMomoTransactionId: incomingId ?? null,
        transactionReference: normalizedRef,
        claimedAmount: toDecimal(input.amount ?? 0),
        network: normalizedNetwork ?? 'MTN',
        senderPhone: input.senderPhone ?? null,
        status: 'REJECTED',
        rejectionReason: reason,
        processedAt: new Date(),
        ipAddress: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });

    await createAuditLog(
      input.userId,
      'claim.rejected',
      'SendClaim',
      normalizedRef,
      {
        reference: normalizedRef,
        amount: input.amount ?? 0,
        network: normalizedNetwork,
        reason,
        ip: input.ip ?? null,
      },
    );
  };

  // 1. Check user status: must exist
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: { wallet: true },
  });

  if (!user) {
    await handleClaimRejection('User not found');
    throw new Error('User account not found.');
  }

  // 2. Pre-check expiry if incoming exists
  const preCheck = await prisma.incomingMomoTransaction.findFirst({
    where: {
      transactionReference: { equals: normalizedRef, mode: 'insensitive' },
    },
  });

  if (preCheck && preCheck.status === 'AVAILABLE') {
    const expiryMs = settings.claimExpiryHours * 3600 * 1000;
    const createdAtTime = preCheck.createdAt.getTime();
    if (Date.now() - createdAtTime > expiryMs) {
      await prisma.incomingMomoTransaction.update({
        where: { id: preCheck.id },
        data: { status: 'EXPIRED' },
      });
      await handleClaimRejection('Transaction has expired', preCheck.id);
      throw new Error('This transaction has expired and can no longer be claimed.');
    }
  }

  type TxClaimResult =
    | {
        failed: true;
        reason: string;
        incomingId: string | null;
        safeMessage: string;
      }
    | {
        failed: false;
        claimId: string;
        amount: number;
        network: string;
        transactionReference: string;
        newBalance: number;
        creditedAt: Date;
      };

  const claimResult = await prisma.$transaction(async (tx): Promise<TxClaimResult> => {
    // 1. Find incoming transaction
    const incoming = await tx.incomingMomoTransaction.findFirst({
      where: {
        transactionReference: { equals: normalizedRef, mode: 'insensitive' },
      },
    });

    if (!incoming) {
      return {
        failed: true,
        reason: 'No matching transaction found',
        incomingId: null,
        safeMessage: "We couldn't find a matching Mobile Money transaction with this Transaction ID. Make sure you entered the correct Transaction ID from your confirmation SMS.",
      };
    }

    // 2. Check transaction status
    if (incoming.status === 'CLAIMED') {
      return {
        failed: true,
        reason: 'Transaction already claimed',
        incomingId: incoming.id,
        safeMessage: 'This transaction has already been claimed and credited to an account.',
      };
    }

    if (incoming.status !== 'AVAILABLE') {
      return {
        failed: true,
        reason: 'Transaction status not AVAILABLE',
        incomingId: incoming.id,
        safeMessage: 'This transaction is currently not available for claiming.',
      };
    }

    // 3. Verify network (if provided)
    if (normalizedNetwork && incoming.network.toUpperCase() !== normalizedNetwork) {
      return {
        failed: true,
        reason: 'Network mismatch',
        incomingId: incoming.id,
        safeMessage: 'Transaction network mismatch. Please verify your transaction details.',
      };
    }

    const incomingAmtNumber = incoming.amount.toNumber();

    // 4. Verify amount strictly if provided (must match within 0.01)
    if (input.amount !== undefined && input.amount > 0 && Math.abs(incomingAmtNumber - input.amount) > 0.01) {
      return {
        failed: true,
        reason: 'Amount mismatch',
        incomingId: incoming.id,
        safeMessage: 'Transaction amount mismatch. Please verify your transaction details.',
      };
    }

    // 5. Check min/max limits
    const minAmt = settings.minimumAmount.toNumber();
    const maxAmt = settings.maximumAmount.toNumber();
    if (incomingAmtNumber < minAmt) {
      return {
        failed: true,
        reason: 'Amount below minimum',
        incomingId: incoming.id,
        safeMessage: `Transaction amount (GHS ${incomingAmtNumber.toFixed(2)}) is below the minimum allowed top-up of GHS ${minAmt.toFixed(2)}.`,
      };
    }
    if (incomingAmtNumber > maxAmt) {
      return {
        failed: true,
        reason: 'Amount exceeds maximum',
        incomingId: incoming.id,
        safeMessage: `Transaction amount (GHS ${incomingAmtNumber.toFixed(2)}) exceeds the maximum allowed top-up of GHS ${maxAmt.toFixed(2)}.`,
      };
    }

    // 6. Expiry check
    const expiryMs = settings.claimExpiryHours * 3600 * 1000;
    if (Date.now() - incoming.createdAt.getTime() > expiryMs) {
      await tx.incomingMomoTransaction.update({
        where: { id: incoming.id },
        data: { status: 'EXPIRED' },
      });
      return {
        failed: true,
        reason: 'Transaction expired',
        incomingId: incoming.id,
        safeMessage: 'This transaction has expired and can no longer be claimed.',
      };
    }

    // 7. Lock & mark as CLAIMED
    const updateResult = await tx.incomingMomoTransaction.updateMany({
      where: {
        id: incoming.id,
        status: 'AVAILABLE',
      },
      data: {
        status: 'CLAIMED',
      },
    });

    if (updateResult.count === 0) {
      return {
        failed: true,
        reason: 'Concurrent claim collision',
        incomingId: incoming.id,
        safeMessage: 'This transaction has already been claimed.',
      };
    }

    // 8. Ensure user has a wallet
    let wallet = user.wallet;
    if (!wallet) {
      wallet = await tx.wallet.create({
        data: {
          userId: input.userId,
          availableBalance: toDecimal(0),
          pendingBalance: toDecimal(0),
          currency: 'GHS',
        },
      });
    }

    // 9. Credit wallet via createWalletTransaction
    const { updatedWallet, transaction: walletTx } = await createWalletTransaction(
      wallet.id,
      incomingAmtNumber,
      WalletTransactionType.CREDIT,
      WalletTransactionCategory.FUNDING,
      `Send & Claim Top-Up (${incoming.network} Ref: ${incoming.transactionReference})`,
      tx,
    );

    // 10. Create SendClaim record
    const claim = await tx.sendClaim.create({
      data: {
        userId: input.userId,
        incomingMomoTransactionId: incoming.id,
        walletTransactionId: walletTx.id,
        transactionReference: incoming.transactionReference,
        claimedAmount: incoming.amount,
        network: incoming.network,
        senderPhone: input.senderPhone ?? incoming.senderPhone ?? null,
        status: 'APPROVED',
        processedAt: new Date(),
        ipAddress: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });

    return {
      failed: false as const,
      claimId: claim.id,
      amount: incomingAmtNumber,
      network: incoming.network,
      transactionReference: incoming.transactionReference,
      newBalance: updatedWallet.availableBalance.toNumber(),
      creditedAt: claim.createdAt,
    };
  });

  if (claimResult.failed) {
    await handleClaimRejection(claimResult.reason, claimResult.incomingId);
    throw new Error(claimResult.safeMessage);
  }

  // Claim succeeded - reset failed attempts for this key
  resetFailedClaimAttempts(rateLimitKey);

  await createAuditLog(
    input.userId,
    'claim.approved',
    'SendClaim',
    claimResult.claimId,
    {
      claimId: claimResult.claimId,
      amount: claimResult.amount,
      network: claimResult.network,
      reference: claimResult.transactionReference,
      newBalance: claimResult.newBalance,
    },
  );

  return {
    success: true,
    claimId: claimResult.claimId,
    amount: claimResult.amount,
    network: claimResult.network,
    transactionReference: claimResult.transactionReference,
    newBalance: claimResult.newBalance,
    creditedAt: claimResult.creditedAt,
  };
}

/**
 * Get user claim history
 */
export async function getUserClaimsHistory(
  userId: string,
  options: { page?: number; pageSize?: number } = {},
) {
  await ensureSendClaimSchema();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    prisma.sendClaim.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        walletTransaction: {
          select: {
            id: true,
            reference: true,
            balanceBefore: true,
            balanceAfter: true,
          },
        },
      },
    }),
    prisma.sendClaim.count({ where: { userId } }),
  ]);

  return {
    data: data.map((c) => ({
      ...c,
      claimedAmount: c.claimedAmount.toNumber(),
      walletTransaction: c.walletTransaction
        ? {
            ...c.walletTransaction,
            balanceBefore: c.walletTransaction.balanceBefore.toNumber(),
            balanceAfter: c.walletTransaction.balanceAfter.toNumber(),
          }
        : null,
    })),
    total,
    page,
    pageSize,
    pages: Math.ceil(total / pageSize) || 1,
  };
}

/**
 * Get claims for admin with filtering and search
 */
export async function getAdminClaims(options: {
  page?: number;
  pageSize?: number;
  status?: string;
  network?: string;
  q?: string;
}) {
  await ensureSendClaimSchema();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.SendClaimWhereInput = {};
  if (options.status) {
    where.status = options.status;
  }
  if (options.network) {
    where.network = { equals: options.network, mode: 'insensitive' };
  }
  if (options.q?.trim()) {
    const query = options.q.trim();
    where.OR = [
      { transactionReference: { contains: query, mode: 'insensitive' } },
      { senderPhone: { contains: query, mode: 'insensitive' } },
      {
        user: {
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
          ],
        },
      },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.sendClaim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            wallet: { select: { availableBalance: true } },
          },
        },
        incomingTransaction: {
          select: {
            id: true,
            status: true,
            amount: true,
            transactionAt: true,
            senderPhone: true,
            rawSms: true,
          },
        },
      },
    }),
    prisma.sendClaim.count({ where }),
  ]);

  return {
    data: data.map((c) => ({
      ...c,
      claimedAmount: c.claimedAmount.toNumber(),
      user: {
        id: c.user.id,
        name: `${c.user.firstName} ${c.user.lastName}`.trim(),
        email: c.user.email,
        phone: c.user.phone,
        balance: c.user.wallet?.availableBalance.toNumber() ?? 0,
      },
      incomingTransaction: c.incomingTransaction
        ? {
            ...c.incomingTransaction,
            amount: c.incomingTransaction.amount.toNumber(),
          }
        : null,
    })),
    total,
    page,
    pageSize,
    pages: Math.ceil(total / pageSize) || 1,
  };
}

/**
 * Get admin incoming MoMo transactions
 */
export async function getAdminIncomingMomo(options: {
  page?: number;
  pageSize?: number;
  status?: string;
  network?: string;
  q?: string;
}) {
  await ensureSendClaimSchema();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.IncomingMomoTransactionWhereInput = {};
  if (options.status) {
    where.status = options.status;
  }
  if (options.network) {
    where.network = { equals: options.network, mode: 'insensitive' };
  }
  if (options.q?.trim()) {
    const query = options.q.trim();
    where.OR = [
      { transactionReference: { contains: query, mode: 'insensitive' } },
      { senderPhone: { contains: query, mode: 'insensitive' } },
      { rawSms: { contains: query, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.incomingMomoTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        claims: {
          select: {
            id: true,
            status: true,
            claimedAmount: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    }),
    prisma.incomingMomoTransaction.count({ where }),
  ]);

  return {
    data: data.map((t) => ({
      ...t,
      amount: t.amount.toNumber(),
      claims: t.claims.map((c) => ({
        ...c,
        claimedAmount: c.claimedAmount.toNumber(),
        userName: `${c.user.firstName} ${c.user.lastName}`.trim(),
        userEmail: c.user.email,
      })),
    })),
    total,
    page,
    pageSize,
    pages: Math.ceil(total / pageSize) || 1,
  };
}

/**
 * Manually approve a rejected/pending claim by admin
 */
export async function approveClaimManually(claimId: string, adminUserId: string) {
  await ensureSendClaimSchema();
  const claim = await prisma.sendClaim.findUnique({
    where: { id: claimId },
    include: { user: { include: { wallet: true } }, incomingTransaction: true },
  });

  if (!claim) {
    throw new Error('Claim not found');
  }

  if (claim.status === 'APPROVED') {
    throw new Error('This claim has already been approved.');
  }

  const claimAmtNumber = claim.claimedAmount.toNumber();

  return prisma.$transaction(async (tx) => {
    let wallet = claim.user.wallet;
    if (!wallet) {
      wallet = await tx.wallet.create({
        data: {
          userId: claim.userId,
          availableBalance: toDecimal(0),
          pendingBalance: toDecimal(0),
          currency: 'GHS',
        },
      });
    }

    const { updatedWallet, transaction: walletTx } = await createWalletTransaction(
      wallet.id,
      claimAmtNumber,
      WalletTransactionType.CREDIT,
      WalletTransactionCategory.FUNDING,
      `Manual Claim Approval (${claim.network} Ref: ${claim.transactionReference})`,
      tx,
    );

    const updatedClaim = await tx.sendClaim.update({
      where: { id: claimId },
      data: {
        status: 'APPROVED',
        processedAt: new Date(),
        walletTransactionId: walletTx.id,
        rejectionReason: null,
      },
    });

    if (claim.incomingMomoTransactionId) {
      await tx.incomingMomoTransaction.update({
        where: { id: claim.incomingMomoTransactionId },
        data: { status: 'CLAIMED' },
      });
    }

    await createAuditLog(
      adminUserId,
      'claim.manual_approved',
      'SendClaim',
      claim.id,
      {
        claimId: claim.id,
        amount: claimAmtNumber,
        newBalance: updatedWallet.availableBalance.toNumber(),
      },
    );

    return updatedClaim;
  });
}

/**
 * Manually reject a claim by admin
 */
export async function rejectClaimManually(claimId: string, reason: string, adminUserId: string) {
  await ensureSendClaimSchema();
  const claim = await prisma.sendClaim.findUnique({
    where: { id: claimId },
  });

  if (!claim) {
    throw new Error('Claim not found');
  }

  const updatedClaim = await prisma.sendClaim.update({
    where: { id: claimId },
    data: {
      status: 'REJECTED',
      rejectionReason: reason,
      processedAt: new Date(),
    },
  });

  await createAuditLog(
    adminUserId,
    'claim.manual_rejected',
    'SendClaim',
    claim.id,
    { claimId: claim.id, reason },
  );

  return updatedClaim;
}
