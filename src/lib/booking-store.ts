export const BOOKING_STORAGE_KEY = "boom-bookings-v1";

export type StoredBooking = {
  id: string;
  createdAt: string;
  customer: string;
  phone: string;
  email: string;
  service: string;
  serviceSlug: string;
  address: string;
  date: string;
  time: string;
  amount: number | null;
  status: "PENDING" | "CONFIRMED" | "REVIEW_REQUIRED";
  paymentReference?: string;
  paymentUrl?: string;
};

export function readStoredBookings(): StoredBooking[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(BOOKING_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed as StoredBooking[] : [];
  } catch {
    return [];
  }
}

export function saveStoredBooking(booking: StoredBooking) {
  const bookings = readStoredBookings();
  window.localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify([booking, ...bookings].slice(0, 25)));
  window.dispatchEvent(new CustomEvent("boom:booking-created", { detail: booking }));
}

export function subscribeStoredBookings(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("boom:booking-created", listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener("boom:booking-created", listener); };
}

export function storedBookingsSnapshot() {
  try { return window.localStorage.getItem(BOOKING_STORAGE_KEY) ?? "[]"; } catch { return "[]"; }
}

export function resumedBooking(snapshot: string, reference?: string): StoredBooking | null {
  if (!reference || !/^BOOM-\d+$/.test(reference)) return null;
  try {
    const values: unknown = JSON.parse(snapshot);
    return Array.isArray(values) ? values.find((item) => item?.id === reference && item.status === "PENDING" && typeof item.service === "string" && typeof item.date === "string") ?? null : null;
  } catch { return null; }
}

export function cancelledBookingPath(search: string, bookings: StoredBooking[]): string | null {
  const params = new URLSearchParams(search);
  if (!["cancelled", "canceled", "failed"].includes(params.get("status") ?? "")) return null;
  const reference = params.get("tx_ref");
  if (!reference || !/^BOOM-flw-[a-f0-9-]{36}$/.test(reference)) return null;
  const booking = bookings.find((item) => item.paymentReference === reference)
    ?? bookings.find((item) => item.status === "PENDING" && !item.paymentReference);
  return booking && /^BOOM-\d+$/.test(booking.id) ? `/quote?resume=${encodeURIComponent(booking.id)}` : "/quote";
}

export function safeBookingCheckout(url?: string): string | null {
  try {
    const parsed = new URL(url ?? "");
    return parsed.protocol === "https:" && parsed.hostname === "checkout.flutterwave.com" && !parsed.username && !parsed.password && parsed.pathname.startsWith("/v3/hosted/pay/") ? parsed.href : null;
  } catch { return null; }
}
