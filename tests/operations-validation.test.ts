import { describe, expect, it } from "vitest";
import { availabilityRuleSchema, blackoutSchema, bookingDraftSchema, messageSchema, outboxEventSchema, paymentIntentSchema, quoteDraftSchema } from "../src/lib/validation/operations";

const id = "123e4567-e89b-42d3-a456-426614174000";
const later = "2026-08-14T11:00:00+01:00";

describe("operations validation", () => {
  it("accepts a safe quote and prevents discounts above the subtotal", () => {
    expect(quoteDraftSchema.parse({ leadId: id, customerId: id, serviceId: id, subtotal: 10000 }).currency).toBe("NGN");
    expect(() => quoteDraftSchema.parse({ leadId: id, customerId: id, serviceId: id, subtotal: 100, discount: 101 })).toThrow(/Discount/);
  });

  it("requires chronological availability and booking windows", () => {
    expect(availabilityRuleSchema.parse({ weekday: 1, startsAt: "08:00:00", endsAt: "17:00:00" }).isActive).toBe(true);
    expect(() => availabilityRuleSchema.parse({ weekday: 1, startsAt: "17:00:00", endsAt: "08:00:00" })).toThrow();
    expect(() => blackoutSchema.parse({ startsAt: later, endsAt: "2026-08-14T10:00:00+01:00", reason: "Team event" })).toThrow();
    expect(() => bookingDraftSchema.parse({ leadId: id, customerId: id, serviceId: id, scheduledStartAt: later, scheduledEndAt: "2026-08-14T10:00:00+01:00", address: "12 Example Street", total: 10000 })).toThrow();
  });

  it("protects payment idempotency and message ownership", () => {
    expect(paymentIntentSchema.parse({ bookingId: id, provider: "Paystack", amount: 5000, idempotencyKey: "payment-attempt-0001" }).currency).toBe("NGN");
    expect(() => paymentIntentSchema.parse({ bookingId: id, provider: "P", amount: -1, idempotencyKey: "short" })).toThrow();
    expect(() => messageSchema.parse({ conversationId: id, direction: "OUTBOUND", body: "Hello" })).toThrow(/staff sender/);
  });

  it("requires stable, provider-safe outbox identifiers", () => {
    expect(outboxEventSchema.parse({ eventType: "booking.confirmed", aggregateType: "booking", aggregateId: id, idempotencyKey: "booking-confirmed-0001" }).payload).toEqual({});
    expect(() => outboxEventSchema.parse({ eventType: "x", aggregateType: "b", aggregateId: id, idempotencyKey: "short" })).toThrow();
  });
});
