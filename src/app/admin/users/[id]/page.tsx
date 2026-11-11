import { redirect } from "next/navigation";

export default async function AdminUserRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/users?userId=${encodeURIComponent(id)}`);
}
