import { QuoteFlow } from "@/components/public/QuoteFlow";
import { listBookableServices } from "@/features/services/public-catalog";
import { resolveLogoSrc } from "@/components/brand/BrandLogo";

export const metadata = { title: "Get a quote | BOOM", description: "Tell BOOM about your space and get a cleaning estimate." };
export const dynamic = "force-dynamic";

export default async function QuotePage({ searchParams }: { searchParams: Promise<{ service?: string | string[] }> }) {
  const params = await searchParams;
  const service = typeof params.service === "string" ? params.service : undefined;
  const services = await listBookableServices();
  // Two grounds: the navy aside during the flow, the light page on confirmation.
  return <QuoteFlow
    services={services}
    initialService={service}
    logoSrc={resolveLogoSrc("onDark")}
    logoSrcOnLight={resolveLogoSrc("onLight")}
  />;
}
