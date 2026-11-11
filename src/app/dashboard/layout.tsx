import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isOrderProcessingHalted } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { BundlePortalShell } from "@/components/bundle-portal-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?session_expired=1");
  const halted = await isOrderProcessingHalted();

  const [maintenanceModeSetting, siteAnnouncementSetting] = await Promise.all([
    prisma.systemSetting.findUnique({
      where: { key: "maintenance_mode_enabled" },
    }),
    prisma.systemSetting.findUnique({
      where: { key: "site_announcement" },
    }),
  ]);

  if (maintenanceModeSetting?.value === "true" && user.role !== "ADMIN") {
    redirect("/maintenance");
  }

  const announcement = siteAnnouncementSetting?.value?.trim() || null;

  return (
    <BundlePortalShell user={user} announcement={announcement}>
      {children}
    </BundlePortalShell>
  );
}
