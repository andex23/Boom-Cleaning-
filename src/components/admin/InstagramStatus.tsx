import type { InstagramConnectionStatus } from "@/features/instagram/config";
import styles from "./InstagramStatus.module.css";
export function InstagramStatus({ status }: { status: InstagramConnectionStatus }) {
  const connected = status.state === "connected";
  return <section className={`${styles.integrationCard} ${connected ? "" : styles.inactive}`} aria-label="Instagram automation status">
    <span className={styles.instagramMark}>IG</span>
    <div><h2>Instagram</h2><small>{connected ? "Messages connected" : "Not active. Instagram messages are not imported yet."}</small></div>
    <span className={styles.integrationStatus}>{connected ? "Connected" : "Inactive"}</span>
  </section>;
}
