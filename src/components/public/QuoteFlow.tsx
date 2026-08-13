"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { calculateDemoEstimate, formatNaira, publicServices, serviceBySlug } from "@/data/public-demo";
import { saveStoredBooking, type StoredBooking } from "@/lib/booking-store";
import { publicBookingPayloadSchema, publicBookingResponseSchema } from "@/lib/validation/public-booking";
import { BookingCalendar } from "./BookingCalendar";
import { ServiceIcon } from "./ServiceIcon";
import styles from "./QuoteFlow.module.css";
import bookingStyles from "./QuoteReview.module.css";

type FormState = { serviceSlug: string; propertyType: string; bedrooms: number; location: string; address: string; preferredDate: string; timeSlot: string; name: string; phone: string; email: string; notes: string };
const steps = ["Service", "Your space", "Book a time", "Contact", "Review"];
const timeLabels: Record<string, string> = { "08:00": "8:00 AM", "10:30": "10:30 AM", "13:00": "1:00 PM", "15:30": "3:30 PM" };
const dateFormatter = new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function displayDate(value: string) {
  return value ? dateFormatter.format(new Date(`${value}T12:00:00`)) : "Not selected";
}

export function QuoteFlow({ initialService }: { initialService?: string }) {
  const [step, setStep] = useState(0);
  const [booking, setBooking] = useState<StoredBooking | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({ serviceSlug: serviceBySlug(initialService)?.slug ?? "deep-cleaning", propertyType: "apartment", bedrooms: 2, location: "central", address: "", preferredDate: "", timeSlot: "", name: "", phone: "", email: "", notes: "" });
  const service = serviceBySlug(form.serviceSlug)!;
  const estimate = useMemo(() => calculateDemoEstimate(form), [form]);
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const validate = () => {
    if (step === 2 && (!form.address.trim() || !form.preferredDate || !form.timeSlot)) return "Choose an available date and appointment time, then add the service address.";
    if (step === 3 && (!form.name.trim() || !form.phone.trim() || !form.email.includes("@"))) return "Please enter your name, phone number and a valid email.";
    return "";
  };

  const next = () => {
    const message = validate();
    if (message) { setError(message); return; }
    setError("");
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    const payload = publicBookingPayloadSchema.safeParse({ serviceSlug: form.serviceSlug, propertyType: form.propertyType, bedrooms: form.bedrooms, location: form.location, address: form.address, date: form.preferredDate, time: form.timeSlot, name: form.name, phone: form.phone, email: form.email, notes: form.notes, amount: estimate?.amount ?? null });
    if (!payload.success) {
      setError("Please review the booking details and try again.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload.data) });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "We couldn’t create your booking. Please try again.";
        throw new Error(message);
      }
      const result = publicBookingResponseSchema.safeParse(body);
      if (!result.success) throw new Error("The booking service returned an unexpected confirmation. Please try again.");

      const confirmed: StoredBooking = { id: result.data.booking.id, createdAt: result.data.booking.createdAt, customer: payload.data.name, phone: payload.data.phone, email: payload.data.email, service: service.name, serviceSlug: service.slug, address: payload.data.address, date: payload.data.date, time: payload.data.time, amount: result.data.booking.amount ?? payload.data.amount, status: result.data.booking.status };
      saveStoredBooking(confirmed);
      setBooking(confirmed);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "We couldn’t create your booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (booking) return <section className={styles.success} aria-live="polite">
    <div className={styles.check}>✓</div><p className={styles.eyebrow}>{booking.status === "CONFIRMED" ? "Booking confirmed" : "Booking request received"}</p>
    <h1>{booking.status === "CONFIRMED" ? "Your clean is in the calendar." : "We’re confirming your appointment."}</h1>
    <p>{booking.status === "CONFIRMED" ? "Your appointment has been created. Payment is not taken in this flow." : "Your request has been received. BOOM will confirm the final availability, scope and any payment steps before your appointment is reserved."}</p>
    <div className={bookingStyles.confirmationCard}><div><span>Booking reference</span><strong>{booking.id}</strong></div><dl><div><dt>Service</dt><dd>{booking.service}</dd></div><div><dt>Date</dt><dd>{displayDate(booking.date)}</dd></div><div><dt>Arrival</dt><dd>{timeLabels[booking.time]}</dd></div><div><dt>Address</dt><dd>{booking.address}</dd></div>{booking.amount ? <div><dt>Service total</dt><dd>{formatNaira(booking.amount)}</dd></div> : null}</dl></div>
    <div className={bookingStyles.successActions}><Link className={styles.primaryButton} href="/">Return home</Link><button className={styles.secondaryButton} onClick={() => { setBooking(null); setStep(0); }}>Book another service</button></div>
  </section>;

  return <section className={styles.shell} aria-labelledby="quote-title"><aside className={styles.aside}><Link href="/" className={styles.brand}>BOOM<span>°</span></Link><div className={styles.asideCopy}><p className={styles.eyebrow}>Quote and booking</p><h1 id="quote-title">Choose your clean. Book your time.</h1><p>See a transparent estimate, then send your request for BOOM to confirm availability and payment.</p></div><ol className={styles.steps}>{steps.map((label, index) => <li key={label} className={index === step ? styles.current : index < step ? styles.complete : ""}><span>{index < step ? "✓" : `0${index + 1}`}</span>{label}</li>)}</ol><p className={styles.support}>Need help? <a href="tel:+2348000000000">Speak to BOOM</a></p></aside>
    <form className={`${styles.form} ${step === 2 ? bookingStyles.calendarForm : ""}`} onSubmit={submit} noValidate aria-busy={isSubmitting}><div className={styles.formTop}><div><p className={styles.mobileStep}>Step {step + 1} of {steps.length}</p><h2>{steps[step]}</h2></div><p className={styles.progress}>{Math.round(((step + 1) / steps.length) * 100)}%</p></div>
      {step === 0 ? <fieldset className={styles.options}><legend>What kind of care do you need?</legend><div className={styles.serviceGrid}>{publicServices.map((item) => <label key={item.id} className={`${styles.serviceOption} ${form.serviceSlug === item.slug ? styles.selected : ""}`}><input type="radio" name="service" value={item.slug} checked={form.serviceSlug === item.slug} onChange={() => update("serviceSlug", item.slug)} /><span className={styles.optionIcon}><ServiceIcon icon={item.icon} /></span><span><strong>{item.name}</strong><small>{item.priceFrom ? `From ${formatNaira(item.priceFrom)}` : "Custom scope"}</small></span></label>)}</div></fieldset> : null}
      {step === 1 ? <div className={styles.fields}><fieldset><legend>What type of property is it?</legend><div className={styles.pills}>{[["apartment", "Apartment"], ["duplex", "Duplex"], ["detached", "Detached home"], ["office", "Office / commercial"]].map(([value, label]) => <label className={form.propertyType === value ? styles.activePill : ""} key={value}><input type="radio" name="property" value={value} checked={form.propertyType === value} onChange={() => update("propertyType", value)} />{label}</label>)}</div></fieldset><label className={styles.rangeLabel}>Bedrooms / main rooms <strong>{form.bedrooms}</strong><input type="range" min="1" max="8" value={form.bedrooms} onChange={(event) => update("bedrooms", Number(event.target.value))} /><span>1</span><span>8+</span></label><label className={styles.textField}>Anything we should know?<textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="For example: pets, stair access, priority rooms…" rows={4} /></label></div> : null}
      {step === 2 ? <div className={styles.fields}><fieldset><legend>Where is the service?</legend><div className={styles.pills}>{[["central", "Central Abuja"], ["nearby", "Nearby districts"], ["outer", "Outer Abuja"]].map(([value, label]) => <label className={form.location === value ? styles.activePill : ""} key={value}><input type="radio" name="location" value={value} checked={form.location === value} onChange={() => update("location", value)} />{label}</label>)}</div></fieldset><label className={styles.textField}>Service address <input value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="Street, estate or landmark" autoComplete="street-address" /></label><BookingCalendar selectedDate={form.preferredDate} selectedTime={form.timeSlot} onDateChange={(value) => update("preferredDate", value)} onTimeChange={(value) => update("timeSlot", value)} /></div> : null}
      {step === 3 ? <div className={styles.fields}><p className={styles.help}>Who should receive the booking confirmation and arrival updates?</p><div className={styles.split}><label className={styles.textField}>Full name <input value={form.name} onChange={(event) => update("name", event.target.value)} autoComplete="name" placeholder="Your name" /></label><label className={styles.textField}>Phone number <input type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} autoComplete="tel" placeholder="0800 000 0000" /></label></div><label className={styles.textField}>Email address <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" placeholder="you@example.com" /></label></div> : null}
      {step === 4 ? <div className={bookingStyles.review}><div className={bookingStyles.reviewHeading}><div><p>Booking summary</p><h3>{service.name}</h3></div><strong>{estimate ? formatNaira(estimate.amount) : "Scope review"}</strong></div><dl><div><dt>Date</dt><dd>{displayDate(form.preferredDate)}</dd></div><div><dt>Arrival time</dt><dd>{timeLabels[form.timeSlot]}</dd></div><div><dt>Property</dt><dd>{form.bedrooms} rooms · {form.propertyType}</dd></div><div><dt>Address</dt><dd>{form.address}</dd></div><div><dt>Customer</dt><dd>{form.name} · {form.phone}</dd></div></dl><div className={bookingStyles.paymentNote}><span>₦</span><p><strong>Payment is not enabled in this demo.</strong>{estimate ? ` The estimated total is ${formatNaira(estimate.amount)}; a production service would confirm the final price and payment before reserving a team.` : " A production service would confirm the scope and price before creating a booking."}</p></div></div> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}<div className={styles.controls}>{step > 0 ? <button type="button" className={styles.back} disabled={isSubmitting} onClick={() => { setError(""); setStep((current) => current - 1); }}>Back</button> : null}<button type={step === steps.length - 1 ? "submit" : "button"} className={styles.primaryButton} disabled={isSubmitting} onClick={step === steps.length - 1 ? undefined : next}>{step === steps.length - 1 ? (isSubmitting ? "Sending booking…" : "Send booking request") : step === 1 ? "Choose a time" : "Continue"} <span aria-hidden="true">→</span></button></div></form>
  </section>;
}
