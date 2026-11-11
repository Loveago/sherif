import { redirect } from "next/navigation";

export default function OtherServicesRedirect() {
  redirect("/dashboard/services");
}
