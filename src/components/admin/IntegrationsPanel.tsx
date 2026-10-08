import "server-only";
import { getInstagramConnectionStatus } from "@/features/instagram/config";
import { InstagramStatus } from "./InstagramStatus";
import styles from "./IntegrationsPanel.module.css";
export function IntegrationsPanel() {
  const payments=Boolean(process.env.FLUTTERWAVE_SECRET_KEY?.trim() && process.env.FLUTTERWAVE_WEBHOOK_SECRET?.trim());
  const email=Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
  return <div className={styles.grid}>
    <article className={styles.connection}><header><span className={styles.mark}>₦</span><div><h2>Flutterwave</h2><p>Payments and booking confirmation</p></div><span className={styles.status}>{payments ? "Configured" : "Not connected"}</span></header><p>Checkout uses server verification before confirming a booking. Payment-method availability and account reviews are managed by Flutterwave.</p><a href="https://dashboard.flutterwave.com/" target="_blank" rel="noreferrer">Open Flutterwave ↗</a></article>
    <article className={styles.connection}><header><span className={styles.mark}>@</span><div><h2>Confirmation emails</h2><p>Customer receipts and owner notifications</p></div><span className={styles.status}>{email ? "Sending configured" : "Not connected"}</span></header><dl><div><dt>Sender</dt><dd>bookings@boomcleaning.site</dd></div><div><dt>Owner notification</dt><dd>boomcleaninfo@gmail.com</dd></div></dl><p>Customer and owner notifications are sent separately after payment is verified.</p></article>
    <InstagramStatus status={getInstagramConnectionStatus()} />
  </div>;
}
