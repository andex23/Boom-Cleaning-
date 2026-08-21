import Link from "next/link";
import { Photo } from "@/components/public/Photo";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import styles from "../home.module.css";
import about from "./about.module.css";
import { Arrow } from "@/components/brand/Arrow";

export const metadata = {
  title: "About BOOM Cleaning Services | Abuja",
  description: "Meet the Abuja cleaning company built around prepared teams, clear service scopes and professional equipment.",
};

const standards = [
  ["A clear scope before arrival", "We ask about every room, surface and extra before the day, so the team knows the job and your price reflects the actual space."],
  ["A team chosen for the work", "Each booking is assigned to trained BOOM staff with the right experience and equipment—not handed to an unknown subcontractor."],
  ["A final check before we leave", "The work is reviewed against the agreed scope, and you still have a clear line back to BOOM afterwards."],
] as const;

const equipment = [
  ["Wet and dry vacuums", "For fine dust, debris and standing water."],
  ["Floor scrubbers and polishers", "For a consistent finish on tiled and stone floors."],
  ["Upholstery extractors", "For sofas, mattresses, chairs and rugs that need more than a surface wipe."],
  ["Air movers", "For faster drying so cleaned floors and fabrics return to use sooner."],
  ["Fumigation foggers", "For practical pest treatment where the service calls for it."],
] as const;

export default function AboutPage() {
  return <main className={styles.page}>
    <SiteHeader priority />

    <section className={about.hero} aria-labelledby="about-heading" style={{ backgroundImage: "url('/images/team/08-cleaner-portrait.webp')" }}>
      <div className={about.heroShade} />
      <div className={about.heroCopy}>
        <p className={styles.eyebrow}>About BOOM</p>
        <h1 data-reveal="heading" id="about-heading">A cleaning company built to show up prepared.</h1>
        <p>BOOM Cleaning Services serves homes, offices and newly completed spaces across Abuja. We built the company around a simple belief: professional cleaning should feel organised before anyone reaches your door.</p>
        <div className={about.heroActions}>
          <Link className={styles.primary} href="/quote">Book a service <Arrow direction="up-right" /></Link>
          <Link className={styles.secondary} href="#team">Meet the team <Arrow /></Link>
        </div>
      </div>
    </section>

    <section className={about.belief} aria-label="Our approach">
      <p>Our approach</p>
      <h2 data-reveal="heading">We do not treat every space like the same job.</h2>
      <p>A one-bedroom reset, an occupied family home and a post-construction property need different time, tools and attention. BOOM scopes the work properly, prices what is actually required and sends a team prepared for that brief.</p>
    </section>

    <section className={about.standards} aria-labelledby="standards-heading">
      <div className={about.sectionLead}>
        <p className={styles.eyebrow}>The BOOM standard</p>
        <h2 data-reveal="heading" id="standards-heading">Care you can see in the process.</h2>
      </div>
      <ol data-reveal-stagger>{standards.map(([title, copy], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol>
    </section>

    <section className={about.equipment} aria-labelledby="equipment-heading">
      <div className={about.equipmentIntro}>
        <p className={styles.eyebrow}>Professional equipment</p>
        <h2 data-reveal="heading" id="equipment-heading">The right machine changes the result.</h2>
        <p>A thorough clean is not just more effort. It is knowing which method and equipment suit the surface, the material and the condition of the space.</p>
      </div>
      <ul data-reveal-stagger>{equipment.map(([name, use]) => <li key={name}><strong>{name}</strong><span>{use}</span></li>)}</ul>
    </section>

    <section className={about.people} id="team" aria-labelledby="people-heading">
      <div className={about.peopleIntro}>
        <p className={styles.eyebrow}>The people behind BOOM</p>
        <h2 data-reveal="heading" id="people-heading">The uniform matters because accountability matters.</h2>
        <p>The team entering your space represents BOOM from arrival to final check. They know the brief, carry the right setup and work to one company standard.</p>
      </div>
      <div className={about.peopleGrid} data-reveal-stagger>
        <figure>
          <Photo src="/images/team/05-team-four.webp" alt="Four BOOM cleaning professionals in uniform" sizes="(max-width: 700px) 100vw, 33vw" fill />
        </figure>
        <figure>
          <Photo src="/images/team/04-team-portrait.webp" alt="A BOOM cleaning professional in uniform" sizes="(max-width: 700px) 100vw, 33vw" fill />
        </figure>
      </div>
    </section>

    <section className={about.cta}>
      <p className={styles.eyebrow}>Ready when you are</p>
      <h2 data-reveal="heading">Tell us what needs cleaning.</h2>
      <p>Choose a service, describe your space and request a time in one clear flow.</p>
      <Link className={styles.primary} href="/quote">Start your booking <Arrow direction="up-right" /></Link>
    </section>

    <SiteFooter />
  </main>;
}
