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
  status: "CONFIRMED" | "REVIEW_REQUIRED";
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
