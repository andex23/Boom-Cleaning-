"use client";

import type { AdminArea } from "@/data/admin-demo";
import styles from "./PricingAdmin.module.css";
import own from "./Directory.module.css";

/**
 * Areas that exist in the navigation but are not built yet. Falling through to the
 * Overview made these pages lie: the heading said "Money in and out" while the body showed
 * today's schedule. Saying plainly that a section is not ready is more useful.
 */
const PLANNED: Partial<Record<AdminArea, { blurb: string; points: string[]; where?: string }>> = {
  Jobs: {
    blurb: "Assigning crews to work, tracking who is on site and recording what was done.",
    points: ["Assign and reassign a crew", "See who is on site right now", "Job notes and completion records"],
    where: "For now, a booking's crew is shown under Bookings.",
  },
  Payments: {
    blurb: "Taking deposits and balances, and reconciling what has actually been paid.",
    points: ["Collect a deposit when a booking is confirmed", "Mark a balance as paid", "Match payments to bookings"],
    where: "This needs a payment provider connected before it can do anything real.",
  },
  Messages: {
    blurb: "One thread per customer across the website, Instagram and WhatsApp.",
    points: ["Read and reply in one place", "See the whole history with a customer", "Hand a conversation to a teammate"],
    where: "Instagram messages are already captured; they are not yet shown here.",
  },
  Reports: {
    blurb: "Revenue, repeat rate and crew utilisation over time.",
    points: ["Revenue by service and by month", "How often customers come back", "How busy each crew actually is"],
    where: "Today's figures are on the Overview.",
  },
};

export function ComingSoonPanel({ area }: { area: AdminArea }) {
  const plan = PLANNED[area];
  return <article className={styles.panel}>
    <header className={styles.head}>
      <div>
        <p className={styles.eyebrow}>{area.toUpperCase()}</p>
        <h2>{area} isn’t built yet</h2>
        <p className={styles.muted}>{plan?.blurb ?? "This area is planned but not available yet."}</p>
      </div>
    </header>
    {plan?.points.length ? <ul className={own.list}>
      {plan.points.map((point) => <li key={point} className={own.row} style={{ gridTemplateColumns: "1fr" }}>
        <span className={own.meta}>{point}</span>
      </li>)}
    </ul> : null}
    {plan?.where ? <p className={styles.notice}>{plan.where}</p> : null}
  </article>;
}
