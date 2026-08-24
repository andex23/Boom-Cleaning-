import Link from "next/link";
import { Photo } from "@/components/public/Photo";
import { Arrow } from "@/components/brand/Arrow";
import { Icon, type IconName } from "@/components/brand/Icon";
import { listBookableServices } from "@/features/services/public-catalog";
import { loadTestimonials } from "@/features/reviews/testimonials";
import { TestimonialSlider } from "@/components/public/TestimonialSlider";
import { ServiceCarousel } from "@/components/public/ServiceCarousel";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import styles from "./home.module.css";

const promises: [IconName, string, string][] = [
  ["shieldCheck", "Trusted professionals", "Vetted, trained and uniformed cleaners."],
  ["calendar", "Easy booking", "Choose your clean and your time online."],
  ["sparkle", "Quality guarantee", "A final check before the team leaves."],
  ["headset", "Support", "Reach us on the phone, WhatsApp or Instagram."],
];

const reasons: [IconName, string, string][] = [
  ["leaf", "The right products", "Chosen for the surface, the material and the space."],
  ["clock", "Flexible scheduling", "Morning or afternoon, six days a week."],
  ["shield", "A scope you agreed", "Confirmed before we arrive, checked before we leave."],
  ["card", "Transparent pricing", "Published rates. What you see is what you pay."],
];

const steps = [
  ["01", "Choose your clean", "Tell us what needs attention and we’ll show the right service and price."],
  ["02", "Choose your time", "Pick an available arrival window that works for your day."],
  ["03", "Come home to clean", "A prepared BOOM team arrives, gets it done and keeps you updated."],
] as const;

export const dynamic = "force-dynamic";

export default async function Home() {
  const [services, testimonials] = await Promise.all([
    listBookableServices().then((all) => all.slice(0, 6)),
    loadTestimonials(),
  ]);

  return <main className={styles.page}>
    <SiteHeader priority />

    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.heroCopy}>
        <p className={styles.pill}><Icon name="sparkle" /> Professional cleaning services</p>
        <h1 id="hero-heading">Spotless spaces,<br /><em>happier faces</em></h1>
        <p className={styles.heroLead}>
          Professional cleaning for your home or workplace. Choose your service, see the
          price and book a time — no endless back-and-forth.
        </p>
        <div className={styles.heroActions}>
          <Link className={styles.primary} href="/quote"><Icon name="calendar" /> Book a cleaning</Link>
          <a className={styles.secondary} href="tel:+2349029799205"><Icon name="phone" /> Call us</a>
        </div>
        {/* No rating or customer count: BOOM has published testimonials but no review
            score, and a number nobody can check is not worth the doubt it invites. */}
        <p className={styles.heroTrust}>
          <Icon name="shieldCheck" /> Trained, uniformed teams &middot; Mon&ndash;Sat, 8am&ndash;6pm &middot; Abuja, FCT
        </p>
      </div>

      <div className={styles.heroMedia}>
        <Photo
          data-reveal="photo"
          className={styles.heroImage}
          src="/images/interiors/office.webp"
          alt="A bright, freshly cleaned interior with a city view"
          sizes="(max-width: 900px) 100vw, 52vw"
          fill
          position="50% 50%"
          priority
        />
        <div className={styles.heroCard}>
          <span><Icon name="shield" /></span>
          <div>
            <strong>Trusted &amp; reliable</strong>
            <small>Trained BOOM staff, assigned to your job.</small>
          </div>
        </div>
      </div>
    </section>

    <section className={styles.promises} aria-label="Why book with BOOM">
      <ul>
        {promises.map(([icon, title, body]) => <li key={title}>
          <span><Icon name={icon} /></span>
          <div><strong>{title}</strong><small>{body}</small></div>
        </li>)}
      </ul>
    </section>

    <section className={styles.why} aria-labelledby="why-heading">
      <div className={styles.whyLead}>
        <p className={styles.pill}>Why choose us</p>
        <h2 data-reveal="heading" id="why-heading">We go beyond<br /><em>just cleaning</em></h2>
        <p>
          BOOM brings trained people, the right equipment and a properly scoped service to
          your door. You choose what you need and when you need it; we handle the rest.
        </p>
        <Link className={styles.textLink} href="/about">Meet the people behind BOOM <Arrow /></Link>
      </div>

      <ul className={styles.reasons} data-reveal-stagger>
        {reasons.map(([icon, title, body]) => <li key={title}>
          <span><Icon name={icon} /></span>
          <div><strong>{title}</strong><small>{body}</small></div>
        </li>)}
      </ul>

      <aside className={styles.bookCard}>
        <h3>Book your cleaning</h3>
        <p>Tell us about your space and see your price before you commit.</p>
        <Link className={styles.primary} href="/quote"><Icon name="calendar" /> Book now</Link>
        <a className={styles.bookCall} href="tel:+2349029799205"><Icon name="phone" /> Call: 0902 979 9205</a>
      </aside>
    </section>

    <section className={styles.services} id="services" aria-labelledby="services-heading">
      <div className={styles.sectionIntro}>
        <div>
          <p className={styles.pill}>Choose your clean</p>
          <h2 data-reveal="heading" id="services-heading">What can we<br /><em>take off your list?</em></h2>
        </div>
        <div>
          <p>From a full home reset to post-construction dust, choose the service that matches the job and go straight to booking.</p>
          <Link href="/services" className={styles.textLink}>Explore every service <Arrow /></Link>
        </div>
      </div>
      <ServiceCarousel services={services} />
    </section>

    <section className={styles.process} id="how-it-works" aria-labelledby="process-heading">
      <div className={styles.processLead}>
        <p className={styles.pill}>How booking works</p>
        <h2 data-reveal="heading" id="process-heading">Three steps.<br /><em>Zero guesswork.</em></h2>
        <Link className={styles.primary} href="/quote"><Icon name="calendar" /> Start your booking</Link>
      </div>
      <ol data-reveal-stagger>
        {steps.map(([number, title, body]) => <li key={number}>
          <span>{number}</span>
          <div><h3>{title}</h3><p>{body}</p></div>
        </li>)}
      </ol>
    </section>

    {testimonials.length ? <section className={styles.reviews} aria-labelledby="reviews-heading">
      <div className={styles.sectionIntro}>
        <div>
          <p className={styles.pill}>Real customer notes</p>
          <h2 data-reveal="heading" id="reviews-heading">The clean speaks<br /><em>for itself.</em></h2>
        </div>
        <div><p>Messages customers sent us on WhatsApp and Instagram, published with their permission.</p></div>
      </div>
      <TestimonialSlider testimonials={testimonials} />
    </section> : null}

    <section className={styles.finalCta} aria-labelledby="final-cta-heading">
      <div>
        <p className={styles.pill}>Your next clean starts here</p>
        <h2 data-reveal="heading" id="final-cta-heading">Put clean<br /><em>on the calendar.</em></h2>
        <p>Choose a service, describe your space and request a time in one clear flow.</p>
        <div className={styles.heroActions}>
          <Link className={styles.primary} href="/quote"><Icon name="calendar" /> Book a cleaning</Link>
          <a className={styles.secondary} href="https://wa.me/2349029799205" target="_blank" rel="noreferrer"><Icon name="whatsapp" /> Message us</a>
        </div>
      </div>
    </section>

    <SiteFooter />
  </main>;
}
