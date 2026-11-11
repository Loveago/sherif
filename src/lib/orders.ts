import { prisma } from "./prisma";
import { syncCommissionForOrder } from "./storefront";
import { dispatchWebhookEvent } from "./webhooks";
import {
  canTransition,
  normalizeOrderStatus,
  type BatchStatus,
  type ExportBatchStatus,
  type OrderStatus,
} from "./types";

import { validateMtnOrderRecipient } from "./mtn-verification";

export async function getSetting(key: string, fallback = ""): Promise<string> {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key } });
    return row?.value ?? fallback;
  } catch {
    return fallback;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function isOrderProcessingHalted(): Promise<boolean> {
  return (await getSetting("order_processing_halted", "false")) === "true";
}

export async function getPricingForProfile(
  profileId: string | null,
  gbAmount: number,
  network?: string | null
): Promise<number | null> {
  if (!profileId) return null;

  if (network) {
    try {
      const netUpper = network.toUpperCase();
      const setting = await prisma.systemSetting.findUnique({
        where: { key: `pricing_profile_network_rates:${profileId}` },
      });
      if (setting?.value) {
        const netRates = JSON.parse(setting.value);
        if (Array.isArray(netRates[netUpper])) {
          const match = netRates[netUpper].find(
            (t: { gbAmount: number; priceGHS: number }) => t.gbAmount === gbAmount
          );
          if (match && typeof match.priceGHS === "number" && match.priceGHS > 0) {
            return match.priceGHS;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const tier = await prisma.priceTier.findUnique({
    where: { profileId_gbAmount: { profileId, gbAmount } },
  });
  return tier ? tier.priceGHS : null;
}

export async function getDefaultProfileId(): Promise<string | null> {
  const profile = await prisma.pricingProfile.findFirst({
    where: { isDefault: true },
    select: { id: true },
  });
  return profile?.id ?? null;
}

export async function getEffectivePricingProfileForUser(
  userIdOrUser: string | { id?: string; role?: string; pricingProfileId?: string | null }
) {
  let role: string | undefined;
  let profileId: string | null | undefined;

  if (typeof userIdOrUser === "string") {
    const user = await prisma.user.findUnique({
      where: { id: userIdOrUser },
      select: { role: true, pricingProfileId: true },
    });
    role = user?.role;
    profileId = user?.pricingProfileId;
  } else {
    role = userIdOrUser.role;
    profileId = userIdOrUser.pricingProfileId;
    if (role === undefined && userIdOrUser.id) {
      const user = await prisma.user.findUnique({
        where: { id: userIdOrUser.id },
        select: { role: true, pricingProfileId: true },
      });
      role = user?.role;
      if (profileId === undefined) profileId = user?.pricingProfileId;
    }
  }

  // 1. If user has an explicit pricingProfileId, look it up
  if (profileId) {
    const profile = await prisma.pricingProfile.findUnique({ where: { id: profileId } });
    if (profile && profile.active) return profile;
  }

  // 2. If user's role is RESELLER, inherit the active RESELLER pricing profile
  if (role === "RESELLER") {
    const resellerProfile = await prisma.pricingProfile.findFirst({
      where: { type: "RESELLER", active: true },
    });
    if (resellerProfile) return resellerProfile;
  }

  // 3. Fallback: Default profile
  const defaultProfile = await prisma.pricingProfile.findFirst({
    where: { isDefault: true, active: true },
  });
  if (defaultProfile) return defaultProfile;

  return prisma.pricingProfile.findFirst({
    where: { isDefault: true },
  });
}

export async function resolveUserWholesalePrice(
  userIdOrUser: string | { id?: string; role?: string; pricingProfileId?: string | null; referredById?: string | null },
  pkg: { id?: string; gbAmount: number; network: string; retailPriceGHS?: number | null },
  depth = 0,
  client: any = prisma
): Promise<number> {
  if (depth > 10) return pkg.retailPriceGHS ?? 0;

  const userId = typeof userIdOrUser === "string" ? userIdOrUser : userIdOrUser.id;
  let referredById = typeof userIdOrUser === "object" ? userIdOrUser.referredById : undefined;

  if (userId && referredById === undefined) {
    const u = await client.user.findUnique({
      where: { id: userId },
      select: { referredById: true },
    });
    referredById = u?.referredById ?? null;
  }

  // Ensure package network, gbAmount and retailPriceGHS are resolved
  let retailPriceGHS = pkg.retailPriceGHS;
  let packageNetwork = pkg.network ? pkg.network.toUpperCase() : undefined;
  let packageGb = pkg.gbAmount;

  if ((retailPriceGHS == null || !packageNetwork || !packageGb) && pkg.id) {
    const dbPkg = await client.dataPackage.findUnique({
      where: { id: pkg.id },
      select: { retailPriceGHS: true, network: true, gbAmount: true },
    });
    if (dbPkg) {
      if (retailPriceGHS == null) retailPriceGHS = dbPkg.retailPriceGHS;
      if (!packageNetwork) packageNetwork = dbPkg.network?.toUpperCase();
      if (!packageGb) packageGb = dbPkg.gbAmount;
    }
  } else if (retailPriceGHS == null && packageNetwork && packageGb) {
    const dbPkg = await client.dataPackage.findUnique({
      where: {
        network_gbAmount: {
          network: packageNetwork,
          gbAmount: packageGb,
        },
      },
      select: { retailPriceGHS: true },
    });
    if (dbPkg) {
      retailPriceGHS = dbPkg.retailPriceGHS;
    }
  }

  // If user is registered under an affiliate parent agent:
  if (referredById) {
    let packageId = pkg.id;
    if (!packageId && packageNetwork && packageGb) {
      const pRecord = await client.dataPackage.findUnique({
        where: {
          network_gbAmount: {
            network: packageNetwork,
            gbAmount: packageGb,
          },
        },
        select: { id: true },
      });
      packageId = pRecord?.id;
    }

    if (packageId) {
      const affPrice = await client.affiliatePackagePrice.findUnique({
        where: {
          agentId_packageId: {
            agentId: referredById,
            packageId,
          },
        },
      });
      if (affPrice && affPrice.priceGHS > 0) {
        return affPrice.priceGHS;
      }
    }

    // If parent agent hasn't set a custom wholesale price, fallback to what parent agent pays
    return resolveUserWholesalePrice(
      referredById,
      { ...pkg, id: packageId, retailPriceGHS, network: packageNetwork ?? pkg.network, gbAmount: packageGb },
      depth + 1,
      client
    );
  }

  // Direct / Root User: Standard pricing profile resolution
  const profile = await getEffectivePricingProfileForUser(userIdOrUser);
  const isCustomProfile = Boolean(profile && !profile.isDefault);

  // If the user is on a custom pricing profile (non-default):
  // Check custom per-network rates first, then custom price tiers.
  if (profile && isCustomProfile) {
    if (packageNetwork) {
      try {
        const setting = await client.systemSetting.findUnique({
          where: { key: `pricing_profile_network_rates:${profile.id}` },
        });
        if (setting?.value) {
          const netRates = JSON.parse(setting.value);
          if (Array.isArray(netRates[packageNetwork])) {
            const match = netRates[packageNetwork].find(
              (t: { gbAmount: number; priceGHS: number }) => t.gbAmount === packageGb
            );
            if (match && typeof match.priceGHS === "number" && match.priceGHS > 0) {
              return match.priceGHS;
            }
          }
        }
      } catch {}
    }

    const tier = await client.priceTier.findUnique({
      where: { profileId_gbAmount: { profileId: profile.id, gbAmount: packageGb } },
    });
    if (tier && typeof tier.priceGHS === "number" && tier.priceGHS > 0) {
      return tier.priceGHS;
    }
  }

  // Primary base catalog price: the data package's own configured retailPriceGHS
  // (matches what is shown on /dashboard/packages and /api/packages)
  if (retailPriceGHS != null && retailPriceGHS > 0) {
    return retailPriceGHS;
  }

  // Fallback to profile tiers if package retailPriceGHS was not set
  if (profile) {
    const tier = await client.priceTier.findUnique({
      where: { profileId_gbAmount: { profileId: profile.id, gbAmount: packageGb } },
    });
    if (tier && typeof tier.priceGHS === "number" && tier.priceGHS > 0) {
      return tier.priceGHS;
    }
  }

  // Fallback to default profile tiers
  const defaultProfileId = await getDefaultProfileId();
  if (defaultProfileId && profile?.id !== defaultProfileId) {
    const defTier = await client.priceTier.findUnique({
      where: { profileId_gbAmount: { profileId: defaultProfileId, gbAmount: packageGb } },
    });
    if (defTier && typeof defTier.priceGHS === "number" && defTier.priceGHS > 0) {
      return defTier.priceGHS;
    }
  }

  return retailPriceGHS ?? 0;
}

export interface CreateOrderInput {
  userId: string;
  phoneNumber: string;
  network: string;
  gbAmount: number;
  packageId?: string | null;
  amount?: number;
  source?: "WEB" | "API" | "STOREFRONT";
  batchId?: string | null;
  externalReference?: string | null;
  apiCredentialId?: string | null;
  isSandbox?: boolean;
  createdAt?: Date;
  status?: OrderStatus;
  historyNote?: string;
  historyBy?: string;
  skipMtnValidation?: boolean;
  skipAutoDispatch?: boolean;
}

/**
 * Creates a single recipient order. Orders start as PENDING and are submitted
 * to the provider by the admin export workflow (PENDING -> PROCESSING), so the
 * pending queue is meaningful and networks are never mixed inside an export.
 */
export async function createOrder(input: CreateOrderInput) {
  const userRecord = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, role: true, pricingProfileId: true },
  });
  const profile = userRecord ? await getEffectivePricingProfileForUser(userRecord) : null;
  const profileId = profile?.id ?? null;

  let price: number | null | undefined = input.amount;
  if (price == null) {
    price = await resolveUserWholesalePrice(userRecord ?? input.userId, {
      id: input.packageId ?? undefined,
      network: input.network,
      gbAmount: input.gbAmount,
    });
  }

  if (price == null || price <= 0) {
    throw new Error("No price configured or invalid price for this package. Orders cannot have a zero or negative price.");
  }

  // Central MTN Number Verification Check (§16, §17)
  if (!input.skipMtnValidation) {
    await validateMtnOrderRecipient(input.phoneNumber, input.network, input.userId, {
      throwOnFailure: true,
    });
  }

  const status = input.status ?? "PENDING";
  const createdAt = input.createdAt ?? new Date();

  const order = await prisma.order.create({
    data: {
      userId: input.userId,
      phoneNumber: input.phoneNumber,
      network: input.network,
      gbAmount: input.gbAmount,
      packageId: input.packageId ?? null,
      amount: price,
      status,
      source: input.source ?? "WEB",
      batchId: input.batchId ?? null,
      externalReference: input.externalReference ?? null,
      apiCredentialId: input.apiCredentialId ?? null,
      isSandbox: input.isSandbox ?? false,
      createdAt,
      updatedAt: createdAt,
      history: {
        create: {
          status,
          previousStatus: null,
          note: input.historyNote ?? "Order created",
          changedBy: input.historyBy ?? "system",
          createdAt,
        },
      },
    },
  });

  // If provider API routing is enabled (or Clickify sandbox is active), auto-dispatch the new order
  if (!input.skipAutoDispatch) {
    try {
      const { getProviderRoutingConfig, dispatchOrder, shouldAutoDispatch } = await import("./provider-apis/router");
      const config = await getProviderRoutingConfig();
      if (shouldAutoDispatch(config)) {
        dispatchOrder(order.id).catch((err) => {
          console.error(`Auto-dispatch failed for order #${order.id}:`, err);
        });
      }
    } catch (err) {
      console.error(`Provider routing check failed for order #${order.id}:`, err);
    }
  }

  return order;
}

/**
 * Recomputes an OrderBatch status from the individual order statuses (§24).
 */
export async function recomputeBatchStatus(
  batchId: string | null | undefined,
  client: Pick<typeof prisma, "order" | "orderBatch"> = prisma
): Promise<BatchStatus | null> {
  if (!batchId) return null;
  const grouped = await client.order.groupBy({
    by: ["status"],
    where: { batchId },
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  let total = 0;
  for (const row of grouped) {
    counts[row.status] = row._count._all;
    total += row._count._all;
  }
  const pending = counts["PENDING"] ?? 0;
  const completed = counts["SUCCESS"] ?? 0;
  const failed = counts["FAILED"] ?? 0;
  const cancelled = counts["CANCELLED"] ?? 0;
  const refunded = counts["REFUNDED"] ?? 0;
  const processing = counts["PROCESSING"] ?? 0;

  const next = computeBatchStatusFromCounts(counts);

  const batch = await client.orderBatch.findUnique({
    where: { id: batchId },
    select: { status: true },
  });
  if (!batch || batch.status === next) return next;
  await client.orderBatch.update({ where: { id: batchId }, data: { status: next } });
  return next;
}

/**
 * Computes OrderBatch status from per-status counts (§24).
 */
export function computeBatchStatusFromCounts(
  counts: Record<string, number>
): BatchStatus {
  let total = 0;
  for (const value of Object.values(counts)) total += value;

  const pending = counts["PENDING"] ?? 0;
  const completed = counts["SUCCESS"] ?? 0;
  const failed = counts["FAILED"] ?? 0;
  const cancelled = counts["CANCELLED"] ?? 0;
  const refunded = counts["REFUNDED"] ?? 0;
  const processing = counts["PROCESSING"] ?? 0;

  if (total === 0) return "PENDING";
  if (completed === total) return "COMPLETED";
  if (cancelled === total) return "CANCELLED";
  if (failed + refunded === total) return "FAILED";
  if (processing > 0 || (pending > 0 && completed + failed + refunded + cancelled > 0)) {
    return "PROCESSING";
  }
  if (completed > 0) return "COMPLETED";
  return "PENDING";
}

/**
 * Derives an ExportBatch status from the per-status counts of its orders.
 * Mirrors the OrderBatch rules (§24): in-flight work always wins.
 */
export function computeExportStatusFromCounts(
  counts: Record<string, number>
): ExportBatchStatus | null {
  let total = 0;
  for (const value of Object.values(counts)) total += value;
  if (total === 0) return null; // nothing linked yet — keep current status

  const completed = counts["SUCCESS"] ?? 0;
  const failed = counts["FAILED"] ?? 0;
  const cancelled = counts["CANCELLED"] ?? 0;
  const refunded = counts["REFUNDED"] ?? 0;
  const inFlight = (counts["PROCESSING"] ?? 0) + (counts["PENDING"] ?? 0);

  if (completed === total) return "COMPLETED";
  if (cancelled === total) return "CANCELLED";
  if (failed + refunded === total) return "FAILED";
  if (inFlight > 0) return "PROCESSING";
  if (completed > 0) return "COMPLETED";
  return "FAILED";
}

/**
 * Recomputes an ExportBatch status from the individual order statuses linked
 * via `exportBatchId`. Keeps the Export Center in sync when orders are
 * completed/failed/cancelled from anywhere in the admin panel.
 */
export async function recomputeExportBatchStatus(
  exportBatchId: string | null | undefined,
  client: Pick<typeof prisma, "order" | "exportBatch"> = prisma
): Promise<ExportBatchStatus | null> {
  if (!exportBatchId) return null;
  const grouped = await client.order.groupBy({
    by: ["status"],
    where: { exportBatchId },
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  for (const row of grouped) counts[row.status] = row._count._all;

  const next = computeExportStatusFromCounts(counts);
  if (!next) return null;

  const exportBatch = await client.exportBatch.findUnique({
    where: { id: exportBatchId },
    select: { status: true },
  });
  if (!exportBatch || exportBatch.status === next) return next;
  await client.exportBatch.update({
    where: { id: exportBatchId },
    data: { status: next },
  });
  return next;
}

export interface Actor {
  id: string;
  label: string;
}

export async function changeOrderStatus(
  orderId: number,
  next: string,
  reason: string | null,
  actor: Actor,
  opts: { force?: boolean; skipBatchRecompute?: boolean } = {}
): Promise<{ changed: boolean; override?: boolean }> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");

  const target = normalizeOrderStatus(next);
  if (order.status === target) return { changed: false };

  const { allowed, override } = canTransition(order.status, target);
  if (!allowed && !opts.force) {
    throw new Error(
      `Illegal status transition ${order.status} → ${target}. Use the override option to force it.`
    );
  }
  if (override && !opts.force) {
    return { changed: false, override: true };
  }

  const note =
    target === "FAILED" && reason ? reason : reason ?? (override ? "Admin override" : undefined);

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: {
        status: target,
        // The 24h "Not Received" reporting window starts at completion (§3)
        ...(target === "SUCCESS" ? { completedAt: new Date() } : {}),
        ...(target === "PENDING" ? { exportBatchId: null, providerReference: null } : {}),
        failureReason: target === "FAILED" ? reason || order.failureReason : null,
      },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: target,
        previousStatus: order.status,
        note: note ?? undefined,
        changedBy: actor.label,
      },
    }),
  ]);

  if (!opts.skipBatchRecompute) {
    await recomputeBatchStatus(order.batchId);
    await recomputeExportBatchStatus(order.exportBatchId);
  }

  // Storefront commission lifecycle (§25/§38): release on SUCCESS, reverse on
  // refund/failure. No-op for ordinary orders.
  await syncCommissionForOrder(orderId, target);

  // If order is REFUNDED, FAILED, or CANCELLED:
  // Ordinary orders (WEB / API): refund to user's wallet balance if not already refunded.
  // Storefront orders: DO NOT credit the agent's wallet — customer is refunded via Paystack/manual.
  if (target === "REFUNDED" || target === "FAILED" || target === "CANCELLED") {
    if (order.source !== "STOREFRONT" && order.userId) {
      const existingRefund = await prisma.walletTransaction.findFirst({
        where: {
          userId: order.userId,
          reference: `REF-ORDER-${order.id}`,
        },
      });

      if (!existingRefund) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: order.userId },
            data: { balance: { increment: order.amount } },
          }),
          prisma.walletTransaction.create({
            data: {
              userId: order.userId,
              type: "REFUND",
              amount: order.amount,
              status: "APPROVED",
              reference: `REF-ORDER-${order.id}`,
              note: `Refund for ${target === "FAILED" ? "Failed" : target === "CANCELLED" ? "Cancelled" : "Refunded"} Order #${order.id} (${order.phoneNumber})`,
            },
          }),
        ]);
      }
    } else if (order.source === "STOREFRONT") {
      const curReason = order.failureReason || reason || "";
      if (!curReason.toLowerCase().includes("refund")) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            failureReason: curReason
              ? `${curReason} [Refund required: Storefront customer order]`
              : "Refund required: Storefront customer order",
          },
        });
      }
    }

    // Automatically resolve any open delivery reports for this order
    const activeReports = await prisma.deliveryReport.findMany({
      where: {
        orderId,
        status: { in: ["OPEN", "UNDER_REVIEW", "INVESTIGATING"] },
      },
    });
    for (const rep of activeReports) {
      const reportMsg =
        order.source === "STOREFRONT"
          ? `Order marked as ${target}. Storefront order flagged for manual refund.`
          : `Order marked as ${target}. Refund credited to user wallet.`;

      await prisma.deliveryReport.update({
        where: { id: rep.id },
        data: {
          status: "REFUNDED",
          resolvedAt: new Date(),
          resolvedBy: actor.label,
          adminResponse:
            rep.adminResponse ||
            (order.source === "STOREFRONT"
              ? "Order failed on provider. Storefront customer manual refund required."
              : "Order failed on provider. Amount refunded to user wallet."),
        },
      });
      await prisma.deliveryReportEvent.create({
        data: {
          reportId: rep.id,
          type: "REFUND",
          message: reportMsg,
          actorLabel: actor.label,
        },
      });
    }

    // Reverse any affiliate commissions credited for this order
    try {
      const { reverseAffiliateCommissions } = await import("./affiliate");
      await reverseAffiliateCommissions(prisma, orderId);
    } catch (affErr) {
      console.error(`Failed to reverse affiliate commissions for order #${orderId}:`, affErr);
    }
  }

  // Webhook notification for API and order status updates
  const eventMap: Record<string, "order.created" | "order.processing" | "order.completed" | "order.failed" | "order.cancelled"> = {
    PENDING: "order.created",
    PROCESSING: "order.processing",
    SUCCESS: "order.completed",
    FAILED: "order.failed",
    CANCELLED: "order.cancelled",
  };
  const webhookEvent = eventMap[target];
  if (webhookEvent && order.userId) {
    dispatchWebhookEvent(
      order.userId,
      webhookEvent,
      {
        orderId: `API-${order.id}`,
        reference: order.externalReference || null,
        network: order.network,
        gbAmount: order.gbAmount,
        amount: order.amount,
        phoneNumber: order.phoneNumber,
        status: target === "SUCCESS" ? "COMPLETED" : target,
        failureReason: target === "FAILED" ? (reason || order.failureReason) : null,
        createdAt: order.createdAt,
        completedAt: target === "SUCCESS" ? new Date() : order.completedAt,
      },
      order.id
    ).catch(() => undefined);
  }

  return { changed: true, override };
}

/** Bulk status change. Returns applied + skipped counts and whether an override was required. */
export async function bulkChangeOrderStatus(
  orderIds: number[],
  next: string,
  reason: string | null,
  actor: Actor,
  opts: { force?: boolean } = {}
): Promise<{ applied: number; skipped: number; overrideRequired: boolean }> {
  let applied = 0;
  let skipped = 0;
  let overrideRequired = false;
  for (const id of orderIds) {
    try {
      const result = await changeOrderStatus(id, next, reason, actor, {
        ...opts,
        skipBatchRecompute: true,
      });
      if (result.changed) applied += 1;
      else skipped += 1;
      if (result.override) overrideRequired = true;
    } catch {
      skipped += 1;
    }
  }
  const batchRows = await prisma.order.findMany({
    where: { id: { in: orderIds }, batchId: { not: null } },
    select: { batchId: true },
    distinct: ["batchId"],
  });
  for (const row of batchRows) {
    await recomputeBatchStatus(row.batchId);
  }
  const exportBatchRows = await prisma.order.findMany({
    where: { id: { in: orderIds }, exportBatchId: { not: null } },
    select: { exportBatchId: true },
    distinct: ["exportBatchId"],
  });
  for (const row of exportBatchRows) {
    await recomputeExportBatchStatus(row.exportBatchId);
  }
  return { applied, skipped, overrideRequired };
}

/**
 * Resolves when an order was completed (§3): uses the stored completedAt when
 * present, otherwise derives it from the most recent SUCCESS history entry so
 * legacy orders created before the field existed still get a reporting window.
 */
export function deriveCompletedAt(order: {
  status: string;
  completedAt?: Date | null;
  history?: { status: string; createdAt: Date }[];
  updatedAt?: Date;
}): Date | null {
  if (order.status !== "SUCCESS") return null;
  if (order.completedAt) return order.completedAt;
  const successEntry = [...(order.history ?? [])]
    .reverse()
    .find((h) => h.status === "SUCCESS");
  return successEntry?.createdAt ?? order.updatedAt ?? null;
}

export async function getOrderStats(where: Record<string, unknown>) {
  const [total, byStatus, revenue] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: { ...(where as any), status: "SUCCESS" },
      _sum: { amount: true },
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const row of byStatus) statusCounts[row.status] = row._count._all;

  return {
    total,
    success: statusCounts["SUCCESS"] ?? 0,
    pending: statusCounts["PENDING"] ?? 0,
    processing: statusCounts["PROCESSING"] ?? 0,
    failed: statusCounts["FAILED"] ?? 0,
    cancelled: statusCounts["CANCELLED"] ?? 0,
    refunded: statusCounts["REFUNDED"] ?? 0,
    revenue: revenue._sum.amount ?? 0,
  };
}

/**
 * Automatically reconcile user wallet ledger records.
 * Ensures any order placed by the user (non-storefront) has a corresponding DEBIT ledger entry,
 * and any FAILED, CANCELLED, or REFUNDED order has a corresponding REFUND ledger entry.
 */
export async function reconcileUserWalletLedger(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, balance: true, createdAt: true },
    });
    if (!user) return;

    // 1. Reconcile non-storefront, non-sandbox orders
    const orders = await prisma.order.findMany({
      where: {
        userId,
        source: { not: "STOREFRONT" },
        isSandbox: false,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        amount: true,
        status: true,
        network: true,
        gbAmount: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
        batch: { select: { batchCode: true } },
      },
    });

    const existingTxs = await prisma.walletTransaction.findMany({
      where: { userId },
      select: { id: true, reference: true, type: true, amount: true, status: true },
    });
    const existingRefs = new Set(existingTxs.map((t) => t.reference).filter(Boolean));

    const toCreate: Array<{
      userId: string;
      type: string;
      amount: number;
      status: string;
      reference: string;
      note: string;
      createdAt: Date;
    }> = [];

    for (const o of orders) {
      const orderRef = `order:${o.id}`;
      const apiOrderRef = `api_order:${o.id}`;
      const apiBatchRef = o.batch?.batchCode ? `api_batch:${o.batch.batchCode}` : null;

      const isAlreadyDebited =
        existingRefs.has(orderRef) ||
        existingRefs.has(apiOrderRef) ||
        Boolean(apiBatchRef && existingRefs.has(apiBatchRef));

      if (!isAlreadyDebited) {
        toCreate.push({
          userId,
          type: "DEBIT",
          amount: o.amount,
          status: "APPROVED",
          reference: orderRef,
          note: `Data: ${o.network} ${o.gbAmount}GB to ${o.phoneNumber} (Order #${o.id})`,
          createdAt: o.createdAt,
        });
        existingRefs.add(orderRef);
      }

      if (["FAILED", "CANCELLED", "REFUNDED"].includes(o.status)) {
        const refundRef = `REF-ORDER-${o.id}`;
        if (!existingRefs.has(refundRef)) {
          toCreate.push({
            userId,
            type: "REFUND",
            amount: o.amount,
            status: "APPROVED",
            reference: refundRef,
            note: `Refund for ${o.status === "FAILED" ? "Failed" : o.status === "CANCELLED" ? "Cancelled" : "Refunded"} Order #${o.id} (${o.phoneNumber})`,
            createdAt: o.updatedAt || o.createdAt,
          });
          existingRefs.add(refundRef);
        }
      }
    }

    if (toCreate.length > 0) {
      await prisma.walletTransaction.createMany({
        data: toCreate,
      });
    }

    // 2. Self-heal balance discrepancy (e.g. unrecorded opening balance or manual balance shift)
    const freshUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true, createdAt: true },
    });
    if (!freshUser) return;

    const allApprovedTxs = await prisma.walletTransaction.findMany({
      where: { userId, status: "APPROVED" },
      select: { id: true, type: true, amount: true, reference: true },
    });

    let totalDeltas = 0;
    for (const tx of allApprovedTxs) {
      if (tx.type === "TOPUP" || tx.type === "REFUND") {
        totalDeltas += Math.abs(tx.amount);
      } else if (tx.type === "DEBIT") {
        totalDeltas -= Math.abs(tx.amount);
      } else if (tx.type === "ADJUSTMENT") {
        totalDeltas += tx.amount;
      }
      // Note: SIGNUP_FEE is neutral and does not affect prepaid wallet balance
    }

    const discrepancy = Number((freshUser.balance - totalDeltas).toFixed(2));
    if (Math.abs(discrepancy) >= 0.01) {
      const existingAdj = allApprovedTxs.find(
        (t) =>
          t.type === "ADJUSTMENT" &&
          (t.reference === "INITIAL-BALANCE" ||
            t.reference?.startsWith("OPENING-BAL-") ||
            t.reference?.startsWith("BALANCE-ADJ-"))
      );

      if (existingAdj) {
        await prisma.walletTransaction.update({
          where: { id: existingAdj.id },
          data: {
            amount: Number((existingAdj.amount + discrepancy).toFixed(2)),
          },
        });
      } else {
        await prisma.walletTransaction.create({
          data: {
            userId,
            type: "ADJUSTMENT",
            amount: discrepancy,
            status: "APPROVED",
            reference: discrepancy > 0 ? "INITIAL-BALANCE" : `BALANCE-ADJ-${Date.now()}`,
            note:
              discrepancy > 0
                ? "Opening / Initial Wallet Balance"
                : "System Ledger Balance Reconciliation Adjustment",
            createdAt: new Date(new Date(freshUser.createdAt).getTime() - 1000),
          },
        });
      }
    }
  } catch (err) {
    console.error("Wallet ledger reconciliation error:", err);
  }
}

