import { describe, expect, it } from "vitest";
import { bookingFollowUpLinks } from "@/features/operations/booking-follow-up";

const booking = { reference: "BOOM-15", customer: "Ada & Co", customerPhone: "0801 234 5678", customerEmail: "ada@example.com", serviceName: "Deep cleaning", total: 60000 };

describe("booking follow-up contact links", () => {
  it("normalizes Nigerian phone numbers for calling and WhatsApp", () => {
    for (const customerPhone of ["0801 234 5678", "+234 (801) 234-5678", "2348012345678"]) {
      const links = bookingFollowUpLinks({ ...booking, customerPhone });
      expect(links.call).toBe("tel:+2348012345678");
      expect(new URL(links.whatsapp!).pathname).toBe("/2348012345678");
    }
  });
  it("prepares encoded drafts with the correct customer and booking", () => {
    const links = bookingFollowUpLinks(booking);
    const message = new URL(links.whatsapp!).searchParams.get("text");
    expect(message).toContain("Ada & Co");
    expect(message).toContain("BOOM-15");
    expect(message).toContain("Payment confirmation is still pending");
    expect(new URL(links.email!).searchParams.get("body")).toBe(message);
    expect(new URL(links.email!).searchParams.get("subject")).toBe("Your BOOM booking BOOM-15");
  });
  it("does not generate unusable contact actions", () => {
    expect(bookingFollowUpLinks({ ...booking, customerPhone: "not a phone", customerEmail: null })).toEqual({ call: null, whatsapp: null, email: null });
    expect(bookingFollowUpLinks({ ...booking, customerPhone: null }).call).toBeNull();
  });
});
