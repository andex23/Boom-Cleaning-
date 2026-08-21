import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import styles from "@/app/home.module.css";

/**
 * One footer for every public page, for the same reason as the header.
 *
 * The links are grouped and headed rather than stacked in a single column so customers
 * can reach services, company information and contact details quickly.
 */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBrandBlock}>
        <BrandLogo size={78} tone="onDark" />
        <p className={styles.footerTagline}>Making homes and workspaces cleaner, healthier and better places to be.</p>
        <p className={styles.footerPlace}>Abuja, FCT &middot; Nigeria</p>
      </div>

      <nav className={styles.footerNav} aria-label="Footer">
        <div>
          <h2>Services</h2>
          <Link href="/services">All services</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/quote?service=deep-cleaning">Deep cleaning</Link>
          <Link href="/quote?service=post-construction-cleaning">Post-construction</Link>
        </div>
        <div>
          <h2>Company</h2>
          <Link href="/about">About us</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/faq">FAQs</Link>
          <Link href="/quote">Book a service</Link>
        </div>
        <div>
          <h2>Talk to us</h2>
          <a href="tel:+2349029799205">0902 979 9205</a>
          <a href="https://wa.me/2349029799205" target="_blank" rel="noreferrer">WhatsApp</a>
          <a href="https://instagram.com/boomcleaningservices" target="_blank" rel="noreferrer">Instagram</a>
          <span className={styles.footerHours}>Mon&ndash;Sat, 8am&ndash;6pm</span>
        </div>
      </nav>

      <div className={styles.footerBase}>
        <small>&copy; {new Date().getFullYear()} BOOM Cleaning Services</small>
      </div>
    </footer>
  );
}
