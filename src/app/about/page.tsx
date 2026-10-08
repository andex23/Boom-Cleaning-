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
  ["Before arrival", "A clear scope", "We ask about every room, surface and extra before the day, so the team understands the space and the price reflects the actual work."],
  ["On the day", "The right setup", "The BOOM team arrives in uniform with the equipment and supplies selected for the service you booked."],
  ["Before we leave", "A final check", "We review the work against the agreed scope and leave you with a clear line back to BOOM afterwards."],
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

    <section className={about.hero} aria-labelledby="about-heading">
      <div className={about.heroCopy}>
        <p className={styles.pill}>About BOOM</p>
        <h1 data-reveal="heading" id="about-heading">Built around a team that arrives prepared.</h1>
        <p>BOOM Cleaning Services serves homes, offices and newly completed spaces across Abuja. We scope the work first, bring the right setup and keep one company accountable for the result.</p>
        <div className={about.heroActions}>
          <Link className={styles.primary} href="/quote">Book a service <Arrow direction="up-right" /></Link>
          <Link className={styles.secondary} href="#our-standard">How we work <Arrow /></Link>
        </div>
        <ul className={about.heroFacts} aria-label="BOOM at a glance">
          <li><strong>Abuja</strong><span>Based in the FCT</span></li>
          <li><strong>One team</strong><span>From brief to final check</span></li>
          <li><strong>Prepared</strong><span>Equipment matched to the job</span></li>
        </ul>
      </div>
      <figure className={about.heroMedia}>
        <Photo className={about.heroPhoto} src="/images/team/06-team-onsite.webp" alt="BOOM Cleaning team members on location at a property in Abuja" sizes="(max-width: 700px) 100vw, 48vw" position="center 52%" fill priority />
        <figcaption><span>BOOM Cleaning Services</span> On location in Abuja.</figcaption>
      </figure>
    </section>

    <section className={about.belief} aria-label="Our approach">
      <div className={about.beliefLabel}><span>Our approach</span><small>Abuja, FCT</small></div>
      <h2 data-reveal="heading">We prepare for the exact space—not a generic job.</h2>
      <div className={about.beliefCopy}>
        <p>A one-bedroom reset, an occupied family home and a post-construction property need different time, tools and attention.</p>
        <p>That is why the brief comes first. We price what is actually required and send a team prepared for that work.</p>
      </div>
    </section>

    <section className={about.standards} id="our-standard" aria-labelledby="standards-heading">
      <div className={about.sectionLead}>
        <p className={styles.pill}>The BOOM standard</p>
        <h2 data-reveal="heading" id="standards-heading">A clear standard from first message to final check.</h2>
        <p>Three stages keep the service organised and give you a clear point of accountability throughout.</p>
      </div>
      <ol data-reveal-stagger>{standards.map(([stage, title, copy], index) => <li key={stage}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{stage}</small><h3>{title}</h3><p>{copy}</p></div></li>)}</ol>
    </section>

    <section className={about.equipment} id="equipment" aria-labelledby="equipment-heading">
      <figure className={about.equipmentMedia}>
        <Photo src="/images/team/04-team-portrait.webp" alt="Four BOOM team members with floor, upholstery and fumigation equipment" sizes="(max-width: 900px) 100vw, 48vw" data-reveal="photo" />
        <figcaption>BOOM team members with the machines used across our specialist services.</figcaption>
      </figure>
      <div className={about.equipmentPanel}>
        <div className={about.equipmentIntro}>
          <p className={styles.pill}>Professional equipment</p>
          <h2 data-reveal="heading" id="equipment-heading">The right machine changes the result.</h2>
          <p>A thorough clean is not just more effort. It is knowing which method and equipment suit the surface, material and condition of the space.</p>
        </div>
        <ul data-reveal-stagger>{equipment.map(([name, use]) => <li key={name}><strong>{name}</strong><span>{use}</span></li>)}</ul>
      </div>
    </section>

    <section className={about.people} id="team" aria-labelledby="people-heading">
      <div className={about.peopleIntro}>
        <p className={styles.pill}>The people behind BOOM</p>
        <h2 data-reveal="heading" id="people-heading">A real team, visible in the work.</h2>
        <p>The people entering your space represent BOOM from arrival to final check. They know the brief, carry the setup and work to one company standard.</p>
      </div>
      <div className={about.peopleGrid} data-reveal-stagger>
        <figure className={about.teamWide}>
          <Photo src="/images/team/01-team-wide.webp" alt="The full BOOM Cleaning team standing in uniform with professional equipment" sizes="(max-width: 700px) 100vw, 78vw" data-reveal="photo" />
          <figcaption><span>The full team</span> Uniformed, equipped and ready for the brief.</figcaption>
        </figure>
        <figure className={about.teamPortrait}>
          <Photo src="/images/team/05-team-four.webp" alt="Three BOOM Cleaning team members with cleaning machines and supplies" sizes="(max-width: 700px) 100vw, 38vw" data-reveal="photo" />
          <figcaption><span>Specialist setup</span> The people and machines behind the service.</figcaption>
        </figure>
        <figure className={about.teamSupplies}>
          <Photo src="/images/team/07-team-supplies.webp" alt="Three cleaning team members holding organised trays of cleaning supplies" sizes="(max-width: 700px) 100vw, 48vw" data-reveal="photo" />
          <figcaption><span>Prepared supplies</span> The service starts with an organised setup.</figcaption>
        </figure>
      </div>
    </section>

    <section className={about.cta}>
      <div>
        <p className={styles.pill}>Ready when you are</p>
        <h2 data-reveal="heading">Tell us about the space. We will prepare for the work.</h2>
      </div>
      <div className={about.ctaAction}>
        <p>Choose a service, describe your space and request a time in one clear flow.</p>
        <Link className={styles.primary} href="/quote">Start your booking <Arrow direction="up-right" /></Link>
      </div>
    </section>

    <SiteFooter />
  </main>;
}
