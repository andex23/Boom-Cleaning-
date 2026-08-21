import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { SiteNav } from "./SiteNav";
import styles from "@/app/home.module.css";
import brandStyles from "@/app/homeBrand.module.css";
import { Arrow } from "@/components/brand/Arrow";

/**
 * One header for every public page. The services page previously carried its own
 * inline-styled bar with a text wordmark, no navigation and no logo, so the site had three
 * different headers depending on where you landed.
 */
export function SiteHeader({
  priority = false,
  overlay = false,
}: {
  priority?: boolean;
  overlay?: boolean;
}) {
  return (
    <header className={`${styles.header} ${overlay ? styles.headerOverlay : ""}`}>
      <Link href="/" className={brandStyles.headerBrand} aria-label="BOOM Cleaning home">
        <BrandLogo size={64} tone={overlay ? "onDark" : "onLight"} priority={priority} />
        <span className={brandStyles.wordmark}><strong>BOOM</strong><small>Cleaning Services</small></span>
      </Link>
      <SiteNav />
      <Link className={styles.headerCta} href="/quote">Book a service <Arrow /></Link>
    </header>
  );
}
