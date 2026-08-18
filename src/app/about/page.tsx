import Image from "next/image";
import Link from "next/link";
import { listBookableServices } from "@/features/services/public-catalog";
import { loadTestimonials } from "@/features/reviews/testimonials";
import { SiteNav } from "@/components/public/SiteNav";
import styles from "../home.module.css";
import brandStyles from "../homeBrand.module.css";
import about from "./about.module.css";

export const metadata = {
  title: "About BOOM Cleaning Services | Abuja",
  description: "Who BOOM Cleaning Services are, how we work, and the team and equipment behind every clean in Abuja.",
};
export const dynamic = "force-dynamic";

/** Only what the equipment in our own photographs shows we actually own and use. */
const KIT = [
  { name: "Floor scrubbers and polishers", use: "Bringing tiled and stone floors back to a proper finish." },
  { name: "Industrial wet and dry vacuums", use: "Lifting fine dust and standing water that a domestic vacuum cannot." },
  { name: "Carpet and upholstery extractors", use: "Deep cleaning sofas, mattresses and rugs rather than surface wiping." },
  { name: "Air movers", use: "Drying floors and fabrics quickly so a space is usable the same day." },
  { name: "Fumigation foggers", use: "Treating a property properly for pests, not just spraying the corners." },
];

export default async function AboutPage() {
  const [services, testimonials] = await Promise.all([listBookableServices(), loadTestimonials(3)]);

  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={brandStyles.headerBrand} aria-label="BOOM Cleaning home">
        <Image src="/images/boom-official-logo.jpg" width={64} height={64} alt="BOOM Cleaning Services official logo" priority />
        <span className={brandStyles.wordmark}><strong>BOOM</strong><small>Cleaning Services</small></span>
      </Link>
      <SiteNav />
      <Link className={styles.headerCta} href="/quote">Book a service <span>→</span></Link>
    </header>

    <section className={about.hero}>
      <p className={styles.eyebrow}>About us</p>
      <h1>Cleaning done properly,<br />by people who take it seriously.</h1>
      <p className={about.lead}>
        BOOM Cleaning Services is an Abuja cleaning company. We clean homes, offices and
        newly built properties &mdash; the kind of work where the difference between a
        surface wipe and a real clean is obvious the moment you walk in.
      </p>
    </section>

    <section className={about.pillars} aria-labelledby="how-heading">
      <h2 id="how-heading" className={about.sectionHeading}>How we work</h2>
      <ul>
        <li>
          <strong>We quote on the actual space</strong>
          <p>Rooms, floors, outdoor areas and extras are counted and priced individually, so the figure you see is built from your property rather than a generic rate.</p>
        </li>
        <li>
          <strong>A trained team, in uniform</strong>
          <p>The same people, properly equipped and identifiable, turn up to do the work. Nobody is sent to a job they have not been trained for.</p>
        </li>
        <li>
          <strong>We say what we cannot price</strong>
          <p>Where a job needs looking at first, we tell you and quote it by hand instead of guessing and revising the number later.</p>
        </li>
      </ul>
    </section>

    <section className={about.kit} aria-labelledby="kit-heading">
      <div>
        <p className={styles.eyebrow}>Equipment</p>
        <h2 id="kit-heading">The right machine for the job.</h2>
        <p className={about.kitLead}>
          Much of what separates a professional clean from a thorough tidy is equipment.
          These are the machines our teams carry to site.
        </p>
      </div>
      <ul>{KIT.map((item) => <li key={item.name}><strong>{item.name}</strong><span>{item.use}</span></li>)}</ul>
    </section>

    <section className={about.services} aria-labelledby="services-heading">
      <h2 id="services-heading" className={about.sectionHeading}>What we clean</h2>
      <ul className={about.serviceChips}>
        {services.map((service) => <li key={service.id}><Link href={`/quote?service=${service.slug}`}>{service.name}</Link></li>)}
      </ul>
      <Link className={styles.secondary} href="/services">See every service <span aria-hidden="true">→</span></Link>
    </section>

    {testimonials.length > 0 ? <section className={about.quotes} aria-labelledby="quotes-heading">
      <h2 id="quotes-heading" className={about.sectionHeading}>What customers tell us</h2>
      <ul>{testimonials.map((testimonial) => <li key={testimonial.id}>
        <blockquote>&ldquo;{testimonial.quote}&rdquo;</blockquote>
        <cite>{testimonial.author}</cite>
      </li>)}</ul>
    </section> : null}

    <section className={about.cta}>
      <h2>Tell us about your space.</h2>
      <p>Get a price in a few minutes, or call and talk it through with us.</p>
      <div className={about.ctaActions}>
        <Link className={styles.primary} href="/quote">Book a service <span aria-hidden="true">→</span></Link>
        <a className={styles.secondary} href="tel:+2349029799205">Call 0902 979 9205</a>
      </div>
    </section>

    <footer className={styles.footer}>
      <div className={brandStyles.footerBrand}>
        <Image src="/images/boom-official-logo.jpg" width={96} height={96} alt="BOOM Cleaning Services official logo" />
        <span className={brandStyles.footerWordmark}><strong>BOOM</strong><small>Cleaning Services</small></span>
      </div>
      <p>Making homes and workspaces cleaner, healthier and better places to be.</p>
      <div>
        <Link href="/services">Services</Link>
        <Link href="/quote">Book a service</Link>
        <Link href="/about">About us</Link>
        <a href="tel:+2349029799205">0902 979 9205</a>
      </div>
    </footer>
  </main>;
}
