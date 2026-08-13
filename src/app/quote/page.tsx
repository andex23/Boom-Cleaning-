import { QuoteFlow } from "@/components/public/QuoteFlow";

export const metadata = { title: "Get a quote | BOOM", description: "Tell BOOM about your space and get a cleaning estimate." };

export default async function QuotePage({ searchParams }: { searchParams: Promise<{ service?: string | string[] }> }) {
  const params = await searchParams;
  const service = typeof params.service === "string" ? params.service : undefined;
  return <QuoteFlow initialService={service} />;
}
