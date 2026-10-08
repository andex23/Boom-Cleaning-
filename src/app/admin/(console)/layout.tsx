import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { resolveLogoSrc } from "@/components/brand/BrandLogo";
import AdminConsole from "@/components/admin/AdminConsole";
export const metadata = { robots:{ index:false,follow:false } };
export default async function ConsoleLayout({children}:{children:React.ReactNode}) {
  if (!await isAdminAuthenticated()) redirect("/admin/login");
  return <AdminConsole logoSrc={resolveLogoSrc("onDark")} logoLightSrc={resolveLogoSrc("onLight")}>{children}</AdminConsole>;
}
