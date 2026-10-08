import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Icon } from "@/components/brand/Icon";
import styles from "./SiteChrome.module.css";

const QUICK_LINKS = [
  ["/", "Home"],
  ["/services", "Services"],
  ["/pricing", "Pricing"],
  ["/about", "About us"],
] as const;

const SERVICE_LINKS = [
  ["/quote?service=deep-cleaning", "Deep cleaning"],
  ["/quote?service=post-construction-cleaning", "Post-construction"],
  ["/quote?service=fumigation", "Fumigation"],
  ["/quote?service=office-cleaning", "Office cleaning"],
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
    <footer className={styles.footer} id="contact">
      <div>
        <BrandLogo size={72} tone="onDark" />
        <p className={styles.footerTagline}>
          Professional cleaning services that bring comfort, freshness and peace of mind.
        </p>
        <p className={styles.footerPlace}>Abuja, FCT &middot; Nigeria</p>
        <div className={styles.socials}>
          <a href="https://www.instagram.com/boom_cleaning_services/" target="_blank" rel="noreferrer" aria-label="BOOM on Instagram"><Icon name="instagram" /></a>
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
          {SERVICE_LINKS.map(([href, label]) => (
            <Link key={href} href={href}>{label}<Icon name="chevronRight" /></Link>
          ))}
        </div>
        <div>
          <h2>Contact</h2>
          <a href="tel:+2349029799205">0902 979 9205<Icon name="chevronRight" /></a>
          <a href="https://wa.me/2349029799205" target="_blank" rel="noreferrer">WhatsApp<Icon name="chevronRight" /></a>
          <a href="https://www.instagram.com/boom_cleaning_services/" target="_blank" rel="noreferrer">Instagram<Icon name="chevronRight" /></a>
          <span className={styles.footerHours}>Abuja, FCT &middot; Nigeria</span>
          <span className={styles.footerHours}>Mon&ndash;Sat, 8am&ndash;6pm</span>
        </div>
      </nav>

      <nav className={styles.footerAccordions} aria-label="Footer, mobile">
        <details className={styles.footerDisclosure} open>
          <summary>Quick links <Icon name="chevronRight" /></summary>
          <div>
            {QUICK_LINKS.map(([href, label]) => <Link key={href} href={href}>{label}<Icon name="chevronRight" /></Link>)}
          </div>
        </details>
        <details className={styles.footerDisclosure}>
          <summary>Contact <Icon name="chevronRight" /></summary>
          <div className={styles.footerContact}>
            <a href="tel:+2349029799205"><span><Icon name="phone" /> Call</span><strong>0902 979 9205</strong></a>
            <a href="https://wa.me/2349029799205" target="_blank" rel="noreferrer"><span><Icon name="whatsapp" /> WhatsApp</span><Icon name="chevronRight" /></a>
            <a href="https://www.instagram.com/boom_cleaning_services/" target="_blank" rel="noreferrer"><span><Icon name="instagram" /> Instagram</span><Icon name="chevronRight" /></a>
            <p><span>Location</span><strong>Abuja, FCT &middot; Nigeria</strong></p>
            <p><span>Hours</span><strong>Mon&ndash;Sat, 8am&ndash;6pm</strong></p>
          </div>
        </details>
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
