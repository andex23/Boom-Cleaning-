import { Photo } from "@/components/public/Photo";
import Link from "next/link";
import { listBookableServices } from "@/features/services/public-catalog";
import { loadTestimonials } from "@/features/reviews/testimonials";
import { TestimonialSlider } from "@/components/public/TestimonialSlider";
import { ServiceCarousel } from "@/components/public/ServiceCarousel";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import styles from "./home.module.css";

const steps = [
  ["01", "Tell us what you need", "Choose a service and share a few details about your space."],
  ["02", "Pick a time that works", "Select a preferred date. We confirm capacity before you pay."],
  ["03", "Relax while we handle it", "Your team arrives prepared and keeps you updated to completion."],
] as const;

export const dynamic = "force-dynamic";

export default async function Home() {
  const [services, testimonials] = await Promise.all([
    listBookableServices().then((all) => all.slice(0, 6)),
    loadTestimonials(),
  ]);
  return <main className={styles.page}>
    <SiteHeader priority />

    <section className={styles.hero}>
      <div className={styles.heroCopy}><h1>A cleaner home,<br />without the <em>back-and-forth.</em></h1><p>Professional cleaning in Abuja, on your terms. Choose your service, select an available time, and confirm your booking in one simple flow.</p><div className={styles.heroActions}><Link href="/quote" className={styles.primary}>Book a service <span>→</span></Link><Link href="/services" className={styles.secondary}>Explore services</Link></div><p className={styles.location}>⌖ Proudly serving Abuja and surrounding areas</p></div>
      <Photo data-reveal="photo" className={styles.heroImage} src="/images/team/08-cleaner-portrait.webp" alt="A BOOM cleaner with a caddy of cleaning supplies" priority sizes="(max-width: 800px) 100vw, 50vw" fill position="50% 32%" />
    </section>

    <section className={styles.services} id="services"><div className={styles.sectionIntro}><p>Our services</p><h2 data-reveal="heading">Every space.<br />Carefully cleaned.</h2><span>Choose the clean you need and go straight to available booking times.</span><Link href="/services">View all services →</Link></div><ServiceCarousel services={services} /></section>

    <section className={styles.teamBand} aria-labelledby="team-band-heading">
      <Photo data-reveal="photo" className={styles.teamBandPhoto} src="/images/team/03-team-group.webp" alt="The BOOM Cleaning Services team in Abuja" sizes="(max-width: 900px) 100vw, 46vw" fill position="50% 30%" />
      <div className={styles.teamBandCopy}>
        <p className={styles.eyebrow}>Our people</p>
        <h2 data-reveal="heading" id="team-band-heading">Trained, uniformed,<br />and glad to be here.</h2>
        <p>Every BOOM job is done by our own team &mdash; the same faces, in uniform, carrying the equipment the work actually needs. No sub-contracting, no strangers.</p>
        <Link className={styles.secondary} href="/about">Meet the team <span aria-hidden="true">→</span></Link>
      </div>
    </section>

    <section className={styles.process} id="process"><div><p>How it works</p><h2 data-reveal="heading">Simple. Clear.<br />Built around you.</h2><Photo data-reveal="photo" className={styles.processPhoto} src="/images/team/04-team-portrait.webp" alt="A BOOM cleaner arriving for a booked job" sizes="(max-width: 900px) 92vw, 26vw" /></div><ol data-reveal-stagger>{steps.map(([number, title, body]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></li>)}</ol></section>

    <section className={styles.quoteBand}><div><p>Book your clean</p><h2 data-reveal="heading">Choose a service.<br />Pick a time.</h2></div><div><p>See the price, choose an available date and time, then confirm the appointment—all in one straightforward booking flow.</p><Link className={styles.primary} href="/quote">Start booking <span>→</span></Link></div></section>

    <section className={styles.availability} aria-labelledby="availability-heading">
      <div className={styles.availabilityCopy}>
        <p className={styles.eyebrow}>When we work</p>
        <h2 data-reveal="heading" id="availability-heading">Six days a week,<br />around your schedule.</h2>
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
        <h2 data-reveal="heading" id="offices-heading">Workspaces that stay ready.</h2>
        <p>Offices, shortlets and commercial spaces are quoted to your scope and cleaned outside your busy hours. Tell us the size and rhythm you need and we&rsquo;ll price it properly.</p>
        <Link className={styles.secondary} href="/quote?service=office-cleaning">Get an office quote <span aria-hidden="true">→</span></Link>
      </div>
      <ul className={styles.officeList} data-reveal-stagger>
        <li><strong>Outside your hours</strong><span>Evenings and weekends so nobody works around us.</span></li>
        <li><strong>A consistent team</strong><span>The same crew each visit, so standards hold.</span></li>
        <li><strong>Priced to your scope</strong><span>Quoted on the real space, not a generic rate card.</span></li>
      </ul>
      <Photo data-reveal="photo" className={styles.officesImage} src="/images/team/01-team-wide.webp" alt="The BOOM crew in uniform with their equipment" sizes="(max-width: 820px) 92vw, 1180px" minAspect={2} position="center 42%" />
    </section>

    <section className={styles.promise} id="about"><h2 data-reveal="heading">Care you can feel<br />after we leave.</h2><div><article><span>01</span><h3>Trusted professionals</h3><p>Every job is assigned deliberately, with clear service notes and accountability.</p></article><article><span>02</span><h3>Safe for your space</h3><p>We adapt our approach to the people, pets, materials and requirements in your home.</p></article><article><span>03</span><h3>On time, every time</h3><p>Confirmed schedules, helpful reminders and a team that knows what is expected.</p></article></div></section>

    {testimonials.length > 0 ? <section className={styles.reviews} aria-labelledby="reviews-heading">
      <div className={styles.sectionIntro}>
        <p className={styles.eyebrow}>What customers say</p>
        <h2 data-reveal="heading" id="reviews-heading">In their words.</h2>
      </div>
      <TestimonialSlider testimonials={testimonials} />
    </section> : null}

    <SiteFooter />
  </main>;
}
