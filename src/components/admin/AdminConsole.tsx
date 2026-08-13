"use client";

import { useState } from "react";
import {
  adminAreas,
  attentionItems,
  kpis,
  operationsSummary,
  recentEnquiries,
  todaySchedule,
  weeklyRevenue,
  type AdminArea,
  type BookingStatus,
} from "@/data/admin-demo";
import styles from "./AdminConsole.module.css";
import { BookingNotice } from "./BookingNotice";

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

function areaIcon(area: AdminArea): IconName {
  return ({ Overview: "grid", Bookings: "calendar", Leads: "users", Customers: "users", Jobs: "briefcase", Services: "sparkles", Payments: "card", Messages: "message", Reports: "chart" } as const)[area];
}

function statusClass(status: BookingStatus) {
  return status === "In progress" ? styles.inProgress : status === "Awaiting payment" ? styles.awaiting : styles.confirmed;
}

export default function AdminConsole() {
  const [activeArea, setActiveArea] = useState<AdminArea>("Overview");
  const [navOpen, setNavOpen] = useState(false);

  return <div className={styles.appShell}>
    <aside className={`${styles.sidebar} ${navOpen ? styles.sidebarOpen : ""}`} aria-label="Operations navigation">
      <div className={styles.brand}><span className={styles.brandMark}>B</span><span>BOOM<span>clean</span></span></div>
      <p className={styles.workspaceLabel}>OPERATIONS</p>
      <nav className={styles.navigation}>{adminAreas.map((area) => <button key={area} className={`${styles.navItem} ${activeArea === area ? styles.active : ""}`} onClick={() => { setActiveArea(area); setNavOpen(false); }}><Icon name={areaIcon(area)} /> <span>{area}</span>{area === "Leads" && <b>5</b>}</button>)}</nav>
      <div className={styles.sideFooter}><div className={styles.helpCard}><span className={styles.helpIcon}>?</span><div><strong>Need a hand?</strong><span>BOOM support is here</span></div><Icon name="arrow" size={15} /></div><div className={styles.user}><span className={styles.avatar}>AO</span><span><strong>Amaka Okafor</strong><small>Operations manager</small></span><Icon name="more" /></div></div>
    </aside>
    {navOpen && <button className={styles.backdrop} aria-label="Close navigation" onClick={() => setNavOpen(false)} />}
    <main className={styles.main}>
      <header className={styles.topbar}><div className={styles.mobileBrand}><button aria-label="Open navigation" className={styles.menuButton} onClick={() => setNavOpen(true)}><span /><span /><span /></button><span className={styles.brandMark}>b</span></div><div className={styles.location}><span className={styles.pulse} /> Abuja operations <span className={styles.dot} /> {operationsSummary.date}</div><div className={styles.topActions}><button className={styles.iconButton} aria-label="Notifications"><Icon name="bell" /><i /></button><button className={styles.newBooking}>+ New booking</button><form action="/api/admin/logout" method="post"><button className={styles.newBooking} type="submit">Sign out</button></form></div></header>
      <section className={styles.intro}><div><p>{operationsSummary.greeting}</p><h1>{operationsSummary.headline}</h1></div><span className={styles.updated}>{operationsSummary.lastUpdated}</span></section>
      <BookingNotice />
      <section className={styles.kpiGrid} aria-label="Daily performance">{kpis.map((item) => <article key={item.label} className={styles.kpi}><div className={styles.kpiHead}><span>{item.label}</span><b className={styles[item.tone]}>{item.trend}</b></div><strong>{item.value}</strong><p>{item.note}</p></article>)}</section>
      <section className={styles.contentGrid}>
        <article className={`${styles.card} ${styles.revenueCard}`}><div className={styles.cardHeading}><div><p className={styles.eyebrow}>THIS WEEK</p><h2>Revenue pulse</h2></div><button className={styles.quietButton}>This week <span>⌄</span></button></div><div className={styles.chartLegend}><strong>₦2.30m</strong><span><i /> 18.4% above last week</span></div><div className={styles.chart} aria-label="Revenue by day">{weeklyRevenue.map((bar) => <div key={bar.day} className={styles.chartColumn}><span className={bar.day === "Thu" ? styles.chartTip : styles.hiddenTip}>{bar.label}</span><i style={{ height: `${Math.max(18, (bar.value / 510) * 100)}%` }} className={bar.day === "Thu" ? styles.currentBar : ""} /><small>{bar.day}</small></div>)}</div></article>
        <article className={`${styles.card} ${styles.attentionCard}`}><div className={styles.cardHeading}><div><p className={styles.eyebrow}>DO NEXT</p><h2>Needs attention <b>3</b></h2></div><button className={styles.moreButton} aria-label="More attention options"><Icon name="more" /></button></div><div className={styles.attentionList}>{attentionItems.map((item) => <div className={styles.attentionRow} key={item.id}><span className={`${styles.attentionIcon} ${styles[item.kind.toLowerCase()]}`}>{item.kind === "Payment" ? "₦" : item.kind === "Reply" ? "↗" : "✦"}</span><div><strong>{item.title}</strong><small>{item.detail}</small><button>{item.action} <Icon name="arrow" size={13} /></button></div></div>)}</div></article>
      </section>
      <section className={styles.lowerGrid}>
        <article className={styles.card}><div className={styles.cardHeading}><div><p className={styles.eyebrow}>THURSDAY, 13 AUG</p><h2>Today’s schedule <span>{todaySchedule.length} of 8</span></h2></div><button className={styles.textButton}>View calendar <Icon name="arrow" size={14} /></button></div><div className={styles.scheduleList}>{todaySchedule.map((booking) => <div className={styles.scheduleRow} key={booking.id}><time>{booking.time}</time><span className={styles.customerAvatar}>{booking.initials}</span><div className={styles.bookingDetails}><strong>{booking.customer}</strong><span>{booking.service} <i /> {booking.address}</span></div><span className={styles.team}>{booking.team}</span><span className={`${styles.status} ${statusClass(booking.status)}`}>{booking.status}</span><button className={styles.rowMore} aria-label={`Options for ${booking.customer}`}><Icon name="more" /></button></div>)}</div></article>
        <article className={styles.card}><div className={styles.cardHeading}><div><p className={styles.eyebrow}>INBOX</p><h2>Recent enquiries <b>12</b></h2></div><button className={styles.textButton}>View all <Icon name="arrow" size={14} /></button></div><div className={styles.enquiryList}>{recentEnquiries.map((lead) => <div className={styles.enquiryRow} key={lead.id}><span className={styles.leadAvatar}>{lead.initials}</span><div><strong>{lead.customer}</strong><span>{lead.service}</span><small>{lead.source} · {lead.received}</small></div><span className={styles.leadValue}>{lead.value}</span></div>)}</div></article>
      </section>
    </main>
  </div>;
}
