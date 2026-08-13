import Link from "next/link";
import { formatNaira, publicServices } from "@/data/public-demo";
import { ServiceIcon } from "./ServiceIcon";
import styles from "./ServiceCatalog.module.css";

export function ServiceCatalog() {
  return <section className={styles.section} aria-labelledby="service-heading">
    <div className={styles.intro}><p className={styles.eyebrow}>What we clean</p><h1 id="service-heading">A better kind of clean.</h1><p>From a weekly reset to the last detail after construction, every BOOM service starts with a clear scope and a team that arrives prepared.</p></div>
    <div className={styles.grid}>{publicServices.map((service) => <article className={styles.card} key={service.id}>
      <div className={styles.icon}><ServiceIcon icon={service.icon} /></div><div><h2>{service.name}</h2><p>{service.summary}</p></div>
      <div className={styles.meta}><span>{service.duration}</span><strong>{service.priceFrom ? `From ${formatNaira(service.priceFrom)}` : "Bespoke quote"}</strong></div>
      <Link href={`/quote?service=${service.slug}`} className={styles.link}>Get a quote <span aria-hidden="true">↗</span></Link>
    </article>)}</div>
  </section>;
}
