import type { PublicBookingPayload } from "@/lib/validation/public-booking";

export const MAX_PUBLIC_BOOKING_BODY_BYTES = 16 * 1024;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const MAX_RATE_LIMIT_ENTRIES = 10_000;
const BOOKING_DURATION_MS = 3 * 60 * 60 * 1000;

type RateLimitEntry = { count: number; resetAt: number };
const bookingRateLimit = new Map<string, RateLimitEntry>();

function clientAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",", 1)[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/** A bounded, best-effort Vercel function-instance guard; add durable edge limiting before launch. */
export function isPublicBookingRateLimited(request: Request, now = Date.now()) {
  const key = clientAddress(request);
  const current = bookingRateLimit.get(key);
  if (!current || current.resetAt <= now) {
    if (bookingRateLimit.size >= MAX_RATE_LIMIT_ENTRIES) {
      for (const [entryKey, entry] of bookingRateLimit) if (entry.resetAt <= now) bookingRateLimit.delete(entryKey);
      if (bookingRateLimit.size >= MAX_RATE_LIMIT_ENTRIES) {
        const oldestKey = bookingRateLimit.keys().next().value;
        if (oldestKey) bookingRateLimit.delete(oldestKey);
      }
    }
    bookingRateLimit.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

function africaLagosStart(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) throw new Error("INVALID_DATE");
  const start = new Date(`${date}T${time}:00+01:00`);
  if (Number.isNaN(start.valueOf())) throw new Error("INVALID_DATE");
  return start;
}

export function createBookingRpcRequest(booking: PublicBookingPayload, serviceId: string, idempotencyKey: string) {
  const start = africaLagosStart(booking.date, booking.time);
  const end = new Date(start.valueOf() + BOOKING_DURATION_MS);
  const amount = booking.amount ?? 0;
  return {
    idempotencyKey,
    source: "WEBSITE",
    serviceId,
    notes: booking.notes,
    customer: { fullName: booking.name, phone: booking.phone, email: booking.email, location: booking.location },
    quote: { currency: "NGN", subtotal: amount, discount: 0 },
    booking: { scheduledStartAt: start.toISOString(), scheduledEndAt: end.toISOString(), address: booking.address, locationNote: booking.location, currency: "NGN", total: amount },
    answers: [
      { questionLabel: "Property type", answer: booking.propertyType },
      { questionLabel: "Bedrooms / main rooms", answer: booking.bedrooms },
      { questionLabel: "Service area", answer: booking.location },
    ],
  };
}

export function resetPublicBookingRateLimitForTests() {
  bookingRateLimit.clear();
}
