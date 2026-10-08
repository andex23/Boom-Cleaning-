"use client";
import { useEffect,useState } from "react";
import { adminFetch,adminErrorMessage } from "./adminFetch";
import { formatNaira } from "@/lib/format";
import { CollectionSummary,EmptyCollection } from "./AdminCollection";
import panel from "./PricingAdmin.module.css";
import styles from "./AdminCollection.module.css";
type Payment = {id:string;provider:string;provider_reference:string;status:string;amount:number;paid_at:string|null;provider_payload:{authorization_url?:string}};
type Row = {booking_number:number;status:string;total:number;customers:{full_name:string;email:string}|{full_name:string;email:string}[];quotes:{requires_review:boolean}|{requires_review:boolean}[];payments:Payment[]};
const customerOf = (row:Row) => Array.isArray(row.customers) ? row.customers[0] : row.customers;
const safeCheckout = (value?:string) => {
  try {const url=new URL(value ?? "");return url.origin === "https://checkout.flutterwave.com" && url.pathname === "/v3/hosted/pay" && !url.username && !url.password ? url.href : null;} catch {return null;}
};
export function PaymentsPanel() {
  const [rows,setRows] = useState<Row[]|null>(null);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState<number|null>(null);
  const [links,setLinks] = useState<Record<number,string>>({});
  const [query,setQuery] = useState("");
  const [filter,setFilter] = useState("All");
  useEffect(() => {
    let active=true;
    void adminFetch("/api/admin/payments").then(async response => {
      if (!response.ok) throw new Error("load");
      const body=await response.json();if(active) setRows(body.bookings);
    }).catch(reason => {if(active) setError(adminErrorMessage(reason,"Unable to load payments. Refresh to try again."));});
    return () => {active=false;};
  },[]);
  async function action(row:Row,payment?:Payment) {
    setBusy(row.booking_number);setError("");
    try {
      const response=await adminFetch("/api/admin/payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payment ? {action:"verify",reference:payment.provider_reference} : {action:"request",bookingNumber:row.booking_number})});
      const body=await response.json();if(!response.ok) throw new Error(body.error ?? "Payment action failed.");
      const url=safeCheckout(body.provider_payload?.authorization_url);
      if(url) setLinks(current => ({...current,[row.booking_number]:url}));
      const refresh=await adminFetch("/api/admin/payments");if(!refresh.ok) throw new Error("Unable to refresh payments.");
      setRows((await refresh.json()).bookings);
    } catch(reason) {setError(adminErrorMessage(reason,reason instanceof Error ? reason.message : "Payment action failed."));}
    finally {setBusy(null);}
  }
  if(!rows) return <article className={panel.panel}>{error ? <p className={styles.alert} role="alert">{error}</p> : <p className={styles.muted}>Loading payment records…</p>}</article>;
  const paid = (row:Row) => row.payments.some(payment => payment.status === "PAID");
  const received=rows.flatMap(row => row.payments).filter(payment => payment.provider === "flutterwave" && payment.status === "PAID" && payment.paid_at).reduce((sum,payment) => sum+Number(payment.amount),0);
  const visible=rows.filter(row => (filter === "All" || (filter === "Paid" ? paid(row) : !paid(row) && row.status === "PENDING")) && (`BOOM-${row.booking_number} ${customerOf(row)?.full_name ?? ""} ${customerOf(row)?.email ?? ""}`).toLowerCase().includes(query.trim().toLowerCase()));
  return <><CollectionSummary items={[{label:"Received in these records",value:formatNaira(received)},{label:"Paid bookings shown",value:rows.filter(paid).length},{label:"Awaiting payment",value:rows.filter(row => !paid(row) && row.status === "PENDING").length}]} /><article className={panel.panel}>
    <header className={panel.head}><div><h2>Payment ledger</h2><p className={panel.muted}>Latest 50 booking records. Verified receipts, outstanding checkouts and payment references.</p></div></header>
    <div className={styles.toolbar}><div className={styles.filters}>{["All","Paid","Unpaid"].map(value => <button className={styles.filter} aria-pressed={filter===value} key={value} onClick={() => setFilter(value)}>{value}</button>)}</div><label className={styles.search}><span className="sr-only">Search payments</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search booking or customer" /></label></div>
    {error && <p className={styles.alert} role="alert">{error}</p>}
    {!rows.length ? <EmptyCollection kind="payments" title="No payments to reconcile yet" description="Verified receipts and unpaid checkouts will appear here when your first customer starts a booking." action={{href:"/admin/bookings",label:"View bookings"}} /> : !visible.length ? <p className={styles.muted}>No payment records match your filters.</p> : <div className={styles.ledger}>{visible.map(row => {
      const customer=customerOf(row),quote=Array.isArray(row.quotes) ? row.quotes[0] : row.quotes;
      const pending=row.payments.find(payment => payment.provider === "flutterwave" && payment.status === "PENDING");
      const url=safeCheckout(links[row.booking_number] ?? pending?.provider_payload?.authorization_url);
      return <article className={styles.paymentRow} key={row.booking_number}><div className={styles.paymentHead}><div><span className={styles.reference}>BOOM-{row.booking_number}</span><h3>{customer?.full_name ?? "Unnamed customer"}</h3><p className={styles.muted}>{customer?.email}</p></div><div><div className={styles.amount}>{formatNaira(Number(row.total))}</div><span className={styles.badge} data-paid={paid(row)}>{paid(row) ? "Payment verified" : row.status === "CANCELLED" ? "Cancelled" : "Unpaid"}</span></div></div>
        <ul className={styles.transactions}>{row.payments.map(payment => <li key={payment.id}><span>{payment.provider === "paystack_test" ? "Paystack test" : "Flutterwave"} · {payment.status.toLowerCase().replaceAll("_"," ")}<br />{payment.paid_at ? new Date(payment.paid_at).toLocaleString("en-NG",{timeZone:"Africa/Lagos"}) : "No payment received"}</span><strong>{formatNaira(Number(payment.amount))}</strong></li>)}</ul>
        <div className={styles.actions}>{!paid(row) && !quote?.requires_review && ["PENDING","CONFIRMED"].includes(row.status) && !pending && <button disabled={busy!==null} onClick={() => action(row)}>Create payment link</button>}{pending && <button disabled={busy!==null} onClick={() => action(row,pending)}>{busy===row.booking_number ? "Checking…" : "Check payment"}</button>}{url && !paid(row) && <><a href={url} target="_blank" rel="noreferrer">Open checkout ↗</a><button onClick={() => {void navigator.clipboard.writeText(url).catch(() => setError("Unable to copy. Open checkout and copy its address."));}}>Copy payment link</button></>}</div>
      </article>;
    })}</div>}
  </article></>;
}
