"use client";

import { useEffect, useMemo, useState } from "react";
import { formatNaira } from "@/lib/format";
import type { CustomerRecord } from "@/features/operations/directory";
import styles from "./PricingAdmin.module.css";
import own from "./Directory.module.css";
import { adminErrorMessage, adminFetch, SESSION_EXPIRED_MESSAGE } from "./adminFetch";

const dateFormatter = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });

function AdminError({ message }: { message: string }) {
  const expired = message === SESSION_EXPIRED_MESSAGE;
  return <article className={styles.panel}>
    <p className={styles.error} role="alert">{message}</p>
    {expired ? <form action="/api/admin/logout" method="post"><button className={styles.save} type="submit">Sign in again</button></form> : null}
  </article>;
}

/** Everyone BOOM has cleaned for, with what they are worth and how to reach them. */
export function CustomersPanel() {
  const [customers, setCustomers] = useState<CustomerRecord[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await adminFetch("/api/admin/directory?view=customers");
        if (!response.ok) throw new Error("load");
        if (!cancelled) setCustomers(await response.json() as CustomerRecord[]);
      } catch (loadFailure) {
        if (!cancelled) setError(adminErrorMessage(loadFailure, "We couldn’t load your customers."));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => {
    if (!customers) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((customer) => [customer.fullName, customer.phone, customer.email, customer.location]
      .some((field) => field?.toLowerCase().includes(needle)));
  }, [customers, query]);

  if (error) return <AdminError message={error} />;
  if (!customers) return <article className={styles.panel}><p className={styles.muted}>Loading customers…</p></article>;

  const totalValue = customers.reduce((sum, customer) => sum + customer.lifetimeValue, 0);

  return <article className={styles.panel}>
    <header className={styles.head}>
      <div><p className={styles.eyebrow}>CUSTOMERS</p><h2>The people BOOM cleans for</h2>
      <p className={styles.muted}>{customers.length} customer{customers.length === 1 ? "" : "s"} · {formatNaira(totalValue)} booked in total. Cancelled work is not counted.</p></div>
      {customers.length > 0 ? <label className={own.search}>
        <span className="sr-only">Search customers</span>
        <input type="search" value={query} placeholder="Search name, phone, email or area" onChange={(event) => setQuery(event.target.value)} />
      </label> : null}
    </header>

    {customers.length === 0 ? <p className={styles.muted}>No customers yet. Anyone who books through the website appears here automatically.</p>
      : visible.length === 0 ? <p className={styles.muted}>No customer matches “{query}”.</p>
      : <ul className={own.list}>
        {visible.map((customer) => <li key={customer.id} className={own.row}>
          <div className={own.who}>
            <strong>{customer.fullName ?? "Unnamed"}</strong>
            <small>{customer.location ?? "No area recorded"}{customer.channels.length ? ` · ${customer.channels.join(", ").toLowerCase()}` : ""}</small>
          </div>
          <div className={own.contact}>
            {customer.phone ? <a href={`tel:${customer.phone}`}>{customer.phone}</a> : <span className={own.dim}>No phone</span>}
            {customer.email ? <a href={`mailto:${customer.email}`}>{customer.email}</a> : null}
          </div>
          <span className={own.meta}>
            {customer.bookingCount === 0 ? "No bookings" : `${customer.bookingCount} booking${customer.bookingCount === 1 ? "" : "s"}`}
            {customer.lastBookingAt ? ` · last ${dateFormatter.format(new Date(customer.lastBookingAt))}` : ""}
          </span>
          <strong className={own.value}>{formatNaira(customer.lifetimeValue)}</strong>
        </li>)}
      </ul>}
  </article>;
}
