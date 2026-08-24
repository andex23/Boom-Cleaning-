import { ServiceCatalog } from "@/components/public/ServiceCatalog";
import { listBookableServices } from "@/features/services/public-catalog";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import styles from "../home.module.css";

export const metadata = { title: "Cleaning services | BOOM", description: "Find the right BOOM cleaning service for your home or business in Abuja." };
export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const services = await listBookableServices();
  return <main className={styles.page}>
    <SiteHeader priority />
    <ServiceCatalog services={services} />
    <SiteFooter />
  </main>;
}
