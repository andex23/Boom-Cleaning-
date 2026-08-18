"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { adminAreas, type AdminArea } from "@/data/admin-demo";
import styles from "./AdminConsole.module.css";
import "./AdminConsole.brand.css";
import { BookingBreakdowns } from "./BookingBreakdowns";
import { PricingAdmin } from "./PricingAdmin";
import { OperationsOverview } from "./OperationsOverview";
import { LeadsPanel } from "./LeadsPanel";
import { CustomersPanel } from "./CustomersPanel";
import { ComingSoonPanel } from "./ComingSoonPanel";
import type { InstagramConnectionStatus } from "@/features/instagram/config";
import { InstagramStatus } from "./InstagramStatus";

type IconName = "grid" | "calendar" | "users" | "briefcase" | "sparkles" | "card" | "message" | "chart" | "arrow" | "bell" | "more";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  const paths: Record<IconName, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
    sparkles: <><path d="m12 3-1.6 4.9L6 9.5l4.4 1.6L12 16l1.6-4.9L18 9.5l-4.4-1.6L12 3ZM19 16l-.8 2.2L16 19l2.2.8L19 22l.8-2.2L22 19l-2.2-.8L19 16Z" /></>,
    card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h2" /></>,
    message: <><path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.8 9.8 0 0 1-4.3-1L3 20l1.3-4A8.1 8.1 0 0 1 3 11.5a8.4 8.4 0 0 1 9-8.5 8.4 8.4 0 0 1 9 8.5Z" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

/** The page heading should describe the area you are actually looking at. */
function areaHeadline(area: AdminArea) {
  return ({
    Overview: "Here’s how BOOM is moving today.",
    Bookings: "Every booking, and how its price was reached.",
    Services: "What customers pay.",
    Leads: "People who asked about BOOM.",
    Customers: "The people BOOM cleans for.",
    Jobs: "Work on the ground.",
    Payments: "Money in and out.",
    Messages: "Conversations with customers.",
    Reports: "How the business is performing.",
  } as const)[area];
}

function areaIcon(area: AdminArea): IconName {
  return ({ Overview: "grid", Bookings: "calendar", Leads: "users", Customers: "users", Jobs: "briefcase", Services: "sparkles", Payments: "card", Messages: "message", Reports: "chart" } as const)[area];
}

export default function AdminConsole({ instagramStatus, logoSrc, logoLightSrc }: { instagramStatus: InstagramConnectionStatus; logoSrc: string; logoLightSrc: string }) {
  const [activeArea, setActiveArea] = useState<AdminArea>("Overview");
  const [navOpen, setNavOpen] = useState(false);

  return <div className={styles.appShell} data-admin-theme="boom">
    <aside className={`${styles.sidebar} ${navOpen ? styles.sidebarOpen : ""}`} aria-label="Operations navigation">
      <div className={styles.brand}><Image src={logoSrc} width={44} height={44} alt="BOOM Cleaning Services" priority /><span><strong>BOOM</strong><small>Cleaning Services</small></span></div>
      <p className={styles.workspaceLabel}>OPERATIONS</p>
      <nav className={styles.navigation}>{adminAreas.map((area) => <button key={area} className={`${styles.navItem} ${activeArea === area ? styles.active : ""}`} onClick={() => { setActiveArea(area); setNavOpen(false); }}><Icon name={areaIcon(area)} /> <span>{area}</span></button>)}</nav>
      <div className={styles.sideFooter}><a className={styles.helpCard} href="tel:+2349029799205"><span className={styles.helpIcon}>?</span><div><strong>Need a hand?</strong><span>Call BOOM support</span></div><Icon name="arrow" size={15} /></a><div className={styles.user}><span className={styles.avatar}>B</span><span><strong>BOOM admin</strong><small>Signed in</small></span><Icon name="more" /></div></div>
    </aside>
    {navOpen && <button className={styles.backdrop} aria-label="Close navigation" onClick={() => setNavOpen(false)} />}
    <main className={styles.main}>
      <header className={styles.topbar}><div className={styles.mobileBrand}><button aria-label="Open navigation" className={styles.menuButton} onClick={() => setNavOpen(true)}><span /><span /><span /></button><Image src={logoLightSrc} width={36} height={36} alt="BOOM Cleaning Services" /></div><div className={styles.location}><span className={styles.pulse} /> Abuja operations <span className={styles.dot} /> {new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", weekday: "long", day: "numeric", month: "long" }).format(new Date())}</div><div className={styles.topActions}><Link className={styles.newBooking} href="/quote" target="_blank" rel="noreferrer">+ New booking</Link><form action="/api/admin/logout" method="post"><button className={styles.newBooking} type="submit" data-sign-out>Sign out</button></form></div></header>
      <section className={styles.intro}><div><p>BOOM operations</p><h1>{areaHeadline(activeArea)}</h1></div></section>
      {activeArea === "Services" ? <PricingAdmin />
        : activeArea === "Bookings" ? <BookingBreakdowns />
        : activeArea === "Leads" ? <LeadsPanel />
        : activeArea === "Customers" ? <CustomersPanel />
        : activeArea === "Overview" ? <OperationsOverview><InstagramStatus status={instagramStatus} /></OperationsOverview>
        : <ComingSoonPanel area={activeArea} />}
    </main>
  </div>;
}
