import Image from "next/image";
import Link from "next/link";
import type { PublicServiceView } from "@/features/services/public-catalog";
import styles from "./ServiceCatalog.module.css";
import { Arrow } from "@/components/brand/Arrow";

export function ServiceCatalog({ services }: { services: PublicServiceView[] }) {
  return <section className={styles.section} aria-labelledby="service-heading">
    <div className={styles.intro}>
      <p className={styles.eyebrow}>BOOM services</p>
      <h1 data-reveal="heading" id="service-heading">Choose the clean that matches the job.</h1>
      <p>Every service below is live and bookable. Choose one to see the real scope, pricing options and available times for your space.</p>
      <Link href="/quote" className={styles.introLink}>Not sure what to choose? Start here <Arrow /></Link>
    </div>
    <div className={styles.grid} data-reveal-stagger>{services.map((service) => <article className={styles.card} key={service.id}>
      <Link href={`/quote?service=${service.slug}`} className={styles.media} aria-label={`Book ${service.name}`}>
        <Image src={service.image} alt="" fill sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw" />
      </Link>
      <div className={styles.cardBody}>
        <p className={styles.category}>{service.category}</p>
        <h2>{service.name}</h2>
        <p>{service.summary}</p>
        <div className={styles.meta}><span>{service.duration}</span><strong>{service.priceLabel}</strong></div>
        <Link href={`/quote?service=${service.slug}`} className={styles.link}>Book this service <Arrow direction="up-right" /></Link>
      </div>
    </article>)}</div>
  </section>;
}
