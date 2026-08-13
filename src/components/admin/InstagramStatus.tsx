import type { InstagramConnectionStatus } from "@/features/instagram/config";
import styles from "./InstagramStatus.module.css";

export function InstagramStatus({ status }: { status: InstagramConnectionStatus }) {
  const message = status.state === "connected"
    ? `Connected to account ${status.accountId}`
    : status.state === "webhook_ready"
      ? "Webhook ready — account authorization is next"
      : "Waiting for Meta app credentials";
  const label = status.state === "connected"
    ? "Connected"
    : status.state === "webhook_ready"
      ? "Webhook ready"
      : "Setup required";

  return <section className={styles.integrationCard} aria-label="Instagram automation status">
    <span className={styles.instagramMark}>IG</span>
    <div><p className={styles.eyebrow}>SOCIAL AUTOMATION</p><h2>Instagram</h2><small>{message}</small></div>
    <span className={`${styles.integrationStatus} ${styles[status.state]}`}>{label}</span>
    <code>/api/integrations/instagram/webhook</code>
  </section>;
}
