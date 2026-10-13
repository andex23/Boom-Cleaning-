import { StructuredData } from "@/components/seo/StructuredData";
import { BUSINESS_ID, SITE_URL } from "@/lib/seo";
import { pageMetadata } from "@/lib/seo";
import { ServiceCatalog } from "@/components/public/ServiceCatalog";
import { listBookableServices } from "@/features/services/public-catalog";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import styles from "../home.module.css";

export const metadata = pageMetadata("/services");
export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const services = await listBookableServices();
  return <main className={styles.page}>
    <SiteHeader priority />
    <StructuredData data={{ "@context": "https://schema.org", "@type": "ItemList", name: "Cleaning services in Abuja", itemListElement: services.map((service, index) => ({ "@type": "ListItem", position: index + 1, item: { "@type": "Service", name: service.name, description: service.summary, url: `${SITE_URL}/services#${service.slug}`, image: `${SITE_URL}${service.image}`, provider: { "@id": BUSINESS_ID }, areaServed: { "@type": "City", name: "Abuja" } } })) }} />
    <ServiceCatalog services={services} />
    <SiteFooter />
  </main>;
}
