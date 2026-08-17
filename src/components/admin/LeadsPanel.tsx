"use client";

import { useEffect, useState } from "react";
import type { LeadRecord } from "@/features/operations/directory";
import styles from "./PricingAdmin.module.css";
import own from "./Directory.module.css";
import { adminErrorMessage, adminFetch, SESSION_EXPIRED_MESSAGE } from "./adminFetch";

const STATUSES = ["NEW", "QUALIFYING", "QUALIFIED", "QUOTE_SENT", "AWAITING_PAYMENT", "BOOKED", "LOST", "CANCELLED"] as const;
const label = (value: string) => value.split("_").map((part) => part[0] + part.slice(1).toLowerCase()).join(" ");
const dateFormatter = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });

function AdminError({ message }: { message: string }) {
  const expired = message === SESSION_EXPIRED_MESSAGE;
  return <article className={styles.panel}>
    <p className={styles.error} role="alert">{message}</p>
    {expired ? <form action="/api/admin/logout" method="post"><button className={styles.save} type="submit">Sign in again</button></form> : null}
  </article>;
}

/** Everyone who has asked about BOOM, and where each one has got to. */
export function LeadsPanel() {
  const [leads, setLeads] = useState<LeadRecord[] | null>(null);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await adminFetch("/api/admin/directory?view=leads");
        if (!response.ok) throw new Error("load");
        if (!cancelled) setLeads(await response.json() as LeadRecord[]);
      } catch (loadFailure) {
        if (!cancelled) setError(adminErrorMessage(loadFailure, "We couldn’t load your leads."));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const changeStatus = async (leadId: string, status: string) => {
    setSavingId(leadId);
    try {
      const response = await adminFetch("/api/admin/directory", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, status }),
      });
      if (!response.ok) throw new Error("save");
      setLeads((await response.json() as { leads: LeadRecord[] }).leads);
    } catch (saveFailure) {
      setError(adminErrorMessage(saveFailure, "We couldn’t update that lead."));
    } finally {
      setSavingId(null);
    }
  };

  if (error) return <AdminError message={error} />;
  if (!leads) return <article className={styles.panel}><p className={styles.muted}>Loading leads…</p></article>;

  return <article className={styles.panel}>
    <header className={styles.head}>
      <div><p className={styles.eyebrow}>LEADS</p><h2>People who asked about BOOM</h2>
      <p className={styles.muted}>Every enquiry, however it arrived. Change the stage as you work through them.</p></div>
    </header>

    {leads.length === 0 ? <p className={styles.muted}>No enquiries yet. Website bookings and Instagram messages appear here automatically.</p> : <ul className={own.list}>
      {leads.map((lead) => <li key={lead.id} className={own.row}>
        <div className={own.who}>
          <strong>{lead.customer ?? "Unnamed"}</strong>
          <small>{lead.service ?? "No service chosen"}</small>
        </div>
        <div className={own.contact}>
          {lead.phone ? <a href={`tel:${lead.phone}`}>{lead.phone}</a> : <span className={own.dim}>No phone</span>}
          {lead.email ? <a href={`mailto:${lead.email}`}>{lead.email}</a> : null}
        </div>
        <span className={own.meta}>{lead.source} · {dateFormatter.format(new Date(lead.createdAt))}</span>
        <label className={own.statusPicker}>
          <span className="sr-only">Stage for {lead.customer ?? "this lead"}</span>
          <select value={lead.status} disabled={savingId === lead.id} onChange={(event) => changeStatus(lead.id, event.target.value)}>
            {STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}
          </select>
        </label>
      </li>)}
    </ul>}
  </article>;
}
