import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { OperationsOverview } from "@/components/admin/OperationsOverview";
export const metadata = { title:"Overview | BOOM Admin" };
export default async function OverviewPage() {
  if (!await isAdminAuthenticated()) redirect("/admin/login");
  return <OperationsOverview />;
}
