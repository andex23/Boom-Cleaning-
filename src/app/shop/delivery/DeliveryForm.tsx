"use client";

import { useState, type FormEvent } from "react";
import styles from "../shop.module.css";

export function DeliveryForm({ quantity, price }: { quantity: number; price: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const body = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/shop/checkout", { method: "POST", body });
      if (!response.ok) throw new Error();
      const { url } = await response.json();
      window.location.assign(url);
    } catch {
      setError("Checkout could not start. Check your details and try again.");
      setBusy(false);
    }
  }

  return <form method="post" action="/shop/checkout" onSubmit={submit} className={styles.fields}>
    <input type="hidden" name="quantity" value={quantity} />
    <label>Full name<input name="name" autoComplete="name" required maxLength={100} /></label>
    <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
    <label>Phone number<input name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={25} /></label>
    <label>Street address<input name="address" autoComplete="street-address" placeholder="House number, street and area" required maxLength={250} /></label>
    <label>City or town<input name="city" autoComplete="address-level2" required maxLength={100} /></label>
    <label>State or FCT<input name="state" autoComplete="address-level1" required maxLength={100} /></label>
    <label>Delivery instructions (optional)<textarea name="instructions" placeholder="Landmark or directions for the rider" rows={2} maxLength={300} /></label>
    {error && <p role="alert">{error}</p>}
    <button type="submit" disabled={busy}>{busy ? "Opening payment page…" : `Pay ${price}`}</button>
  </form>;
}
