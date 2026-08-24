import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Icon } from "@/components/brand/Icon";
import { SiteNav } from "./SiteNav";
import styles from "./SiteChrome.module.css";

/**
 * One header for every public page. The services page previously carried its own
 * inline-styled bar with a text wordmark, no navigation and no logo, so the site had three
 * different headers depending on where you landed.
 *
 * The bar is light on every page now, including over the hero photograph, so the logo no
 * longer has to switch tone with the page it sits on.
 */
export function SiteHeader({ priority = false }: { priority?: boolean }) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="BOOM Cleaning home">
        <BrandLogo size={58} tone="onLight" priority={priority} />
      </Link>
      <SiteNav />
      <Link className={styles.cta} href="/quote">
        <Icon name="calendar" /> Book Now
      </Link>
    </header>
  );
}
