import { Photo } from "@/components/public/Photo";
import Link from "next/link";
import { listBookableServices } from "@/features/services/public-catalog";
import { loadTestimonials } from "@/features/reviews/testimonials";
import { loadTeamPhotos } from "@/features/team/team-photos";
import { TestimonialSlider } from "@/components/public/TestimonialSlider";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import styles from "../home.module.css";
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
  const [services, testimonials, team] = await Promise.all([listBookableServices(), loadTestimonials(), loadTeamPhotos()]);

  return <main className={styles.page}>
    <SiteHeader priority />

    <section className={about.hero}>
      <p className={styles.eyebrow}>About us</p>
      <h1>Cleaning done properly,<br />by people who take it seriously.</h1>
      <p className={about.lead}>
        BOOM Cleaning Services is an Abuja cleaning company. We clean homes, offices and
        newly built properties &mdash; the kind of work where the difference between a
        surface wipe and a real clean is obvious the moment you walk in.
      </p>
      {team.length > 2 ? <Photo className={about.heroPhoto} src="/images/team/07-team-supplies.webp" alt="The BOOM Cleaning Services team with their supplies in Abuja" priority sizes="(max-width: 900px) 94vw, 1180px" minAspect={1.4} /> : null}
    </section>

    <section className={about.pillars} aria-labelledby="how-heading">
      <h2 id="how-heading" className={about.sectionHeading}>How we work</h2>
      <ol className={about.steps}>
        <li>
          <strong>You tell us about the space</strong>
          <p>Rooms, floors, outdoor areas and extras are counted individually &mdash; bedrooms, living rooms, storeys, a BQ, a compound &mdash; so the quote is built from your property rather than a generic rate.</p>
        </li>
        <li>
          <strong>You see the price before you book</strong>
          <p>The figure is worked out and shown to you up front, itemised. Where a job genuinely needs looking at first, we say so and quote it by hand instead of guessing and revising later.</p>
        </li>
        <li>
          <strong>You choose a time that suits you</strong>
          <p>Available slots come from our real working diary, Monday to Saturday. You only see times we can actually staff.</p>
        </li>
        <li>
          <strong>A trained team arrives equipped</strong>
          <p>The same people, in uniform and identifiable, with the machines the job needs. Nobody is sent to work they have not been trained for.</p>
        </li>
        <li>
          <strong>We finish and check the work</strong>
          <p>The job is reviewed against what you asked for before we leave, and we are reachable afterwards if anything is not right.</p>
        </li>
      </ol>
    </section>


    {team.length > 0 ? <section className={about.team} aria-labelledby="team-heading">
      <div className={about.teamIntro}>
        <p className={styles.eyebrow}>Our people</p>
        <h2 id="team-heading">The team behind the clean.</h2>
        <p>Trained, uniformed and equipped. These are the people who turn up at your door, and the same faces you will see next time.</p>
      </div>
      <Photo className={about.teamPhoto} src="/images/team/05-team-four.webp" alt="Four of the BOOM cleaning team in uniform" sizes="(max-width: 820px) 92vw, 52vw" />
    </section> : null}

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
      <Photo className={about.kitPhoto} src="/images/team/02-team-equipment.webp" alt="BOOM cleaning machines and equipment ready for a job" sizes="(max-width: 820px) 92vw, 30vw" />
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
      <TestimonialSlider testimonials={testimonials} />
    </section> : null}


    <section className={about.cta}>
      <h2>Tell us about your space.</h2>
      <p>Get a price in a few minutes, or call and talk it through with us.</p>
      <div className={about.ctaActions}>
        <Link className={styles.primary} href="/quote">Book a service <span aria-hidden="true">→</span></Link>
        <a className={styles.secondary} href="tel:+2349029799205">Call 0902 979 9205</a>
      </div>
    </section>

    <SiteFooter />
  </main>;
}
