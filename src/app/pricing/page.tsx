import Link from "next/link";
import { SiteFooter } from "@/components/public/SiteFooter";
import { SiteHeader } from "@/components/public/SiteHeader";
import { formatNaira } from "@/lib/format";
import { listPublicPricing, type PublicPricingCard, type PublicSpacePrice } from "@/features/pricing/public-pricing";
import shared from "../home.module.css";
import pricing from "./pricing.module.css";

export const metadata = {
  title: "Cleaning prices in Abuja | BOOM Cleaning Services",
  description: "See BOOM's published deep-cleaning, fumigation and post-construction cleaning prices, then build a confirmed quote for your space.",
};
export const dynamic = "force-dynamic";

const TIERED_SLUGS = [
  "deep-cleaning",
  "deep-cleaning-upholstery",
  "deep-cleaning-fumigation",
  "deep-cleaning-upholstery-fumigation",
  "fumigation",
];

function priceForSpace(space: PublicSpacePrice) {
  if (space.slug === "compound-wash") return `${formatNaira(70000)}–${formatNaira(100000)}`;
  return space.unitPrice === null ? "Scope required" : formatNaira(space.unitPrice);
}

function TierCard({ service }: { service: PublicPricingCard }) {
  const bq = service.spacePrices.find((space) => space.slug === "boys-quarters" && space.priceTiers.length);
  return <article className={pricing.priceCard}>
    <div className={pricing.cardHead}>
      <div><p>{service.category}</p><h3>{service.name}</h3></div>
      <span>{service.priceLabel}</span>
    </div>
    <p className={pricing.cardSummary}>{service.summary}</p>
    <details className={pricing.tierDisclosure}>
      <summary>View bedroom prices <span aria-hidden="true">+</span></summary>
      <ul className={pricing.tierList} aria-label={`${service.name} bedroom prices`}>
        {service.bedroomTiers.map((tier) => <li key={tier.bedrooms}><span>{tier.bedrooms} bedroom{tier.bedrooms === 1 ? "" : "s"}</span><strong>{formatNaira(tier.price)}</strong></li>)}
      </ul>
      {bq ? <div className={pricing.addOn}>
        <p>BQ add-on</p>
        {bq.priceTiers.map((tier) => <span key={tier.quantity}>{tier.quantity} room{tier.quantity === 1 ? "" : "s"} <strong>{formatNaira(tier.price)}</strong></span>)}
      </div> : null}
    </details>
    <Link className={pricing.cardCta} href={`/quote?service=${service.slug}`}>Price my space <span aria-hidden="true">→</span></Link>
  </article>;
}

export default async function PricingPage() {
  const services = await listPublicPricing();
  const tiered = TIERED_SLUGS.map((slug) => services.find((service) => service.slug === slug)).filter((service): service is PublicPricingCard => Boolean(service));
  const postConstruction = services.find((service) => service.slug === "post-construction-cleaning");

  return <main className={shared.page}>
    <SiteHeader priority />

    <section className={pricing.hero} aria-labelledby="pricing-heading">
      <p className={shared.eyebrow}>Clear BOOM pricing</p>
      <h1 id="pricing-heading">Straightforward prices for a properly scoped clean.</h1>
      <p>Choose a service to see its published rates, then tell us about your space for the confirmed total.</p>
      <div className={pricing.heroActions}>
        <Link className={shared.primary} href="/quote">Build my quote <span aria-hidden="true">↗</span></Link>
      </div>
    </section>

    <section className={pricing.priceSection} id="price-list" aria-labelledby="home-prices-heading">
      <div className={pricing.sectionLead}>
        <div><p className={shared.eyebrow}>Home packages</p><h2 id="home-prices-heading">Choose the clean you need.</h2></div>
        <p>Open a package only when you want to compare its bedroom prices.</p>
      </div>
      <div className={pricing.cardGrid}>{tiered.map((service) => <TierCard key={service.id} service={service} />)}</div>
    </section>

    {postConstruction ? <section className={pricing.construction} aria-labelledby="construction-heading">
      <div className={pricing.constructionCopy}>
        <p className={shared.eyebrow}>Post-construction cleaning</p>
        <h2 id="construction-heading">Priced by the spaces in the building.</h2>
        <p>Tell us how many bedrooms, living rooms, storeys and extra areas are in the completed property. Your quote adds only the spaces you select.</p>
        <Link className={shared.primary} href="/quote?service=post-construction-cleaning">Build this quote <span aria-hidden="true">↗</span></Link>
      </div>
      <div className={pricing.unitCard}>
        <div className={pricing.unitCardHead}><span>Space</span><span>Price</span></div>
        <ul>{postConstruction.spacePrices.map((space) => <li key={space.slug}>
          <span><strong>{space.name}</strong><small>{space.slug === "compound-wash" ? "Normal 500sqm compound; final amount confirmed by scope." : space.description}</small></span>
          <b>{priceForSpace(space)}{space.slug !== "compound-wash" ? " each" : ""}</b>
        </li>)}</ul>
      </div>
    </section> : null}

    <SiteFooter />
  </main>;
}
