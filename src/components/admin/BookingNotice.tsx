"use client";

import { useEffect, useState } from "react";
import { readStoredBookings, type StoredBooking } from "@/lib/booking-store";
import styles from "./BookingNotice.module.css";

const dateFormatter = new Intl.DateTimeFormat("en-NG", { weekday: "short", day: "numeric", month: "short" });

export function BookingNotice() {
  const [booking, setBooking] = useState<StoredBooking | null>(null);

  useEffect(() => {
    const refresh = () => setBooking(readStoredBookings()[0] ?? null);
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("boom:booking-created", refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("boom:booking-created", refresh); };
  }, []);

  if (!booking) return null;
  const date = dateFormatter.format(new Date(`${booking.date}T12:00:00`));
  return <section className={styles.notice} aria-label="Latest web booking"><span className={styles.icon}>✓</span><div><small>Latest web booking</small><strong>{booking.customer} booked {booking.service}</strong><p>{date} at {booking.time} · {booking.address}</p></div><div className={styles.reference}><small>Reference</small><strong>{booking.id}</strong></div><span className={styles.status}>{booking.status === "CONFIRMED" ? "Confirmed" : "Review"}</span></section>;
}
