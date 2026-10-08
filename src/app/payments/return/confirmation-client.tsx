"use client";

import { cancelledBookingPath, readStoredBookings } from "@/lib/booking-store";
import { useEffect, useState } from "react";
import { BookingConfirmationView } from "./confirmation-view";
import { bookingCalendar, confirmationState, type ConfirmationState, type PaidConfirmation } from "@/features/payments/payment-confirmation";

async function verify(signal?: AbortSignal): Promise<ConfirmationState> {
  const reference = new URLSearchParams(window.location.search).get("tx_ref") || new URLSearchParams(window.location.search).get("reference");
  if (!reference || !/^BOOM-(?:test|flw)-[a-f0-9-]{36}$/.test(reference)) return { kind: "missing" };
  const response = await fetch(reference.startsWith("BOOM-flw-") ? "/api/payments/flutterwave/verify" : "/api/payments/paystack/verify", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference }), signal,
  });
  if (!response.ok) return { kind: "error" };
  return confirmationState(await response.json());
}

function saveCalendar(payment: PaidConfirmation) {
  const url = URL.createObjectURL(new Blob([bookingCalendar(payment)], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${payment.bookingReference}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function ConfirmationClient() {
  const [state, setState] = useState<ConfirmationState>({ kind: "checking" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    let active = true;
    verify(controller.signal).then(result => {
      if (!active) return;
      const returnPath = cancelledBookingPath(window.location.search, readStoredBookings());
      if (returnPath && !("payment" in result)) { window.location.replace(returnPath); return; }
      setState(result);
    }).catch(() => {
      if (!active) return;
      const returnPath = cancelledBookingPath(window.location.search, readStoredBookings());
      if (returnPath) { window.location.replace(returnPath); return; }
      setState({ kind: "error" });
    }).finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, []);

  async function retry() {
    if (busy) return;
    setBusy(true);
    try { setState(await verify(AbortSignal.timeout(45000))); }
    catch { setState({ kind: "error" }); }
    finally { setBusy(false); }
  }

  return <BookingConfirmationView state={state} busy={busy} onRetry={retry} onCalendar={saveCalendar} onPrint={() => window.print()} />;
}
