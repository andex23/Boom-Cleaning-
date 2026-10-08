"use client";

import { CollectionSummary,EmptyCollection } from "./AdminCollection";
import collection from "./AdminCollection.module.css";
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
  const [query,setQuery] = useState("");
  const [filter,setFilter] = useState("All");
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
        if (!cancelled) setError(adminErrorMessage(loadFailure, "We couldn’t load your inbox."));
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
  if (!leads) return <article className={styles.panel}><p className={styles.muted}>Loading enquiries…</p></article>;

  const visible = leads.filter(lead => (filter === "All" || (filter === "Open" ? !["BOOKED","LOST","CANCELLED"].includes(lead.status) : lead.status === "BOOKED")) && (!query.trim() || [lead.customer,lead.email,lead.phone,lead.service].some(value => value?.toLowerCase().includes(query.trim().toLowerCase()))));
  return <><CollectionSummary items={[{label:"Enquiries shown",value:leads.length},{label:"Open",value:leads.filter(lead => !["BOOKED","LOST","CANCELLED"].includes(lead.status)).length},{label:"Booked",value:leads.filter(lead => lead.status === "BOOKED").length}]} /><article className={styles.panel}>
    <header className={styles.head}>
      <div><p className={styles.eyebrow}>INBOX</p><h2>Customer enquiries</h2>
      <p className={styles.muted}>Website enquiries and contact details. This is separate from the company email inbox.</p></div>
    </header>

    <div className={collection.toolbar}><div className={collection.filters}>{["All","Open","Booked"].map(value => <button className={collection.filter} aria-pressed={filter===value} onClick={() => setFilter(value)} key={value}>{value}</button>)}</div><label className={collection.search}><span className="sr-only">Search enquiries</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, email or service" /></label></div>
    {leads.length === 0 ? <EmptyCollection kind="inbox" title="You’re ready for your first enquiry" description="Customer enquiries will appear here with their service, contact details and current stage. Instagram is inactive." /> : visible.length === 0 ? <p className={styles.muted}>No enquiries match your filters.</p> : <ul className={own.list}>
      {visible.map((lead) => <li key={lead.id} className={own.row}>
        <div className={own.who}>
          <strong>{lead.customer ?? "Unnamed"}</strong>
          <small>{lead.service ?? "No service chosen"}</small>
          {lead.notes ? <small>{lead.notes}</small> : null}
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
  </article></>;
}
