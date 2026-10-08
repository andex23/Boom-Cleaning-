import { z } from "zod";

export const paidConfirmationSchema = z.object({
  status: z.literal("PAID"),
  bookingStatus: z.string(),
  bookingReference: z.string().regex(/^BOOM-\d+$/),
  amount: z.number().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  mode: z.enum(["test", "live"]),
  paidAt: z.string().datetime({ offset: true }).nullable(),
  appointment: z.object({
    serviceName: z.string().min(1),
    scheduledStartAt: z.string().datetime({ offset: true }),
    scheduledEndAt: z.string().datetime({ offset: true }),
    address: z.string().min(1),
  }),
  receipt: z.object({ status: z.enum(["sent", "queued"]), email: z.string().nullable() }),
});

export const paymentConfirmationSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("PENDING") }),
  paidConfirmationSchema,
]);

export type PaidConfirmation = z.infer<typeof paidConfirmationSchema>;
export type ConfirmationState =
  | { kind: "checking" | "missing" | "pending" | "error" }
  | { kind: "confirmed" | "completed" | "attention"; payment: PaidConfirmation };

export function confirmationState(value: unknown): ConfirmationState {
  const result = paymentConfirmationSchema.safeParse(value);
  if (!result.success) return { kind: "error" };
  if (result.data.status === "PENDING") return { kind: "pending" };
  const kind = result.data.bookingStatus === "CONFIRMED" ? "confirmed" : result.data.bookingStatus === "COMPLETED" ? "completed" : "attention";
  return { kind, payment: result.data };
}

export function maskReceiptEmail(email: string | null | undefined) {
  if (!email || !email.includes("@")) return null;
  const [name, domain] = email.split("@");
  return `${name[0]}***@${domain}`;
}

export function appointmentDate(value: string) {
  const date = new Date(value);
  const options = { timeZone: "Africa/Lagos" };
  return {
    day: new Intl.DateTimeFormat("en-GB", { ...options, day: "numeric" }).format(date),
    month: new Intl.DateTimeFormat("en-GB", { ...options, month: "short", year: "numeric" }).format(date),
    weekday: new Intl.DateTimeFormat("en-GB", { ...options, weekday: "long" }).format(date),
    time: new Intl.DateTimeFormat("en-GB", { ...options, hour: "numeric", minute: "2-digit", hour12: true }).format(date),
    full: new Intl.DateTimeFormat("en-GB", { ...options, dateStyle: "long" }).format(date),
  };
}

// RFC 5545: escape TEXT and fold at 75 octets, keeping UTF-8 characters intact.
// https://www.rfc-editor.org/rfc/rfc5545#section-3.1
function calendarText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function foldLine(value: string) {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let line = "";
  let bytes = 0;
  for (const character of value) {
    const length = encoder.encode(character).length;
    if (bytes + length > 75) { lines.push(line); line = " "; bytes = 1; }
    line += character;
    bytes += length;
  }
  lines.push(line);
  return lines.join("\r\n");
}

export function bookingCalendar(payment: PaidConfirmation, createdAt = new Date()) {
  if (payment.bookingStatus !== "CONFIRMED") throw new Error("Only confirmed bookings can be added to a calendar.");
  const date = (value: string | Date) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const appointment = payment.appointment;
  if (new Date(appointment.scheduledEndAt) <= new Date(appointment.scheduledStartAt)) throw new Error("Invalid appointment window.");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BOOM Cleaning//Bookings//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:${payment.bookingReference}@boomcleaning.site`, `DTSTAMP:${date(createdAt)}`,
    `DTSTART:${date(appointment.scheduledStartAt)}`, `DTEND:${date(appointment.scheduledEndAt)}`,
    `SUMMARY:${calendarText(`BOOM Cleaning: ${appointment.serviceName}`)}`,
    `LOCATION:${calendarText(appointment.address)}`,
    `DESCRIPTION:${calendarText(`${payment.mode === "test" ? `Test booking ${payment.bookingReference}. No real money was collected.` : `Confirmed booking ${payment.bookingReference}. Full payment received.`}\nPlease make sure the team can access the property at your scheduled arrival time.\nFor changes, contact boomcleaninfo@gmail.com or 0902 979 9205.`)}`,
    "STATUS:CONFIRMED", "CLASS:PRIVATE", "END:VEVENT", "END:VCALENDAR", "",
  ].map(foldLine).join("\r\n");
}
