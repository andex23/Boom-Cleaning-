import AdminConsole from "@/components/admin/AdminConsole";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getInstagramConnectionStatus } from "@/features/instagram/config";
import { resolveLogoSrc } from "@/components/brand/BrandLogo";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  return <AdminConsole instagramStatus={getInstagramConnectionStatus()} logoSrc={resolveLogoSrc("onDark")} logoLightSrc={resolveLogoSrc("onLight")} />;
}
