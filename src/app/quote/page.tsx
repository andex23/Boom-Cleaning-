import { QuoteFlow } from "@/components/public/QuoteFlow";
import { listBookableServices } from "@/features/services/public-catalog";

export const metadata = { title: "Get a quote | BOOM", description: "Tell BOOM about your space and get a cleaning estimate." };
export const dynamic = "force-dynamic";

export default async function QuotePage({ searchParams }: { searchParams: Promise<{ service?: string | string[] }> }) {
  const params = await searchParams;
  const service = typeof params.service === "string" ? params.service : undefined;
  const services = await listBookableServices();
  return <QuoteFlow services={services} initialService={service} />;
}
