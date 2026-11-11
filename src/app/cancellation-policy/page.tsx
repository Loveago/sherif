import { redirect } from "next/navigation";

export default function CancellationPolicyRedirect() {
  redirect("/refund-policy");
}
