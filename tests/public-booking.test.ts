import { afterEach, describe, expect, it } from "vitest";
import { createBookingRpcRequest, isPublicBookingRateLimited, resetPublicBookingRateLimitForTests } from "../src/lib/public-booking";
import { publicBookingPayloadSchema } from "../src/lib/validation/public-booking";

const validBooking = {
  serviceSlug: "deep-cleaning", propertyType: "apartment", bedrooms: 2, location: "central", address: "18 Aso Drive, Maitama", date: "2026-08-20", time: "10:30", name: "Zainab Ibrahim", phone: "+234 803 000 0000", email: "zainab@example.com", notes: "Please call at the gate.", amount: 60000,
};

afterEach(resetPublicBookingRateLimitForTests);

describe("public booking validation", () => {
  it("maps the public contract to the database RPC request in Africa/Lagos", () => {
    const payload = publicBookingPayloadSchema.parse(validBooking);
    const request = createBookingRpcRequest(payload, "123e4567-e89b-42d3-a456-426614174000", "booking-20260820-abcdef");
    expect(request.serviceId).toBe("123e4567-e89b-42d3-a456-426614174000");
    expect(request.booking).toMatchObject({ scheduledStartAt: "2026-08-20T09:30:00.000Z", scheduledEndAt: "2026-08-20T12:30:00.000Z", total: 60000 });
    expect(request.answers).toHaveLength(3);
  });

  it("limits repeated attempts from one function instance", () => {
    const request = new Request("https://boom.example/api/bookings", { headers: { "x-forwarded-for": "203.0.113.10" } });
    for (let count = 0; count < 5; count += 1) expect(isPublicBookingRateLimited(request, 1_700_000_000_000)).toBe(false);
    expect(isPublicBookingRateLimited(request, 1_700_000_000_000)).toBe(true);
  });
});
