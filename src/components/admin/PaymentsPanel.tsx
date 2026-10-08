"use client";
import { useEffect, useState } from "react";
import { adminFetch, adminErrorMessage } from "./adminFetch";
import { formatNaira } from "@/lib/format";
import styles from "./PricingAdmin.module.css";
type Payment = { id: string; provider: string; provider_reference: string; status: string; amount: number; paid_at: string | null; provider_payload: { authorization_url?: string } };
type Row = { booking_number: number; status: string; total: number; customers: { full_name: string; email: string } | { full_name: string; email: string }[]; quotes: { requires_review: boolean } | { requires_review: boolean }[]; payments: Payment[] };
export function PaymentsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [links, setLinks] = useState<Record<number,string>>({});
  async function load() {
    const response = await adminFetch("/api/admin/payments");
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);
    setRows(body.bookings);
  }
  useEffect(() => {
    let active = true;
    adminFetch("/api/admin/payments").then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (active) setRows(body.bookings);
    }).catch(e => { if (active) setError(adminErrorMessage(e, "Unable to load payments.")); });
    return () => { active = false; };
  }, []);
  async function action(row: Row, payment?: Payment) {
    setBusy(row.booking_number); setError("");
    try {
      const response = await adminFetch("/api/admin/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payment ? { action: "verify", reference: payment.provider_reference } : { action: "request", bookingNumber: row.booking_number }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (body.provider_payload?.authorization_url) setLinks(current => ({ ...current, [row.booking_number]: body.provider_payload.authorization_url }));
      await load();
    } catch(e) { setError(adminErrorMessage(e, e instanceof Error ? e.message : "Payment action failed.")); }
    finally { setBusy(null); }
  }
  return <section className={styles.panel}><h2>Booking payments</h2><p>Flutterwave live payments. Previous Paystack test payments are labelled separately. Verified full payment confirms a pending booking automatically.</p>{error && <p role="alert" className={styles.error}>{error}</p>}{rows.length === 0 && !error && <p>No booking payments yet.</p>}{rows.map(row => {
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    const quote = Array.isArray(row.quotes) ? row.quotes[0] : row.quotes;
    const paid = row.payments.some(p => p.status === "PAID");
    const pending = row.payments.find(p => p.provider === "flutterwave" && p.status === "PENDING");
    const url = links[row.booking_number] || pending?.provider_payload?.authorization_url;
    return <article key={row.booking_number} style={{ padding: "24px 0", borderTop: "1px solid #ddd" }}><h3>BOOM-{row.booking_number} · {customer?.full_name}</h3><p>{formatNaira(Number(row.total))} · {paid ? "Payment verified" : quote?.requires_review ? "Awaiting final quote" : "Awaiting payment"} · Booking: {row.status}</p>{row.payments.map(p => <p key={p.id}>{p.provider === "paystack_test" ? "TEST" : p.provider} · {p.status} · {formatNaira(Number(p.amount))}{p.paid_at ? ` · ${new Date(p.paid_at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}` : ""}</p>)}{!paid && !quote?.requires_review && ["PENDING","CONFIRMED"].includes(row.status) && <button className={styles.save} disabled={busy !== null} onClick={() => action(row)}>Create payment link</button>} {pending && <button className={styles.save} disabled={busy !== null} onClick={() => action(row, pending)}>Check payment</button>}{url && !paid && <div><p><a href={url} target="_blank" rel="noreferrer">Open Flutterwave checkout</a></p><button onClick={() => navigator.clipboard.writeText(url)}>Copy payment link</button></div>}</article>;
  })}</section>;
}
