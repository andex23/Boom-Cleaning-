import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { appointmentDate, type ConfirmationState, type PaidConfirmation } from "@/features/payments/payment-confirmation";
import styles from "./payment.module.css";

type Props = { state: ConfirmationState; busy?: boolean; onRetry: () => void; onCalendar: (payment: PaidConfirmation) => void; onPrint: () => void };

const messages = {
  checking: { title: "Just a moment.", body: "We’re confirming your payment and putting your booking details together." },
  missing: { title: "Looking for your booking?", body: "Open the confirmation link from your checkout, or contact the team with your booking reference." },
  pending: { title: "Your payment is still pending.", body: "Your booking will be confirmed as soon as your full payment is verified. If you just paid, give it a moment and check again." },
  error: { title: "We couldn’t check your payment.", body: "Check your connection and try again. If payment went through, contact the team before making another payment." },
};

export function BookingConfirmationView({ state, busy = false, onRetry, onCalendar, onPrint }: Props) {
  if (!("payment" in state)) {
    const message = messages[state.kind];
    return <main className={styles.statusPage} aria-busy={state.kind === "checking" || busy}>
      <div className={styles.statusIcon}><Icon name={state.kind === "checking" ? "clock" : "headset"} /></div>
      <h1>{message.title}</h1><p role="status">{message.body}</p>
      <div className={styles.statusActions}>
        {state.kind === "pending" || state.kind === "error" ? <button className={styles.primaryButton} disabled={busy} onClick={onRetry}>{busy ? "Checking payment…" : "Check payment status"}</button> : null}
        {state.kind !== "checking" ? <a className={styles.secondaryButton} href="mailto:boomcleaninfo@gmail.com">Contact the team</a> : null}
        <Link href="/">Back to home</Link>
      </div>
    </main>;
  }

  const payment = state.payment;
  const date = appointmentDate(payment.appointment.scheduledStartAt);
  const confirmed = state.kind === "confirmed";
  const completed = state.kind === "completed";
  const amount = new Intl.NumberFormat("en-NG", { style: "currency", currency: payment.currency }).format(payment.amount);
  const contact = `mailto:boomcleaninfo@gmail.com?subject=${encodeURIComponent(`Booking ${payment.bookingReference}`)}`;

  return <main className={styles.confirmation}>
    <section className={styles.welcome} aria-labelledby="confirmation-title">
      <div className={styles.successMark}><Icon name={confirmed || completed ? "check" : "headset"} /></div>
      <p className={styles.confirmedLabel}>{confirmed ? "Booking confirmed" : completed ? "Cleaning completed" : "Payment recorded"}</p>
      <h1 id="confirmation-title">{confirmed ? <>Your clean<br /> is booked.</> : completed ? <>Your clean<br /> is complete.</> : <>Let’s sort out<br /> your booking.</>}</h1>
      <p role="status" className={styles.introduction}>{confirmed ? "You’re all set. Your appointment is confirmed and your booking details are right here." : completed ? "Thank you for booking with BOOM. You can find your appointment details and payment receipt below." : "Your payment was verified, but this appointment is not currently confirmed. Please contact the team to resolve it."}</p>
      {payment.mode === "test" ? <p className={styles.testNote}><Icon name="shieldCheck" />Test booking. No real money was collected.</p> : null}
      <div className={styles.heroSignature}>A clean space.<br />One less thing to think about.</div>
    </section>

    <div className={styles.details}>
      {confirmed || completed ? <section className={styles.appointment} aria-labelledby="appointment-title">
        <div className={styles.sectionHeading}><h2 id="appointment-title">Your appointment</h2><span>{payment.bookingReference}</span></div>
        <div className={styles.appointmentIntro}>
          <div className={styles.dateTile} aria-label={`${date.weekday}, ${date.full}`}><span>{date.weekday}</span><strong>{date.day}</strong><span>{date.month}</span></div>
          <div><p className={styles.detailLabel}>Your service</p><h3>{payment.appointment.serviceName}</h3><p className={styles.arrival}><Icon name="clock" />Arrival at {date.time}<span>Abuja time</span></p></div>
        </div>
        <div className={styles.address}><p className={styles.detailLabel}>Where we’re cleaning</p><p>{payment.appointment.address}</p></div>
        {confirmed ? <button className={styles.primaryButton} onClick={() => onCalendar(payment)}><Icon name="calendar" />Add to calendar</button> : null}
      </section> : null}

      <section className={styles.receipt} aria-labelledby="receipt-title">
        <div className={styles.sectionHeading}><h2 id="receipt-title">Payment receipt</h2><span className={styles.paidLabel}><Icon name="check" />Verified</span></div>
        <div className={styles.receiptTotal}><div><p className={styles.detailLabel}>Full amount verified</p><strong>{amount}</strong></div><Icon name="card" /></div>
        <dl className={styles.receiptRows}><div><dt>Booking reference</dt><dd>{payment.bookingReference}</dd></div><div><dt>Payment method</dt><dd>{payment.mode === "live" ? "Flutterwave" : "Paystack test payment"}</dd></div>{payment.paidAt ? <div><dt>Payment date</dt><dd>{appointmentDate(payment.paidAt).full}</dd></div> : null}</dl>
        <p className={styles.emailNotice}>{payment.receipt.status === "sent" ? <>Receipt sent{payment.receipt.email ? <> to <strong>{payment.receipt.email}</strong></> : " by email"}.</> : "Your receipt is being prepared. We’ll send it by email shortly."}</p>
        <button className={styles.receiptButton} onClick={onPrint}>Save or print receipt</button>
      </section>

      {confirmed ? <section className={styles.nextSteps} aria-labelledby="next-title"><h2 id="next-title">Before we arrive</h2><p>Please make sure our team can access the property at your selected arrival time.</p><p>Need to change your appointment? <a href={contact}>Contact the team</a> with your booking reference.</p></section> : !completed ? <a className={styles.primaryButton} href={contact}>Resolve my booking</a> : null}
      <footer className={styles.footer}><span>BOOM Cleaning Services · Abuja</span><Link href="/">Back to home</Link></footer>
    </div>
  </main>;
}
