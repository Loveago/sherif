import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { handleRouteError } from "@/lib/api-helpers";
import { recordAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

    const [items, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.notification.count(),
      prisma.notification.count({ where: { read: false } }),
    ]);

    return NextResponse.json({
      notifications: items,
      totalCount,
      unreadCount,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { title, message, type, targetRole, userId, link } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
    }

    const notif = await createNotification({
      title: title.trim(),
      message: message.trim(),
      type: type || "INFO",
      targetRole: targetRole || null,
      userId: userId || null,
      link: link ? link.trim() : null,
    });

    await recordAudit({
      userId: admin.id,
      actorLabel: admin.email,
      action: "notification.broadcast",
      target: notif.id,
      newValue: JSON.stringify({ title, type, targetRole, userId }),
    });

    return NextResponse.json({
      success: true,
      notification: notif,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
