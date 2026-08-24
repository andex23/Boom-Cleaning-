"use client";

import { useEffect, useState } from "react";
import { formatNaira, formatSlotTime } from "@/lib/format";
import type { OperationsOverview as Overview } from "@/features/operations/overview";
import styles from "./AdminConsole.module.css";
import panel from "./PricingAdmin.module.css";
import { adminErrorMessage, adminFetch, SESSION_EXPIRED_MESSAGE } from "./adminFetch";

const statusLabels: Record<string, string> = {
  PENDING: "Pending", CONFIRMED: "Confirmed", IN_PROGRESS: "In progress",
  COMPLETED: "Completed", CANCELLED: "Cancelled", NO_SHOW: "No show",
  NEW: "New", QUALIFYING: "Qualifying", QUALIFIED: "Qualified",
  QUOTE_SENT: "Quote sent", AWAITING_PAYMENT: "Awaiting payment", BOOKED: "Booked", LOST: "Lost",
};
const label = (value: string) => statusLabels[value] ?? value;

function statusClass(status: string) {
  if (status === "IN_PROGRESS") return styles.inProgress;
  if (status === "PENDING") return styles.awaiting;
  return styles.confirmed;
}

/** The console overview, built entirely from live operational data. */
/** An expired session needs a way out, not just a red sentence. */
function AdminError({ message }: { message: string }) {
  const expired = message === SESSION_EXPIRED_MESSAGE;
  return <article className={panel.panel}>
    <p className={panel.error} role="alert">{message}</p>
    {expired ? <form action="/api/admin/logout" method="post"><button className={panel.save} type="submit">Sign in again</button></form> : null}
  </article>;
}

export function OperationsOverview({ children }: { children?: React.ReactNode }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await adminFetch("/api/admin/overview");
        if (!response.ok) throw new Error("overview");
        if (!cancelled) setData(await response.json() as Overview);
      } catch (loadError) {
        if (!cancelled) setError(adminErrorMessage(loadError, "We couldn’t load today’s figures. Refresh to try again."));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (error) return <AdminError message={error} />;
  if (!data) return <article className={panel.panel}><p className={panel.muted}>Loading today’s figures…</p></article>;

  const peak = Math.max(...data.weeklyRevenue.map((bar) => bar.value), 1);

  return <>
    {children}
    <section className={styles.kpiGrid} aria-label="Daily performance">{data.kpis.map((item) => <article key={item.label} className={styles.kpi}>
      <div className={styles.kpiHead}><span>{item.label}</span></div><strong>{item.value}</strong><p>{item.note}</p>
    </article>)}</section>

    <section className={styles.contentGrid}>
      <article className={`${styles.card} ${styles.revenueCard}`}>
        <div className={styles.cardHeading}><div><p className={styles.eyebrow}>THIS WEEK</p><h2>Revenue pulse</h2></div></div>
        <div className={styles.chartLegend}><strong>{formatNaira(data.weeklyRevenueTotal)}</strong><span>{data.weeklyRevenueTotal ? "Booked so far this week" : "No bookings this week yet"}</span></div>
        <div className={styles.chart} aria-label="Revenue by day">{data.weeklyRevenue.map((bar) => <div key={bar.day} className={styles.chartColumn}>
          <span className={bar.value > 0 ? styles.chartTip : styles.hiddenTip}>{formatNaira(bar.value)}</span>
          <i style={{ height: `${Math.max(4, (bar.value / peak) * 100)}%` }} className={bar.date === data.today ? styles.currentBar : ""} />
          <small>{bar.day}</small>
        </div>)}</div>
      </article>

      <article className={`${styles.card} ${styles.attentionCard}`}>
        <div className={styles.cardHeading}><div><p className={styles.eyebrow}>DO NEXT</p><h2>Needs attention {data.attention.length ? <b>{data.attention.length}</b> : null}</h2></div></div>
        <div className={styles.attentionList}>{data.attention.length
          ? data.attention.map((item) => <div className={styles.attentionRow} key={item.id}>
              <span className={styles.attentionIcon}>{item.kind === "Pricing" ? "₦" : item.kind === "Confirm" ? "✓" : "✦"}</span>
              <div><strong>{item.title}</strong><small>{item.detail}</small></div>
            </div>)
          : <p className={panel.muted}>Nothing needs attention right now.</p>}</div>
      </article>
    </section>

    <section className={styles.lowerGrid}>
      <article className={styles.card}>
        <div className={styles.cardHeading}><div><p className={styles.eyebrow}>TODAY</p><h2>Today’s schedule {data.schedule.length ? <span>{data.schedule.length}</span> : null}</h2></div></div>
        <div className={styles.scheduleList}>{data.schedule.length
          ? data.schedule.map((booking) => <div className={styles.scheduleRow} key={booking.id}>
              <time>{formatSlotTime(booking.time)}</time>
              <span className={styles.customerAvatar}>{booking.initials}</span>
              <div className={styles.bookingDetails}><strong>{booking.customer}</strong><span>{booking.service} <i /> {booking.address}</span></div>
              <span className={styles.team}>{booking.requiresReview ? "Needs pricing" : formatNaira(booking.total)}</span>
              <span className={`${styles.status} ${statusClass(booking.status)}`}>{label(booking.status)}</span>
            </div>)
          : <p className={panel.muted}>No jobs scheduled today.</p>}</div>

        {data.upcoming.length ? <>
          <p className={panel.eyebrow} style={{ marginTop: 22 }}>COMING UP</p>
          <div className={styles.scheduleList}>{data.upcoming.map((booking) => <div className={styles.scheduleRow} key={booking.id}>
            <time>{booking.date}</time>
            <span className={styles.customerAvatar}>{booking.reference.replace("BOOM-", "#")}</span>
            <div className={styles.bookingDetails}><strong>{booking.customer}</strong><span>{booking.service} <i /> {formatSlotTime(booking.time)}</span></div>
            <span className={styles.team}>{booking.requiresReview ? "Needs pricing" : formatNaira(booking.total)}</span>
            <span className={`${styles.status} ${statusClass(booking.status)}`}>{label(booking.status)}</span>
          </div>)}</div>
        </> : null}
      </article>

      <article className={styles.card}>
        <div className={styles.cardHeading}><div><p className={styles.eyebrow}>INBOX</p><h2>Recent enquiries {data.enquiries.length ? <b>{data.enquiries.length}</b> : null}</h2></div></div>
        <div className={styles.enquiryList}>{data.enquiries.length
          ? data.enquiries.map((lead) => <div className={styles.enquiryRow} key={lead.id}>
              <span className={styles.leadAvatar}>{lead.initials}</span>
              <div><strong>{lead.customer}</strong><span>{lead.service}</span><small>{lead.source} · {lead.received}</small></div>
              <span className={styles.leadValue}>{label(lead.status)}</span>
            </div>)
          : <p className={panel.muted}>No enquiries yet.</p>}</div>
      </article>
    </section>
  </>;
}
