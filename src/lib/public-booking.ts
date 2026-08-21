import type { PublicBookingPayload } from "@/lib/validation/public-booking";

export const MAX_PUBLIC_BOOKING_BODY_BYTES = 16 * 1024;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
// Quote previews are re-priced as the customer adjusts space counts, so they need a much
// larger budget than the booking write itself.
const QUOTE_RATE_LIMIT_MAX_REQUESTS = 90;
const MAX_RATE_LIMIT_ENTRIES = 10_000;

type RateLimitEntry = { count: number; resetAt: number };
const bookingRateLimit = new Map<string, RateLimitEntry>();
const quoteRateLimit = new Map<string, RateLimitEntry>();

function clientAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",", 1)[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/** A bounded, best-effort Vercel function-instance guard; add durable edge limiting before launch. */
function isRateLimited(bucket: Map<string, RateLimitEntry>, request: Request, max: number, now: number) {
  const key = clientAddress(request);
  const current = bucket.get(key);
  if (!current || current.resetAt <= now) {
    if (bucket.size >= MAX_RATE_LIMIT_ENTRIES) {
      for (const [entryKey, entry] of bucket) if (entry.resetAt <= now) bucket.delete(entryKey);
      if (bucket.size >= MAX_RATE_LIMIT_ENTRIES) {
        const oldestKey = bucket.keys().next().value;
        if (oldestKey) bucket.delete(oldestKey);
      }
    }
    bucket.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > max;
}

export function isPublicBookingRateLimited(request: Request, now = Date.now()) {
  return isRateLimited(bookingRateLimit, request, RATE_LIMIT_MAX_REQUESTS, now);
}

export function isPublicQuoteRateLimited(request: Request, now = Date.now()) {
  return isRateLimited(quoteRateLimit, request, QUOTE_RATE_LIMIT_MAX_REQUESTS, now);
}

/** Reads a JSON body without buffering more than the public request budget. */
export async function readBoundedJson(request: Request): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_PUBLIC_BOOKING_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_JSON");

  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_PUBLIC_BOOKING_BODY_BYTES) {
      await reader.cancel();
      throw new Error("PAYLOAD_TOO_LARGE");
    }
    text += decoder.decode(value, { stream: true });
  }
  try {
    return JSON.parse(text + decoder.decode());
  } catch {
    throw new Error("INVALID_JSON");
  }
}

function africaLagosStart(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) throw new Error("INVALID_DATE");
  const start = new Date(`${date}T${time}:00+01:00`);
  if (Number.isNaN(start.valueOf())) throw new Error("INVALID_DATE");
  return start;
}

/**
 * Builds the RPC request from pricing *inputs*. No amount is sent: the database prices the
 * scope in the same transaction that writes the booking, and derives the end time from the
 * service's own duration.
 */
export function createBookingRpcRequest(booking: PublicBookingPayload, idempotencyKey: string) {
  const start = africaLagosStart(booking.date, booking.time);
  const spaces = booking.spaces.filter((space) => space.count > 0);
  return {
    idempotencyKey,
    source: "WEBSITE",
    serviceSlug: booking.serviceSlug,
    propertyTypeSlug: booking.propertyTypeSlug,
    areaSlug: booking.areaSlug,
    spaces,
    notes: booking.notes,
    customer: { fullName: booking.name, phone: booking.phone, email: booking.email, location: booking.areaSlug },
    booking: { scheduledStartAt: start.toISOString(), address: booking.address, locationNote: booking.areaSlug },
    answers: [
      { questionLabel: "Property type", answer: booking.propertyTypeSlug },
      { questionLabel: "Service area", answer: booking.areaSlug },
      ...spaces.map((space) => ({ questionLabel: `Space: ${space.slug}`, answer: space.count })),
    ],
  };
}

export function resetPublicBookingRateLimitForTests() {
  bookingRateLimit.clear();
  quoteRateLimit.clear();
}
