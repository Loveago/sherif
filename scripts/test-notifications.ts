import { prisma } from "../src/lib/prisma";
import {
  createNotification,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../src/lib/notifications";
import { adminManualCreditWallet, adminManualDebitWallet } from "../src/lib/send-claim";

async function runNotificationTests() {
  console.log("=== STARTING NOTIFICATION SYSTEM INTEGRATION TESTS ===");

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const reseller = await prisma.user.findFirst({ where: { role: "RESELLER" } });

  if (!admin || !reseller) {
    throw new Error("Admin or Reseller user missing in database");
  }

  // 1. Clean existing test notifications
  await prisma.notification.deleteMany({
    where: {
      OR: [
        { userId: reseller.id },
        { title: { contains: "TEST" } },
      ],
    },
  });
  console.log("✓ Test notifications table cleaned");

  // 2. Test direct notification creation
  const directNotif = await createNotification({
    userId: reseller.id,
    type: "SUCCESS",
    title: "TEST: Wallet Credited",
    message: "Your wallet was credited with GHS 50.00",
    link: "/dashboard/billing",
  });
  console.log("✓ Direct notification created:", directNotif.id);

  // 3. Test broadcast notification creation
  const broadcastNotif = await createNotification({
    type: "WARNING",
    title: "TEST: Scheduled Maintenance",
    message: "The platform will undergo maintenance tonight at 11:00 PM GMT",
    link: "/dashboard",
  });
  console.log("✓ Broadcast notification created:", broadcastNotif.id);

  // 4. Test role-targeted notification (RESELLER only)
  const resellerNotif = await createNotification({
    targetRole: "RESELLER",
    type: "INFO",
    title: "TEST: Reseller Promo Rates",
    message: "Special MTN data rates available this weekend",
    link: "/dashboard/packages",
  });
  console.log("✓ Reseller-targeted notification created:", resellerNotif.id);

  // 5. Test fetching notifications for Reseller
  const resellerList = await getUserNotifications(reseller.id, reseller.role);
  const foundDirect = resellerList.find((n) => n.id === directNotif.id);
  const foundBroadcast = resellerList.find((n) => n.id === broadcastNotif.id);
  const foundRoleTarget = resellerList.find((n) => n.id === resellerNotif.id);

  if (!foundDirect || !foundBroadcast || !foundRoleTarget) {
    throw new Error("Failed: Reseller should receive direct, broadcast, and role-targeted notifications");
  }
  console.log(`✓ Reseller retrieved ${resellerList.length} notifications (Direct, Broadcast & Role-Targeted verified)`);

  // 6. Test unread count
  const unreadCount = await getUnreadNotificationCount(reseller.id, reseller.role);
  if (unreadCount < 3) {
    throw new Error(`Expected at least 3 unread notifications, got ${unreadCount}`);
  }
  console.log(`✓ Reseller unread count verified: ${unreadCount}`);

  // 7. Test marking single notification as read
  const marked = await markNotificationRead(directNotif.id, reseller.id);
  if (!marked?.read) {
    throw new Error("Failed to mark single notification as read");
  }
  console.log("✓ Single notification marked as read");

  // 8. Test marking all notifications as read
  await markAllNotificationsRead(reseller.id, reseller.role);
  const updatedUnread = await getUnreadNotificationCount(reseller.id, reseller.role);
  if (updatedUnread !== 0) {
    throw new Error(`Expected 0 unread notifications after markAllRead, got ${updatedUnread}`);
  }
  console.log("✓ All notifications marked as read (unread count: 0)");

  // 9. Test wallet credit automated notification trigger
  await adminManualCreditWallet({
    adminId: admin.id,
    adminEmail: admin.email,
    userId: reseller.id,
    amount: 15.0,
    reason: "TEST Automated Credit Notification Trigger",
  });
  const creditNotifs = await getUserNotifications(reseller.id, reseller.role, 5);
  const creditNotif = creditNotifs.find((n) => n.title.includes("Wallet Credited"));
  if (!creditNotif) {
    throw new Error("Failed: adminManualCreditWallet did not create a user notification");
  }
  console.log("✓ adminManualCreditWallet automatically generated user notification:", creditNotif.message);

  // 10. Test wallet debit automated notification trigger
  await adminManualDebitWallet({
    adminId: admin.id,
    adminEmail: admin.email,
    userId: reseller.id,
    amount: 5.0,
    reason: "TEST Automated Debit Notification Trigger",
  });
  const debitNotifs = await getUserNotifications(reseller.id, reseller.role, 5);
  const debitNotif = debitNotifs.find((n) => n.title.includes("Wallet Debited"));
  if (!debitNotif) {
    throw new Error("Failed: adminManualDebitWallet did not create a user notification");
  }
  console.log("✓ adminManualDebitWallet automatically generated user notification:", debitNotif.message);

  // 11. Test delete notification
  const deleted = await deleteNotification(directNotif.id, reseller.id);
  if (!deleted) {
    throw new Error("Failed to delete notification");
  }
  console.log("✓ Notification deleted successfully");

  console.log("\n=======================================================");
  console.log("🎉 ALL 11 NOTIFICATION SYSTEM TESTS PASSED SUCCESSFULLY!");
  console.log("=======================================================\n");
}

runNotificationTests()
  .catch((e) => {
    console.error("Test failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
