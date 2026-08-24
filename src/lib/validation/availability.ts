import { z } from "zod";

export const availabilitySlotSchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/),
  label: z.string().trim().min(1).max(60),
  available: z.boolean(),
  reason: z.enum(["Past", "Closed", "Unavailable", "Booked"]).nullable(),
});

export const availabilityDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  openCount: z.number().int().min(0),
  slots: z.array(availabilitySlotSchema).max(24),
});

export const availabilityResultSchema = z.object({
  serviceSlug: z.string().trim().min(1).max(120),
  durationMinutes: z.number().int().positive(),
  days: z.array(availabilityDaySchema).max(200),
});

export type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>;
export type AvailabilityDay = z.infer<typeof availabilityDaySchema>;
export type AvailabilityResult = z.infer<typeof availabilityResultSchema>;
