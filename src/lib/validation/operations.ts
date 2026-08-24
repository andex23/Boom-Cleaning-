import { z } from "zod";
import { BOOKING_STATUSES, CONVERSATION_CHANNELS, JOB_STATUSES, MESSAGE_DIRECTIONS, OUTBOX_STATUSES, PAYMENT_STATUSES, QUOTE_STATUSES } from "@/types/operations";

const uuid = z.uuid();
const money = z.number().finite().nonnegative().multipleOf(0.01);
const currency = z.string().regex(/^[A-Z]{3}$/, "Use a three-letter ISO currency code");
const timestamp = z.iso.datetime({ offset: true });

export const quoteDraftSchema = z.object({ leadId: uuid, customerId: uuid, serviceId: uuid, currency: currency.default("NGN"), subtotal: money, discount: money.default(0), expiresAt: timestamp.optional() }).superRefine((value, context) => {
  if (value.discount > value.subtotal) context.addIssue({ code: "custom", path: ["discount"], message: "Discount cannot exceed subtotal" });
});
export const quoteStatusSchema = z.enum(QUOTE_STATUSES);

export const availabilityRuleSchema = z.object({ staffId: uuid.optional(), weekday: z.number().int().min(0).max(6), startsAt: z.iso.time({ precision: 0 }), endsAt: z.iso.time({ precision: 0 }), timezone: z.string().trim().min(3).max(80).default("Africa/Lagos"), isActive: z.boolean().default(true) }).refine((value) => value.endsAt > value.startsAt, { path: ["endsAt"], message: "End time must be after start time" });
export const blackoutSchema = z.object({ staffId: uuid.optional(), startsAt: timestamp, endsAt: timestamp, reason: z.string().trim().min(2).max(500) }).refine((value) => new Date(value.endsAt) > new Date(value.startsAt), { path: ["endsAt"], message: "End time must be after start time" });

export const bookingDraftSchema = z.object({ leadId: uuid, customerId: uuid, serviceId: uuid, quoteId: uuid.optional(), scheduledStartAt: timestamp, scheduledEndAt: timestamp, address: z.string().trim().min(5).max(1000), locationNote: z.string().trim().max(1000).optional(), currency: currency.default("NGN"), total: money }).refine((value) => new Date(value.scheduledEndAt) > new Date(value.scheduledStartAt), { path: ["scheduledEndAt"], message: "End time must be after start time" });
export const bookingStatusSchema = z.enum(BOOKING_STATUSES);
export const paymentIntentSchema = z.object({ bookingId: uuid, provider: z.string().trim().min(2).max(80), currency: currency.default("NGN"), amount: money, idempotencyKey: z.string().trim().min(16).max(200) });
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export const jobStatusSchema = z.enum(JOB_STATUSES);

export const conversationSchema = z.object({ customerId: uuid, leadId: uuid.optional(), bookingId: uuid.optional(), channel: z.enum(CONVERSATION_CHANNELS), externalThreadId: z.string().trim().min(1).max(255).optional(), subject: z.string().trim().max(240).optional() });
export const messageSchema = z.object({ conversationId: uuid, direction: z.enum(MESSAGE_DIRECTIONS), body: z.string().trim().min(1).max(10000), externalMessageId: z.string().trim().min(1).max(255).optional(), sentByStaffId: uuid.optional() }).superRefine((value, context) => {
  if (value.direction === "OUTBOUND" && !value.sentByStaffId) context.addIssue({ code: "custom", path: ["sentByStaffId"], message: "Outbound messages require a staff sender" });
});

export const outboxEventSchema = z.object({ eventType: z.string().trim().min(2).max(160), aggregateType: z.string().trim().min(2).max(80), aggregateId: uuid, payload: z.record(z.string(), z.json()).default({}), idempotencyKey: z.string().trim().min(16).max(200) });
export const outboxStatusSchema = z.enum(OUTBOX_STATUSES);
