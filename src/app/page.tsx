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

    <section className={styles.hero} aria-labelledby="hero-heading" style={{ backgroundImage: "url('/images/team/02-team-equipment.webp')" }}>
      <div className={styles.heroShade} />
      <div className={styles.heroCopy}>
        <h1 id="hero-heading">Your space.<br />Beautifully handled.</h1>
        <p>Book a trained BOOM team for your home or workplace. Clear service choices, real availability and no endless back-and-forth.</p>
        <div className={styles.heroActions}>
          <Link href="/quote" className={styles.primary}>Book your clean <span aria-hidden="true">↗</span></Link>
          <Link href="/services" className={styles.heroLink}>See what we clean <span aria-hidden="true">→</span></Link>
        </div>
      </div>
      <div className={styles.heroMeta} aria-label="Service details">
        <span>Mon–Sat</span><span>8am–6pm</span><span>Abuja, FCT</span>
      </div>
    </section>

    <section className={styles.intro} aria-labelledby="intro-heading">
      <p className={styles.eyebrow}>A better way to book a clean</p>
      <h2 data-reveal="heading" id="intro-heading">Less chasing.<br /><em>More living.</em></h2>
      <p>BOOM brings trained people, the right equipment and a properly scoped service to your door. You choose what you need and when you need it; we handle the rest.</p>
      <Link href="/about" className={styles.textLink}>Meet the people behind BOOM <span aria-hidden="true">→</span></Link>
    </section>

    <section className={styles.services} id="services" aria-labelledby="services-heading">
      <div className={styles.sectionIntro}>
        <div><p className={styles.eyebrow}>Choose your clean</p><h2 data-reveal="heading" id="services-heading">What can we<br />take off your list?</h2></div>
        <div><p>From a full home reset to post-construction dust, choose the service that matches the job and go straight to booking.</p><Link href="/services" className={styles.textLink}>Explore every service <span aria-hidden="true">→</span></Link></div>
      </div>
      <ServiceCarousel services={services} />
    </section>

    <section className={styles.process} id="how-it-works" aria-labelledby="process-heading">
      <div className={styles.processLead}>
        <p className={styles.eyebrow}>How booking works</p>
        <h2 data-reveal="heading" id="process-heading">Three steps.<br />Zero guesswork.</h2>
        <Link className={styles.darkButton} href="/quote">Start your booking <span aria-hidden="true">↗</span></Link>
      </div>
      <ol data-reveal-stagger>{steps.map(([number, title, body]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol>
    </section>

    <section className={styles.whyBoom} aria-labelledby="why-heading">
      <div>
        <p className={styles.eyebrow}>What BOOM brings</p>
        <h2 data-reveal="heading" id="why-heading">A proper team. A proper clean.</h2>
        <p>Every booking has a clear scope, an accountable crew and the equipment the work actually needs.</p>
        <Link className={styles.secondary} href="/about#team">Meet the BOOM team <span aria-hidden="true">→</span></Link>
      </div>
      <ul data-reveal-stagger>
        <li><strong>Trained and identifiable</strong><span>Uniformed BOOM staff assigned deliberately to each job.</span></li>
        <li><strong>Equipped for the work</strong><span>Professional machines and supplies chosen for your space.</span></li>
        <li><strong>Clear from start to finish</strong><span>Confirmed scope, helpful updates and a final check before we leave.</span></li>
      </ul>
    </section>

    <section className={styles.offices} aria-labelledby="offices-heading">
      <Photo className={styles.officesImage} src="/images/services/office-cleaning.webp" alt="A bright, professionally cleaned office" sizes="(max-width: 820px) 100vw, 46vw" fill position="50% 50%" />
      <div className={styles.officesCopy}>
        <p className={styles.eyebrow}>BOOM for business</p>
        <h2 data-reveal="heading" id="offices-heading">A workplace ready for work.</h2>
        <p>Offices, shortlets and commercial spaces are quoted to their real scope and cleaned around the hours that suit your team.</p>
        <ul><li>Flexible scheduling</li><li>Consistent cleaning teams</li><li>Clear scope and pricing</li></ul>
        <Link className={styles.lightButton} href="/quote?service=office-cleaning">Request an office quote <span aria-hidden="true">↗</span></Link>
      </div>
    </section>

    {testimonials.length > 0 ? <section className={styles.reviews} aria-labelledby="reviews-heading">
      <div className={styles.sectionIntro}>
        <div><p className={styles.eyebrow}>Real customer notes</p><h2 data-reveal="heading" id="reviews-heading">The clean speaks<br />for itself.</h2></div>
        <p>Feedback from people who have invited BOOM into their homes and workplaces.</p>
      </div>
      <TestimonialSlider testimonials={testimonials} />
    </section> : null}

    <section className={styles.finalCta} aria-labelledby="final-cta-heading">
      <Photo className={styles.finalImage} src="/images/services/deep-cleaning.webp" alt="A freshly cleaned, bright interior" sizes="100vw" fill position="50% 50%" />
      <div className={styles.finalShade} />
      <div><p className={styles.heroEyebrow}>Your next clean starts here</p><h2 id="final-cta-heading">Put clean<br />on the calendar.</h2><Link href="/quote" className={styles.primary}>Book your clean <span aria-hidden="true">↗</span></Link></div>
    </section>

    <SiteFooter />
  </main>;
}
