import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { updateUserSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, apiError } from "@/lib/api-helpers";
import { syncStorefrontWithPricingProfile } from "@/lib/storefront";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff();
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        balance: true,
        pricingProfileId: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { orders: true } },
      },
    });
    if (!user) return apiError(404, "User not found");
    return NextResponse.json({ user });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAdmin();
    const { id } = await params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return apiError(404, "User not found");

    const body = await request.json();
    const input = updateUserSchema.parse(body);

    const email = input.email.toLowerCase();
    if (email !== existing.email) {
      const dup = await prisma.user.findUnique({ where: { email } });
      if (dup) return apiError(409, "A user with this email already exists");
    }

    const data: Record<string, unknown> = {
      name: input.name,
      email,
      role: input.role,
      status: input.status,
      balance: input.balance,
      pricingProfileId: input.pricingProfileId || null,
    };
    if (input.password && input.password.trim().length >= 8) {
      data.passwordHash = await bcrypt.hash(input.password.trim(), 10);
      data.tokenVersion = { increment: 1 }; // force re-login everywhere
    }

    const updated = await prisma.user.update({ where: { id }, data });

    // Sync storefront products if user's pricing profile or role was modified
    if (input.pricingProfileId !== undefined || input.role !== undefined) {
      const sf = await prisma.storefront.findUnique({ where: { userId: id } });
      if (sf) {
        await syncStorefrontWithPricingProfile(sf.id, id, { force: true });
      }
    }

    await recordAudit({
      userId: actor.id,
      actorLabel: actor.email,
      action: "user.update",
      target: `user:${id}`,
      previousValue: JSON.stringify({
        role: existing.role,
        status: existing.status,
        balance: existing.balance,
      }),
      newValue: JSON.stringify({ role: input.role, status: input.status, balance: input.balance }),
    });

    return NextResponse.json({
      user: { id: updated.id, email: updated.email, role: updated.role, status: updated.status },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAdmin();
    const { id } = await params;

    if (id === actor.id) {
      return apiError(400, "You cannot delete your own administrator account.");
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return apiError(404, "User not found");

    if (user.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return apiError(400, "Cannot delete the only remaining administrator account.");
      }
    }

    // Clean up raw chat table BEFORE the transaction — a raw SQL failure inside
    // a Prisma transaction puts Postgres into an aborted state (code 25P02) that
    // kills every subsequent query in that transaction, even after try/catch.
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM support_chat_messages WHERE user_id = $1`, id);
    } catch {
      // Table may not exist — safe to ignore
    }

    await prisma.$transaction(async (tx) => {
      // 1. API keys → request logs
      const userKeys = await tx.apiKey.findMany({ where: { userId: id }, select: { id: true } });
      if (userKeys.length > 0) {
        await tx.apiRequestLog.deleteMany({ where: { apiKeyId: { in: userKeys.map((k) => k.id) } } });
        await tx.apiKey.deleteMany({ where: { userId: id } });
      }

      // 2. API applications & credentials & webhooks
      await tx.apiWebhook.deleteMany({ where: { userId: id } });
      await tx.apiCredential.deleteMany({ where: { userId: id } });
      await tx.apiApplication.deleteMany({ where: { userId: id } });

      // 3. Delivery reports and events
      const reports = await tx.deliveryReport.findMany({ where: { userId: id }, select: { id: true } });
      if (reports.length > 0) {
        await tx.deliveryReportEvent.deleteMany({ where: { reportId: { in: reports.map((r) => r.id) } } });
        await tx.deliveryReport.deleteMany({ where: { userId: id } });
      }

      // 4. Orders → status history → batch
      const orders = await tx.order.findMany({ where: { userId: id }, select: { id: true } });
      if (orders.length > 0) {
        await tx.orderStatusHistory.deleteMany({ where: { orderId: { in: orders.map((o) => o.id) } } });
        await tx.order.deleteMany({ where: { userId: id } });
      }
      await tx.orderBatch.deleteMany({ where: { userId: id } });

      // 5. Storefront ecosystem
      const storefront = await tx.storefront.findUnique({ where: { userId: id }, select: { id: true } });
      if (storefront) {
        await tx.storefrontProduct.deleteMany({ where: { storefrontId: storefront.id } });
        await tx.storefrontOrder.deleteMany({ where: { storefrontId: storefront.id } });
        await tx.storefront.delete({ where: { id: storefront.id } });
      }
      await tx.storefrontWallet.deleteMany({ where: { userId: id } });
      await tx.storefrontWithdrawal.deleteMany({ where: { userId: id } });

      // 6. Wallet transactions, send claims, notifications, misc
      await tx.walletTransaction.deleteMany({ where: { userId: id } });
      await tx.sendClaim.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.mtnVerificationRequest.deleteMany({ where: { userId: id } });
      await tx.signupCodeUsage.deleteMany({ where: { userId: id } });
      await tx.passwordResetToken.deleteMany({ where: { userId: id } });
      await tx.idempotencyKey.deleteMany({ where: { userId: id } });
      await tx.auditLog.deleteMany({ where: { userId: id } });

      // 7. Finally delete the user
      await tx.user.delete({ where: { id } });
    });

    await recordAudit({
      userId: actor.id,
      actorLabel: actor.email,
      action: "user.delete",
      target: `user:${id}`,
      previousValue: JSON.stringify({ email: user.email, name: user.name, role: user.role }),
    });

    return NextResponse.json({
      ok: true,
      message: `User ${user.name} (${user.email}) deleted successfully`,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
