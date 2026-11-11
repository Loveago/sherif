import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@/lib/notifications";
import { handleRouteError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 30), 100);

    const [notifications, unreadCount, siteAnnouncementSetting] = await Promise.all([
      getUserNotifications(user.id, user.role, limit),
      getUnreadNotificationCount(user.id, user.role),
      import("@/lib/prisma").then(({ prisma }) =>
        prisma.systemSetting.findUnique({ where: { key: "site_announcement" } })
      ),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
      announcement: siteAnnouncementSetting?.value?.trim() || null,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, all } = body;

    if (all) {
      await markAllNotificationsRead(user.id, user.role);
      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    if (id && typeof id === "string") {
      const updated = await markNotificationRead(id, user.id);
      return NextResponse.json({ success: true, notification: updated });
    }

    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body?.id;
    }

    if (!id) {
      return NextResponse.json({ error: "Notification ID required" }, { status: 400 });
    }

    const deleted = await deleteNotification(id, user.id);
    return NextResponse.json({ success: deleted });
  } catch (err) {
    return handleRouteError(err);
  }
}
