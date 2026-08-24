import { afterEach, describe, expect, it } from "vitest";
import { createBookingRpcRequest, isPublicBookingRateLimited, isPublicQuoteRateLimited, resetPublicBookingRateLimitForTests } from "../src/lib/public-booking";
import { publicBookingPayloadSchema } from "../src/lib/validation/public-booking";

const validBooking = {
  serviceSlug: "deep-cleaning",
  propertyTypeSlug: "penthouse",
  areaSlug: "central",
  spaces: [{ slug: "bedroom", count: 3 }, { slug: "gazebo", count: 1 }, { slug: "balcony", count: 0 }],
  address: "18 Aso Drive, Maitama",
  date: "2026-08-20",
  time: "10:30",
  name: "Zainab Ibrahim",
  phone: "+234 803 000 0000",
  email: "zainab@example.com",
  notes: "Please call at the gate.",
};

afterEach(resetPublicBookingRateLimitForTests);

describe("public booking validation", () => {
  it("maps the public contract to the database RPC request in Africa/Lagos", () => {
    const payload = publicBookingPayloadSchema.parse(validBooking);
    const request = createBookingRpcRequest(payload, "booking-20260820-abcdef");
    expect(request.serviceSlug).toBe("deep-cleaning");
    expect(request.propertyTypeSlug).toBe("penthouse");
    expect(request.areaSlug).toBe("central");
    expect(request.booking.scheduledStartAt).toBe("2026-08-20T09:30:00.000Z");
  });

  it("sends pricing inputs only, so the browser cannot influence the amount", () => {
    const payload = publicBookingPayloadSchema.parse({ ...validBooking, amount: 1, total: 1, subtotal: 1 });
    const request = createBookingRpcRequest(payload, "booking-20260820-abcdef");
    const serialised = JSON.stringify(request);
    for (const field of ["amount", "subtotal", "total", "discount"]) {
      expect(serialised).not.toContain(`"${field}"`);
    }
    // The end time is derived from the service's own duration inside the database.
    expect(request.booking).not.toHaveProperty("scheduledEndAt");
  });

  it("drops empty space counts and records the described scope as answers", () => {
    const payload = publicBookingPayloadSchema.parse(validBooking);
    const request = createBookingRpcRequest(payload, "booking-20260820-abcdef");
    expect(request.spaces).toEqual([{ slug: "bedroom", count: 3 }, { slug: "gazebo", count: 1 }]);
    expect(request.answers).toEqual([
      { questionLabel: "Property type", answer: "penthouse" },
      { questionLabel: "Service area", answer: "central" },
      { questionLabel: "Space: bedroom", answer: 3 },
      { questionLabel: "Space: gazebo", answer: 1 },
    ]);
  });

  it("rejects a scope that names the same space twice", () => {
    const duplicated = { ...validBooking, spaces: [{ slug: "bedroom", count: 3 }, { slug: "bedroom", count: 2 }] };
    expect(publicBookingPayloadSchema.safeParse(duplicated).success).toBe(false);
  });

  it("limits repeated attempts from one function instance", () => {
    const request = new Request("https://boom.example/api/bookings", { headers: { "x-forwarded-for": "203.0.113.10" } });
    for (let count = 0; count < 5; count += 1) expect(isPublicBookingRateLimited(request, 1_700_000_000_000)).toBe(false);
    expect(isPublicBookingRateLimited(request, 1_700_000_000_000)).toBe(true);
  });

  it("gives quote previews their own budget so re-pricing does not exhaust booking attempts", () => {
    const request = new Request("https://boom.example/api/quote", { headers: { "x-forwarded-for": "203.0.113.11" } });
    for (let count = 0; count < 90; count += 1) expect(isPublicQuoteRateLimited(request, 1_700_000_000_000)).toBe(false);
    expect(isPublicQuoteRateLimited(request, 1_700_000_000_000)).toBe(true);
    expect(isPublicBookingRateLimited(request, 1_700_000_000_000)).toBe(false);
  });
});
