import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?session_expired=1");
  if (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "SECRETARY") {
    redirect("/dashboard");
  }

  const [supportWhatsappSetting, secretaryPagesSetting, siteAnnouncementSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "support_whatsapp" } }),
    prisma.systemSetting.findUnique({ where: { key: "secretary_allowed_pages" } }),
    prisma.systemSetting.findUnique({ where: { key: "site_announcement" } }),
  ]);

  let allowedNavHrefs: string[] | undefined;
  if (user.role === "SECRETARY") {
    try {
      allowedNavHrefs = secretaryPagesSetting?.value
        ? JSON.parse(secretaryPagesSetting.value)
        : ["/admin", "/admin/orders", "/admin/exports", "/admin/delivery-reports"];
    } catch {
      allowedNavHrefs = ["/admin", "/admin/orders", "/admin/exports", "/admin/delivery-reports"];
    }
  }

  const announcement = siteAnnouncementSetting?.value?.trim() || undefined;

  return (
    <AdminShell
      user={user}
      supportWhatsapp={supportWhatsappSetting?.value || undefined}
      allowedNavHrefs={allowedNavHrefs}
      announcement={announcement}
    >
      {children}
    </AdminShell>
  );
}
