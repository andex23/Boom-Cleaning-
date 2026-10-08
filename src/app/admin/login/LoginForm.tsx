"use client";

import { useState } from "react";
import styles from "./login.module.css";
import { Arrow } from "@/components/brand/Arrow";

const messages: Record<string, string> = {
  invalid: "Those sign-in details aren’t right. Please try again.",
  unavailable: "Sign-in is temporarily unavailable. Please try again.",
  throttled: "Too many attempts. Please wait 15 minutes before trying again.",
  unconfigured: "Sign-in isn’t configured on this server yet. Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET, then try again.",
};

/**
 * Posts as a plain form so sign-in still works without JavaScript; the client parts only
 * add the reveal toggle and a submitting state.
 */
export function LoginForm({ error, signedOut, ownerAccount, created }: { error?: string; signedOut?: boolean; ownerAccount?:boolean; created?:boolean }) {
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [empty, setEmpty] = useState(false);
  const message = error ? messages[error] ?? messages.invalid : "";

  return <>
    {created && <p className={styles.notice} role="status">Your owner account is ready. Sign in with your email and new password.</p>}
    {signedOut && !message ? <p className={styles.notice} role="status">You’ve been signed out.</p> : null}
    {message ? <p className={styles.error} role="alert">{message}</p> : null}

    <form
      action="/api/admin/login"
      method="post"
      onSubmit={(event) => {
        const value = new FormData(event.currentTarget).get("password");
        // Let the browser's own required-field message handle this rather than a round trip.
        if (typeof value !== "string" || !value.trim()) { event.preventDefault(); setEmpty(true); return; }
        setEmpty(false);
        setSubmitting(true);
      }}
    >
      {ownerAccount && <><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="username" required style={{marginBottom:18}} /></>}
      <label htmlFor="password">Admin password</label>
      <div className={styles.passwordField}>
        <input
          id="password" name="password" type={revealed ? "text" : "password"}
          autoComplete="current-password" required autoFocus
          aria-invalid={Boolean(message) || empty}
          aria-describedby={message || empty ? "password-error" : undefined}
          onChange={() => setEmpty(false)}
        />
        <button type="button" onClick={() => setRevealed((value) => !value)} aria-pressed={revealed} aria-label={revealed ? "Hide password" : "Show password"}>
          {revealed ? "Hide" : "Show"}
        </button>
      </div>
      {empty ? <p id="password-error" className={styles.fieldError} role="alert">Enter the admin password to continue.</p> : null}

      <button type="submit" disabled={submitting}>
        {submitting ? "Signing in…" : <>Open operations <Arrow /></>}
      </button>
    </form>
  </>;
}
