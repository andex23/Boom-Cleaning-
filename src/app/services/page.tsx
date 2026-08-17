import Link from "next/link";
import { ServiceCatalog } from "@/components/public/ServiceCatalog";
import { listBookableServices } from "@/features/services/public-catalog";

export const metadata = { title: "Cleaning services | BOOM", description: "Find the right BOOM cleaning service for your home or business in Abuja." };
export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const services = await listBookableServices();
  return <main><nav style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 32px", display: "flex", justifyContent: "space-between" }}><Link href="/" style={{ color: "#08255f", fontWeight: 900, letterSpacing: "-0.08em", textDecoration: "none", fontSize: 22 }}>BOOM<span style={{ color: "#39bfe7" }}>°</span></Link><Link href="/quote" style={{ background: "#55d5f3", color: "#061d55", fontWeight: 800, fontSize: 13, padding: "12px 16px", textDecoration: "none" }}>Book a service</Link></nav><ServiceCatalog services={services} /></main>;
}
