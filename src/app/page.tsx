import Image from "next/image";
import Link from "next/link";
import { listBookableServices } from "@/features/services/public-catalog";
import { loadPublishedReviews } from "@/features/reviews/published-reviews";
import styles from "./home.module.css";
import brandStyles from "./homeBrand.module.css";

const steps = [
  ["01", "Tell us what you need", "Choose a service and share a few details about your space."],
  ["02", "Pick a time that works", "Select a preferred date. We confirm capacity before you pay."],
  ["03", "Relax while we handle it", "Your team arrives prepared and keeps you updated to completion."],
] as const;

export const dynamic = "force-dynamic";

export default async function Home() {
  const [services, reviews] = await Promise.all([
    listBookableServices().then((all) => all.slice(0, 6)),
    loadPublishedReviews(),
  ]);
  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={brandStyles.headerBrand} aria-label="BOOM Cleaning home">
        <Image src="/images/boom-official-logo.jpg" width={64} height={64} alt="BOOM Cleaning Services official logo" priority />
        <span className={brandStyles.wordmark}><strong>BOOM</strong><small>Cleaning Services</small></span>
      </Link>
      <nav aria-label="Primary navigation"><Link href="/services">Services</Link><a href="#process">How it works</a><a href="#about">About</a></nav>
      <Link className={styles.headerCta} href="/quote">Book a service <span>→</span></Link>
    </header>

    <section className={styles.hero}>
      <div className={styles.heroCopy}><h1>A cleaner home,<br />without the <em>back-and-forth.</em></h1><p>Professional cleaning in Abuja, on your terms. Choose your service, select an available time, and confirm your booking in one simple flow.</p><div className={styles.heroActions}><Link href="/quote" className={styles.primary}>Book a service <span>→</span></Link><Link href="/services" className={styles.secondary}>Explore services</Link></div><p className={styles.location}>⌖ Proudly serving Abuja and surrounding areas</p></div>
      <div className={styles.heroImage}><Image src="/images/boom-cleaning-hero-v2.png" alt="A BOOM cleaner in the brand's blue uniform caring for a contemporary Abuja living room" fill priority sizes="(max-width: 800px) 100vw, 52vw" /></div>
    </section>

    <section className={styles.services} id="services"><div className={styles.sectionIntro}><p>Our services</p><h2>Every space.<br />Carefully cleaned.</h2><span>Choose the clean you need and go straight to available booking times.</span><Link href="/services">View all services →</Link></div><div className={styles.serviceList}>{services.map((service, index) => <Link href={`/quote?service=${service.slug}`} className={styles.serviceRow} key={service.id} aria-label={`Book ${service.name}`}><div className={styles.serviceImage}><Image src={service.image} alt={`${service.name} by BOOM Cleaning Services`} fill sizes="(max-width: 850px) 100vw, 32vw" /></div><div className={styles.serviceDetails}><small>{String(index + 1).padStart(2, "0")}</small><div><h3>{service.name}</h3><p>{service.tagline}</p></div><span className={styles.bookAction}>Book →</span></div></Link>)}</div></section>

    <section className={styles.process} id="process"><div><p>How it works</p><h2>Simple. Clear.<br />Built around you.</h2></div><ol>{steps.map(([number, title, body]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></li>)}</ol></section>

    <section className={styles.quoteBand}><div><p>Book your clean</p><h2>Choose a service.<br />Pick a time.</h2></div><div><p>See the price, choose an available date and time, then confirm the appointment—all in one straightforward booking flow.</p><Link className={styles.primary} href="/quote">Start booking <span>→</span></Link></div></section>

    <section className={styles.availability} aria-labelledby="availability-heading">
      <div className={styles.availabilityCopy}>
        <p className={styles.eyebrow}>When we work</p>
        <h2 id="availability-heading">Six days a week,<br />around your schedule.</h2>
        <p>BOOM runs Monday to Saturday, 8am to 6pm. Choose the arrival window that suits you and we confirm before the day.</p>
      </div>
      <ul className={styles.availabilityGrid}>
        {[["Mon", true], ["Tue", true], ["Wed", true], ["Thu", true], ["Fri", true], ["Sat", true], ["Sun", false]].map(([day, open]) =>
          <li key={String(day)} className={open ? styles.dayOpen : styles.dayClosed}><strong>{day}</strong><span>{open ? "8am – 6pm" : "Closed"}</span></li>)}
      </ul>
    </section>

    <section className={styles.offices} aria-labelledby="offices-heading">
      <div>
        <p className={styles.eyebrow}>For businesses</p>
        <h2 id="offices-heading">Workspaces that stay ready.</h2>
        <p>Offices, shortlets and commercial spaces are quoted to your scope and cleaned outside your busy hours. Tell us the size and rhythm you need and we&rsquo;ll price it properly.</p>
        <Link className={styles.secondary} href="/quote?service=office-cleaning">Get an office quote <span aria-hidden="true">→</span></Link>
      </div>
      <ul className={styles.officeList}>
        <li><strong>Outside your hours</strong><span>Evenings and weekends so nobody works around us.</span></li>
        <li><strong>A consistent team</strong><span>The same crew each visit, so standards hold.</span></li>
        <li><strong>Priced to your scope</strong><span>Quoted on the real space, not a generic rate card.</span></li>
      </ul>
    </section>

    <section className={styles.promise} id="about"><h2>Care you can feel<br />after we leave.</h2><div><article><span>01</span><h3>Trusted professionals</h3><p>Every job is assigned deliberately, with clear service notes and accountability.</p></article><article><span>02</span><h3>Safe for your space</h3><p>We adapt our approach to the people, pets, materials and requirements in your home.</p></article><article><span>03</span><h3>On time, every time</h3><p>Confirmed schedules, helpful reminders and a team that knows what is expected.</p></article></div></section>

    {reviews.length > 0 ? <section className={styles.reviews} aria-labelledby="reviews-heading">
      <div className={styles.sectionIntro}>
        <p className={styles.eyebrow}>What customers say</p>
        <h2 id="reviews-heading">In their words.</h2>
      </div>
      <ul className={styles.reviewGrid}>{reviews.map((review) => <li key={review.id} className={styles.reviewCard}>
        <div className={styles.stars} aria-label={`${review.rating} out of 5`}>{"★".repeat(review.rating)}<span>{"★".repeat(5 - review.rating)}</span></div>
        <blockquote>{review.comment}</blockquote>
        <footer>{review.author}{review.service ? ` · ${review.service}` : ""}</footer>
      </li>)}</ul>
    </section> : null}

    <footer className={styles.footer}><div className={brandStyles.footerBrand}><Image src="/images/boom-official-logo.jpg" width={96} height={96} alt="BOOM Cleaning Services official logo" /><span className={brandStyles.footerWordmark}><strong>BOOM</strong><small>Cleaning Services</small></span></div><p>Making homes and workspaces cleaner, healthier and better places to be.</p><div><Link href="/services">Services</Link><Link href="/quote">Book a service</Link><Link href="/admin">Staff operations</Link></div><small>Abuja, FCT, Nigeria · BOOM Cleaning Services</small></footer>
  </main>;
}
