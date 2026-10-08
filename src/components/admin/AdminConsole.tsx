"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { adminAreas, adminRoutes, adminAreaForPath, type AdminArea } from "@/data/admin-navigation";
import styles from "./AdminConsole.module.css";

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
const descriptions: Record<AdminArea, string> = {
  Overview: "Your bookings, payments and website at a glance.",
  Inbox: "Customer enquiries and contact details, in one place.",
  Bookings: "Appointments, service details and booking status.",
  Customers: "Customer contacts and booking history.",
  Payments: "Payment records and verification.",
  Analytics: "See how people find and use your website.",
  Services: "Manage your services and published prices.",
  Integrations: "Connections to other platforms.",
};
function areaIcon(area: AdminArea): IconName {
  return ({ Overview: "grid", Bookings: "calendar", Inbox: "message", Customers: "users", Services: "sparkles", Payments: "card", Analytics: "chart", Integrations: "briefcase" } as const)[area];
}

export default function AdminConsole({ children, logoSrc, logoLightSrc }: { children: React.ReactNode; logoSrc: string; logoLightSrc: string }) {
  const activeArea = adminAreaForPath(usePathname()) ?? "Overview";
  const [navOpen, setNavOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!navOpen) return;
    const controls = Array.from(navigation.current?.querySelectorAll<HTMLElement>("a,button") ?? []);
    controls[0]?.focus();
    const onKey = (event:KeyboardEvent) => {
      if (event.key === "Escape") { setNavOpen(false); menuButton.current?.focus(); }
      if (event.key === "Tab" && controls.length) {
        const first=controls[0],last=controls[controls.length-1];
        if (event.shiftKey && document.activeElement===first) {event.preventDefault();last.focus();}
        else if (!event.shiftKey && document.activeElement===last) {event.preventDefault();first.focus();}
      }
    };
    window.addEventListener("keydown",onKey);
    return () => window.removeEventListener("keydown",onKey);
  },[navOpen]);

  return <div className={styles.appShell} data-admin-theme="boom">
    <aside ref={navigation} id="admin-navigation" className={`${styles.sidebar} ${navOpen ? styles.sidebarOpen : ""}`} aria-label="Operations navigation">
      <div className={styles.brand}><Image src={logoSrc} width={148} height={72} alt="BOOM Cleaning Services" priority /></div>
      <button className={styles.drawerClose} aria-label="Close navigation" onClick={() => {setNavOpen(false);menuButton.current?.focus();}}>Close ×</button>
      <p className={styles.workspaceLabel}>Workspace</p>
      <nav className={styles.navigation}>{adminAreas.map((area) => <Link href={adminRoutes[area]} key={area} aria-current={activeArea === area ? "page" : undefined} className={`${styles.navItem} ${activeArea === area ? styles.active : ""}`} onClick={() => { setNavOpen(false); }}><Icon name={areaIcon(area)} /> <span>{area}</span></Link>)}</nav>
      <div className={styles.sideFooter}><Link className={styles.websiteLink} href="/" target="_blank">View website <Icon name="arrow" size={15} /></Link><div className={styles.user}><span className={styles.avatar}>B</span><span><strong>BOOM admin</strong><small>Abuja, Nigeria</small></span></div></div>
    </aside>
    {navOpen && <button className={styles.backdrop} aria-label="Close navigation" onClick={() => setNavOpen(false)} />}
    <main className={styles.main} inert={navOpen}>
      <header className={styles.topbar}><div className={styles.mobileBrand}><button ref={menuButton} aria-label={navOpen ? "Close navigation" : "Open navigation"} aria-expanded={navOpen} aria-controls="admin-navigation" className={styles.menuButton} onClick={() => setNavOpen(value => !value)}><span /><span /><span /></button><Image src={logoLightSrc} width={36} height={36} alt="BOOM Cleaning Services" /></div><div className={styles.location}>BOOM / {activeArea} <span className={styles.dot}>·</span> {new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", weekday: "long", day: "numeric", month: "long" }).format(new Date())}</div><div className={styles.topActions}><Link className={styles.newBooking} href="/quote" target="_blank" rel="noreferrer">Book for a customer</Link><form action="/api/admin/logout" method="post"><button className={styles.newBooking} type="submit" data-sign-out>Sign out</button></form></div></header>
      <section className={styles.intro}><div><h1>{activeArea}</h1><p>{descriptions[activeArea]}</p></div></section>
      {children}
    </main>
  </div>;
}
