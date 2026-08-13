import { z } from "zod";

const money = z.number().finite().nonnegative().multipleOf(0.01);

export const publicBookingPayloadSchema = z.object({
  serviceSlug: z.string().trim().min(2).max(120),
  propertyType: z.enum(["apartment", "duplex", "detached", "office"]),
  bedrooms: z.number().int().min(1).max(8),
  location: z.enum(["central", "nearby", "outer"]),
  address: z.string().trim().min(5).max(1000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.enum(["08:00", "10:30", "13:00", "15:30"]),
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(7).max(40),
  email: z.string().trim().email().max(320),
  notes: z.string().trim().max(1000),
  amount: money.nullable(),
});

export type PublicBookingPayload = z.infer<typeof publicBookingPayloadSchema>;

export const publicBookingResponseSchema = z.object({
  booking: z.object({
    id: z.string().trim().min(1).max(255),
    createdAt: z.string().datetime({ offset: true }),
    status: z.enum(["PENDING", "CONFIRMED", "REVIEW_REQUIRED"]),
    amount: money.nullable().optional(),
  }),
  email: z.object({ status: z.enum(["queued", "not_configured"]) }),
});

export type PublicBookingResponse = z.infer<typeof publicBookingResponseSchema>;
