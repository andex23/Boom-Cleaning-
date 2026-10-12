import { notFound,redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { adminAreaForPath } from "@/data/admin-navigation";
import { BookingBreakdowns } from "@/components/admin/BookingBreakdowns";
import { LeadsPanel } from "@/components/admin/LeadsPanel";
import { CustomersPanel } from "@/components/admin/CustomersPanel";
import { PaymentsPanel } from "@/components/admin/PaymentsPanel";
import { AnalyticsPanel } from "@/components/admin/AnalyticsPanel";
import { PricingAdmin } from "@/components/admin/PricingAdmin";
import { IntegrationsPanel } from "@/components/admin/IntegrationsPanel";
type Props = {params:Promise<{section:string}>;searchParams:Promise<{status?:string}>};
export async function generateMetadata({params}:Props) {
  const area = adminAreaForPath(`/admin/${(await params).section}`);
  return {title:`${area ?? "Page not found"} | BOOM Admin`};
}
export default async function SectionPage({params,searchParams}:Props) {
  if (!await isAdminAuthenticated()) redirect("/admin/login");
  const area = adminAreaForPath(`/admin/${(await params).section}`);
  switch(area) {
    case "Inbox": return <LeadsPanel />;
    case "Bookings": { const status=(await searchParams).status; return <BookingBreakdowns key={status ?? "All"} initialFilter={status} />; }
    case "Customers": return <CustomersPanel />;
    case "Payments": return <PaymentsPanel />;
    case "Analytics": return <AnalyticsPanel />;
    case "Services": return <PricingAdmin />;
    case "Integrations": return <IntegrationsPanel />;
    default: notFound();
  }
}
