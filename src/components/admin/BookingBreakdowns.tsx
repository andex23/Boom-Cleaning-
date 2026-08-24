"use client";

import { useEffect, useState } from "react";
import { formatNaira, formatNairaDelta } from "@/lib/format";
import type { BookingBreakdown } from "@/features/pricing/pricing-admin";
import styles from "./PricingAdmin.module.css";
import own from "./BookingBreakdowns.module.css";
import { adminErrorMessage, adminFetch, SESSION_EXPIRED_MESSAGE } from "./adminFetch";

const NEXT_STATUSES: Record<string, readonly string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [], CANCELLED: [], NO_SHOW: [],
};
// Plain verbs, not enum names, so staff know what the button does.
const ACTION_LABELS: Record<string, string> = {
  CONFIRMED: "Confirm", IN_PROGRESS: "Start job", COMPLETED: "Mark complete",
  CANCELLED: "Cancel", NO_SHOW: "No show",
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: "Awaiting confirmation", CONFIRMED: "Confirmed", IN_PROGRESS: "In progress",
  COMPLETED: "Completed", CANCELLED: "Cancelled", NO_SHOW: "No show",
};

const dateFormatter = new Intl.DateTimeFormat("en-NG", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

/**
 * Real bookings with the line items frozen at quote time, so staff can see exactly why a
 * total is what it is — and which bookings are still waiting on a human price.
 */
/** An expired session needs a way out, not just a red sentence. */
function AdminError({ message }: { message: string }) {
  const expired = message === SESSION_EXPIRED_MESSAGE;
  return <article className={styles.panel}>
    <p className={styles.error} role="alert">{message}</p>
    {expired ? <form action="/api/admin/logout" method="post"><button className={styles.save} type="submit">Sign in again</button></form> : null}
  </article>;
}

export function BookingBreakdowns() {
  const [bookings, setBookings] = useState<BookingBreakdown[] | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState<Record<number, string>>({});
  const [noteDraft, setNoteDraft] = useState<Record<number, string>>({});
  const [savingFor, setSavingFor] = useState<number | null>(null);
  const [moveDraft, setMoveDraft] = useState<Record<number, string>>({});
  const [saveError, setSaveError] = useState("");

  const runAction = async (bookingNumber: number, payload: Record<string, unknown>, failure: string) => {
    setSavingFor(bookingNumber);
    setSaveError("");
    try {
      const response = await adminFetch("/api/admin/bookings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingNumber, ...payload }),
      });
      const body = await response.json().catch(() => null) as { error?: string; bookings?: BookingBreakdown[] } | null;
      if (!response.ok) throw new Error(body?.error ?? failure);
      if (body?.bookings) setBookings(body.bookings);
      return true;
    } catch (actionFailure) {
      setSaveError(adminErrorMessage(actionFailure, actionFailure instanceof Error ? actionFailure.message : failure));
      return false;
    } finally {
      setSavingFor(null);
    }
  };

  const changeStatus = (bookingNumber: number, status: string) =>
    runAction(bookingNumber, { action: "status", status }, "We couldn’t update that booking.");

  const reschedule = (bookingNumber: number, localDateTime: string) => {
    // datetime-local has no zone; BOOM works in Africa/Lagos.
    if (!localDateTime) { setSaveError("Choose a new date and time."); return Promise.resolve(false); }
    return runAction(bookingNumber, { action: "reschedule", scheduledStartAt: `${localDateTime}:00+01:00` }, "We couldn’t move that booking.");
  };

  const savePrice = async (bookingNumber: number) => {
    const amount = Number(priceDraft[bookingNumber]);
    if (!Number.isFinite(amount) || amount < 0) { setSaveError("Enter a valid amount."); return; }
    setSavingFor(bookingNumber);
    setSaveError("");
    try {
      const response = await adminFetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingNumber, amount, note: noteDraft[bookingNumber]?.trim() || undefined }),
      });
      const body = await response.json().catch(() => null) as { error?: string; bookings?: BookingBreakdown[] } | null;
      if (!response.ok) throw new Error(body?.error ?? "We couldn’t set that price.");
      if (body?.bookings) setBookings(body.bookings);
      setPriceDraft((current) => ({ ...current, [bookingNumber]: "" }));
      setNoteDraft((current) => ({ ...current, [bookingNumber]: "" }));
    } catch (saveFailure) {
      setSaveError(adminErrorMessage(saveFailure, saveFailure instanceof Error ? saveFailure.message : "We couldn’t set that price."));
    } finally {
      setSavingFor(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await adminFetch("/api/admin/bookings");
        if (!response.ok) throw new Error("load");
        if (!cancelled) setBookings(await response.json() as BookingBreakdown[]);
      } catch (loadFailure) {
        if (!cancelled) setError(adminErrorMessage(loadFailure, "We couldn’t load recent bookings."));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (error) return <AdminError message={error} />;
  if (!bookings) return <article className={styles.panel}><p className={styles.muted}>Loading bookings…</p></article>;
  if (!bookings.length) return <article className={styles.panel}><p className={styles.muted}>No bookings yet. New web bookings appear here with their full price breakdown.</p></article>;

  return <article className={styles.panel}>
    <header className={styles.head}><div><p className={styles.eyebrow}>BOOKINGS</p><h2>Recent bookings and how each price was reached</h2><p className={styles.muted}>Line items are frozen at quote time, so later price changes never rewrite an agreed total.</p></div></header>
    <ul className={own.list}>{bookings.map((booking) => {
      const isOpen = expanded === booking.reference;
      return <li key={booking.reference} className={own.row}>
        <button className={own.summary} aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : booking.reference)}>
          <span className={own.reference}>{booking.reference}</span>
          <span className={own.who}><strong>{booking.customer ?? "Unnamed customer"}</strong><small>{booking.serviceName}{booking.propertyType ? ` · ${booking.propertyType}` : ""}</small></span>
          <span className={own.when}>{dateFormatter.format(new Date(booking.scheduledStartAt))}</span>
          {booking.requiresReview
            ? <span className={styles.tagReview}>Needs pricing</span>
            : <span className={own.total}>{formatNaira(booking.total)}</span>}
          <span className={own.statusChip} data-status={booking.status}>{STATUS_LABELS[booking.status] ?? booking.status}</span>
          <span aria-hidden="true" className={isOpen ? own.chevronOpen : own.chevron}>⌄</span>
        </button>
        {isOpen ? <div className={own.detail}>
          {booking.items.length ? <ul className={own.items}>{booking.items.map((item, index) => <li key={`${item.kind}-${index}`}><span>{item.label}</span><span>{item.kind === "PROPERTY_MULTIPLIER" || item.kind === "MANUAL_ADJUSTMENT" ? formatNairaDelta(item.amount) : formatNaira(item.amount)}</span></li>)}
            <li className={own.itemsTotal}><span>Total</span><span>{formatNaira(booking.total)}</span></li>
          </ul> : <p className={styles.notice}>This scope needs a person to price it. No line items were generated.</p>}

          <div className={own.priceForm}>
            <label>{booking.requiresReview ? "Set the agreed price" : "Adjust the price"}
              <input type="number" min={0} step={500} inputMode="numeric" placeholder={booking.requiresReview ? "e.g. 185000" : String(booking.total)}
                value={priceDraft[booking.bookingNumber] ?? ""}
                onChange={(event) => setPriceDraft((current) => ({ ...current, [booking.bookingNumber]: event.target.value }))} />
            </label>
            <label>Reason <span>(optional)</span>
              <input type="text" maxLength={240} placeholder="e.g. Site visit — pool area and rooftop"
                value={noteDraft[booking.bookingNumber] ?? ""}
                onChange={(event) => setNoteDraft((current) => ({ ...current, [booking.bookingNumber]: event.target.value }))} />
            </label>
            <button type="button" disabled={savingFor === booking.bookingNumber || !priceDraft[booking.bookingNumber]} onClick={() => savePrice(booking.bookingNumber)}>
              {savingFor === booking.bookingNumber ? "Saving…" : "Save price"}
            </button>
          </div>
          <p className={own.priceHint}>The difference is recorded as its own line, so the breakdown still adds up and the original calculation stays visible.</p>

          <div className={own.lifecycle}>
            <div>
              <p className={own.lifecycleLabel}>Booking status{booking.crewName ? ` · ${booking.crewName}` : ""}</p>
              <div className={own.actions}>
                {(NEXT_STATUSES[booking.status] ?? []).length === 0
                  ? <span className={own.done}>This booking is {(STATUS_LABELS[booking.status] ?? booking.status).toLowerCase()} — nothing left to do.</span>
                  : NEXT_STATUSES[booking.status].map((next) => <button
                      key={next} type="button" disabled={savingFor === booking.bookingNumber}
                      className={next === "CANCELLED" || next === "NO_SHOW" ? own.destructive : own.primary}
                      onClick={() => changeStatus(booking.bookingNumber, next)}
                    >{ACTION_LABELS[next] ?? next}</button>)}
              </div>
            </div>

            {["PENDING", "CONFIRMED"].includes(booking.status) ? <div>
              <p className={own.lifecycleLabel}>Move to another time</p>
              <div className={own.actions}>
                <input type="datetime-local" value={moveDraft[booking.bookingNumber] ?? ""}
                  onChange={(event) => setMoveDraft((current) => ({ ...current, [booking.bookingNumber]: event.target.value }))} />
                <button type="button" disabled={savingFor === booking.bookingNumber || !moveDraft[booking.bookingNumber]}
                  className={own.primary} onClick={() => reschedule(booking.bookingNumber, moveDraft[booking.bookingNumber] ?? "")}>Move booking</button>
              </div>
            </div> : null}
          </div>
          {saveError && savingFor === null ? <p className={styles.error} role="alert">{saveError}</p> : null}
        </div> : null}
      </li>;
    })}</ul>
  </article>;
}
