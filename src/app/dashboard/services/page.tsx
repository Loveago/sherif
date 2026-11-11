import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OtherServicesView } from "@/components/dashboard/other-services-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Other Services | Software & App Development | CleanDataPacks",
  description:
    "Explore CleanDataPacks services including Software Development, Mobile App Development (iOS/Android), Graphic Designing, Web Development, and API Integrations.",
};

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?session_expired=1");

  return <OtherServicesView />;
}
