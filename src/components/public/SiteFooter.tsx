import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import styles from "@/app/home.module.css";
import brandStyles from "@/app/homeBrand.module.css";

/** One footer for every public page, for the same reason as the header. */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={brandStyles.footerBrand}>
        <BrandLogo size={96} tone="onDark" />
        <span className={brandStyles.footerWordmark}><strong>BOOM</strong><small>Cleaning Services</small></span>
      </div>
      <p>Making homes and workspaces cleaner, healthier and better places to be.</p>
      <div>
        <Link href="/services">Services</Link>
        <Link href="/about">About us</Link>
        <Link href="/quote">Book a service</Link>
        <a href="tel:+2349029799205">0902 979 9205</a>
        <Link href="/admin">Staff operations</Link>
      </div>
      <small>Abuja, FCT, Nigeria · BOOM Cleaning Services</small>
    </footer>
  );
}
