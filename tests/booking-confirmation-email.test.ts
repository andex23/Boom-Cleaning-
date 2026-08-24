import { describe, expect, it } from "vitest";
import { buildBookingConfirmationEmail } from "../src/features/email/booking-confirmation-template";

describe("booking confirmation email", () => {
  it("creates an escaped, customer-facing confirmation with the booking reference", () => {
    const email = buildBookingConfirmationEmail({ outboxId: "123e4567-e89b-42d3-a456-426614174000", bookingNumber: 24, recipientName: "Zainab <Ibrahim>", recipientEmail: "zainab@example.com", serviceName: "Deep cleaning", scheduledStartAt: "2026-08-20T09:30:00.000Z", address: "18 Aso Drive, Maitama", currency: "NGN", total: 60000 });
    expect(email.subject).toContain("BOOM-24");
    expect(email.html).toContain("Zainab &lt;Ibrahim&gt;");
    expect(email.text).toContain("Abuja time");
  });
});
