import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Icon } from "@/components/brand/Icon";
import styles from "./SiteChrome.module.css";

const QUICK_LINKS = [
  ["/", "Home"],
  ["/services", "Services"],
  ["/pricing", "Pricing"],
  ["/about", "About us"],
  ["/faq", "FAQs"],
] as const;

/**
 * One footer for every public page, for the same reason as the header.
 *
 * The links are grouped and headed rather than stacked in a single column so customers can
 * reach services, company information and contact details quickly. On a phone the columns
 * become one list and the two things people actually reach for — booking and the phone
 * number — move to the bottom as full-width controls.
 */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div>
        <BrandLogo size={72} tone="onDark" />
        <p className={styles.footerTagline}>
          Professional cleaning services that bring comfort, freshness and peace of mind.
        </p>
        <p className={styles.footerPlace}>Abuja, FCT &middot; Nigeria</p>
        <div className={styles.socials}>
          <a href="https://instagram.com/boomcleaningservices" target="_blank" rel="noreferrer" aria-label="BOOM on Instagram"><Icon name="instagram" /></a>
          <a href="https://wa.me/2349029799205" target="_blank" rel="noreferrer" aria-label="BOOM on WhatsApp"><Icon name="whatsapp" /></a>
          <a href="tel:+2349029799205" aria-label="Call BOOM"><Icon name="phone" /></a>
        </div>
      </div>

      <nav className={styles.footerNav} aria-label="Footer">
        <div>
          <h2>Quick links</h2>
          {QUICK_LINKS.map(([href, label]) => (
            <Link key={href} href={href}>{label}<Icon name="chevronRight" /></Link>
          ))}
        </div>
        <div>
          <h2>Services</h2>
          <Link href="/quote?service=deep-cleaning">Deep cleaning<Icon name="chevronRight" /></Link>
          <Link href="/quote?service=post-construction-cleaning">Post-construction<Icon name="chevronRight" /></Link>
          <Link href="/quote?service=fumigation">Fumigation<Icon name="chevronRight" /></Link>
          <Link href="/quote?service=office-cleaning">Office cleaning<Icon name="chevronRight" /></Link>
        </div>
        <div>
          <h2>Talk to us</h2>
          <a href="tel:+2349029799205">0902 979 9205<Icon name="chevronRight" /></a>
          <a href="https://wa.me/2349029799205" target="_blank" rel="noreferrer">WhatsApp<Icon name="chevronRight" /></a>
          <a href="https://instagram.com/boomcleaningservices" target="_blank" rel="noreferrer">Instagram<Icon name="chevronRight" /></a>
          <span className={styles.footerHours}>Mon&ndash;Sat, 8am&ndash;6pm</span>
        </div>
      </nav>

      <div className={styles.footerActions}>
        <Link href="/quote"><Icon name="calendar" /> Book Now</Link>
        <a href="tel:+2349029799205"><Icon name="phone" /> Call: 0902 979 9205</a>
      </div>

      <div className={styles.footerBase}>
        <small>&copy; {new Date().getFullYear()} BOOM Cleaning Services</small>
      </div>
    </footer>
  );
}
