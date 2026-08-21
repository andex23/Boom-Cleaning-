import Link from "next/link";
import { SiteFooter } from "@/components/public/SiteFooter";
import { SiteHeader } from "@/components/public/SiteHeader";
import shared from "../home.module.css";
import faq from "./faq.module.css";

export const metadata = {
  title: "Cleaning FAQs | BOOM Cleaning Services Abuja",
  description: "Answers about BOOM Cleaning Services pricing, coverage, teams, equipment and booking in Abuja.",
};

const groups = [
  {
    label: "Booking and coverage",
    questions: [
      ["Where does BOOM operate?", "BOOM serves homes, offices and newly completed spaces across Abuja. Choose your service area in the booking flow. A location outside the standard coverage can still be submitted, but the team will review it before confirming."],
      ["How do I book a cleaning service?", "Choose a service, describe the property and rooms, select an available date and time, then add your contact details. You will see a quote or a clear review notice before the request is submitted."],
      ["Can I request a preferred date and time?", "Yes. The booking flow shows the time slots currently available for the selected date. Your request is recorded with that slot so the BOOM team can confirm the visit."],
    ],
  },
  {
    label: "Prices and quotes",
    questions: [
      ["Are the prices on the website real?", "Yes. Published bedroom tiers and per-space prices are read from the same BOOM price tables used to calculate a booking quote. The amount changes only when the scope, location or selected service changes."],
      ["Why does a service sometimes say it needs review?", "Large compounds, unusual access, specialist areas or a space without a standard published price need a person to check the brief. BOOM records the request first and confirms the final amount after reviewing the scope."],
      ["How is post-construction cleaning priced?", "It is priced by the rooms and areas selected: bedrooms, living rooms, storeys, BQ rooms, penthouse and other rooms. Compound sweeping has a fixed starting price; washing a normal 500sqm compound is typically ₦70,000–₦100,000 and is confirmed from the scope."],
      ["How is fumigation priced?", "Fumigation has published prices from one to eight bedrooms. A one-room BQ is ₦30,000 and a two-room BQ is ₦50,000 when added to the property scope."],
    ],
  },
  {
    label: "The cleaning visit",
    questions: [
      ["Does BOOM bring cleaning supplies and equipment?", "Yes. The team is assigned with the supplies and professional equipment needed for the agreed service, including specialist machines when the brief requires them."],
      ["Who will come to my property?", "Uniformed BOOM cleaning professionals assigned to the job. The team receives the agreed scope and works to one BOOM standard from arrival through the final check."],
      ["What is included in deep cleaning?", "The standard scope covers detailed window, door, wardrobe and cabinet cleaning; floor scrubbing; kitchen and bathroom walls; WC and basin disinfection; shower and glass surfaces; and cleaning and polishing of fittings. Add upholstery or fumigation by choosing the matching package."],
      ["How long will the cleaning take?", "Timing depends on the service, room count, condition and access. A larger or post-construction property takes longer than a small home reset. The team works from the submitted scope so the right crew and equipment can be planned."],
    ],
  },
] as const;

export default function FaqPage() {
  return <main className={shared.page}>
    <SiteHeader priority />
    <section className={faq.hero} aria-labelledby="faq-heading">
      <p className={shared.eyebrow}>Questions, answered</p>
      <h1 data-reveal="heading" id="faq-heading">Everything to know before BOOM arrives.</h1>
      <p>Clear answers about prices, coverage, preparation and the team entering your space.</p>
      <Link className={shared.primary} href="/quote">Book a service <span aria-hidden="true">↗</span></Link>
    </section>

    <section className={faq.questions} aria-label="Frequently asked questions">
      {groups.map((group) => <section className={faq.group} key={group.label}>
        <div className={faq.groupTitle} data-reveal><p>{group.label}</p><span>{String(group.questions.length).padStart(2, "0")}</span></div>
        <div className={faq.list} data-reveal-stagger>{group.questions.map(([question, answer]) => <details key={question}>
          <summary><span>{question}</span><i aria-hidden="true">+</i></summary>
          <p>{answer}</p>
        </details>)}</div>
      </section>)}
    </section>

    <section className={faq.contact}>
      <div><p className={shared.eyebrow}>Still need an answer?</p><h2 data-reveal="heading">Talk to the BOOM team.</h2></div>
      <div>
        <p>Send the property details and the question you need resolved. We will help you choose the right service before you book.</p>
        {/* Instagram leads: it is where most customers actually reach BOOM. */}
        <div className={faq.contactActions} data-reveal>
          <a href="https://instagram.com/boomcleaningservices" target="_blank" rel="noreferrer">Message on Instagram <span aria-hidden="true">→</span></a>
          <a className={faq.contactSecondary} href="https://wa.me/2349029799205" target="_blank" rel="noreferrer">Ask on WhatsApp <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </section>
    <SiteFooter />
  </main>;
}
