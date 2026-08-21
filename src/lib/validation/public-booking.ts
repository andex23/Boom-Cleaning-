import { z } from "zod";
import { quoteItemSchema, spaceSelectionSchema } from "@/lib/validation/pricing";

const money = z.number().finite().nonnegative().multipleOf(0.01);
const slug = z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(100);

/**
 * Pricing *inputs* only. The browser deliberately cannot send an amount: the total is
 * computed by public.calculate_quote inside the booking transaction.
 */
export const publicBookingPayloadSchema = z.object({
  serviceSlug: slug,
  propertyTypeSlug: slug,
  areaSlug: slug,
  spaces: z.array(spaceSelectionSchema).max(40).default([])
    .refine((spaces) => new Set(spaces.map((space) => space.slug)).size === spaces.length, { message: "Each space may only appear once." }),
  address: z.string().trim().min(5).max(1000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // Slot times live in the booking_slots table; the route checks the value against it
  // rather than this schema pinning four times forever.
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(7).max(40),
  email: z.string().trim().email().max(320),
  notes: z.string().trim().max(1000),
});

export type PublicBookingPayload = z.infer<typeof publicBookingPayloadSchema>;

export const publicBookingResponseSchema = z.object({
  booking: z.object({
    id: z.string().trim().min(1).max(255),
    createdAt: z.string().datetime({ offset: true }),
    status: z.enum(["PENDING", "CONFIRMED", "REVIEW_REQUIRED"]),
    amount: money.nullable(),
    items: z.array(quoteItemSchema).max(60).default([]),
  }),
  email: z.object({ status: z.enum(["queued", "not_configured"]) }),
});

export type PublicBookingResponse = z.infer<typeof publicBookingResponseSchema>;
