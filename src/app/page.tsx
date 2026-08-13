import Image from "next/image";
import Link from "next/link";
import styles from "./home.module.css";

const services = [
  ["01", "Deep cleaning", "Homes reset with considered room-by-room care.", "deep-cleaning", "/images/services/deep-cleaning.png"],
  ["02", "Post-construction", "Fine dust, debris and finishing work handled properly.", "post-construction", "/images/services/post-construction.png"],
  ["03", "Move-in cleaning", "A fresh, ready space before the first box arrives.", "move-in-move-out", "/images/services/move-in.png"],
  ["04", "Upholstery", "Sofas, mattresses and soft furnishings revived.", "upholstery-care", "/images/services/upholstery.png"],
  ["05", "Office cleaning", "Flexible care for productive Abuja workspaces.", "office-cleaning", "/images/services/office-cleaning.png"],
  ["06", "Fumigation", "Practical pest control for homes and businesses.", "fumigation", "/images/services/fumigation.png"],
] as const;

const steps = [
  ["01", "Tell us what you need", "Choose a service and share a few details about your space."],
  ["02", "Pick a time that works", "Select a preferred date. We confirm capacity before you pay."],
  ["03", "Relax while we handle it", "Your team arrives prepared and keeps you updated to completion."],
] as const;

export default function Home() {
  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="BOOM Cleaning home">BOOM<span>✦</span><small>Cleaning Services</small></Link>
      <nav aria-label="Primary navigation"><Link href="/services">Services</Link><a href="#process">How it works</a><a href="#about">About</a></nav>
      <Link className={styles.headerCta} href="/quote">Book a service <span>→</span></Link>
    </header>

    <section className={styles.hero}>
      <div className={styles.heroCopy}><h1>A cleaner home,<br />without the <em>back-and-forth.</em></h1><p>Professional cleaning in Abuja, on your terms. Choose your service, select an available time, and confirm your booking in one simple flow.</p><div className={styles.heroActions}><Link href="/quote" className={styles.primary}>Book a service <span>→</span></Link><Link href="/services" className={styles.secondary}>Explore services</Link></div><p className={styles.location}>⌖ Proudly serving Abuja and surrounding areas</p></div>
      <div className={styles.heroImage}><Image src="/images/boom-cleaning-hero-v2.png" alt="A BOOM cleaner in the brand's blue uniform caring for a contemporary Abuja living room" fill priority sizes="(max-width: 800px) 100vw, 52vw" /></div>
    </section>

    <section className={styles.services} id="services"><div className={styles.sectionIntro}><p>Our services</p><h2>Every space.<br />Carefully cleaned.</h2><span>Choose the clean you need and go straight to available booking times.</span><Link href="/services">View all services →</Link></div><div className={styles.serviceList}>{services.map(([number, name, description, slug, image]) => <Link href={`/quote?service=${slug}`} className={styles.serviceRow} key={name} aria-label={`Book ${name}`}><div className={styles.serviceImage}><Image src={image} alt={`${name} by BOOM Cleaning Services`} fill sizes="(max-width: 850px) 100vw, 32vw" /></div><div className={styles.serviceDetails}><small>{number}</small><div><h3>{name}</h3><p>{description}</p></div><span className={styles.bookAction}>Book →</span></div></Link>)}</div></section>

    <section className={styles.process} id="process"><div><p>How it works</p><h2>Simple. Clear.<br />Built around you.</h2></div><ol>{steps.map(([number, title, body]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></li>)}</ol></section>

    <section className={styles.quoteBand}><div><p>Book your clean</p><h2>Choose a service.<br />Pick a time.</h2></div><div><p>See the price, choose an available date and time, then confirm the appointment—all in one straightforward booking flow.</p><Link className={styles.primary} href="/quote">Start booking <span>→</span></Link></div></section>

    <section className={styles.promise} id="about"><h2>Care you can feel<br />after we leave.</h2><div><article><span>01</span><h3>Trusted professionals</h3><p>Every job is assigned deliberately, with clear service notes and accountability.</p></article><article><span>02</span><h3>Safe for your space</h3><p>We adapt our approach to the people, pets, materials and requirements in your home.</p></article><article><span>03</span><h3>On time, every time</h3><p>Confirmed schedules, helpful reminders and a team that knows what is expected.</p></article></div></section>

    <footer className={styles.footer}><div className={styles.brand}>BOOM<span>✦</span><small>Cleaning Services</small></div><p>Making homes and workspaces cleaner, healthier and better places to be.</p><div><Link href="/services">Services</Link><Link href="/quote">Book a service</Link><Link href="/admin">Staff operations</Link></div><small>Abuja, FCT, Nigeria · BOOM Cleaning Services</small></footer>
  </main>;
}
