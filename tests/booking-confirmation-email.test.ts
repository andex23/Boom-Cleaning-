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

import { buildPaymentConfirmationEmail } from "../src/features/email/payment-confirmation-template";
const example = { outboxId: "design", bookingNumber: 12, recipientName: "<script>alert(1)</script>", recipientEmail: "boomcleaninfo@gmail.com", serviceName: "Deep cleaning", scheduledStartAt: "2026-10-10T08:00:00Z", address: "BOOM test address, Kubwa", currency: "NGN", total: 86000 };
describe("BOOM email states", () => {
 it("keeps unpaid booking details separate from confirmed payment receipts", () => {
  const pending = buildBookingConfirmationEmail(example);
  const paid = buildPaymentConfirmationEmail(example);
  expect(pending.html).toContain("AWAITING PAYMENT");
  expect(pending.html).not.toContain("PAYMENT VERIFIED · BOOKING CONFIRMED");
  expect(paid.html).toContain("PAYMENT VERIFIED · BOOKING CONFIRMED");
  expect(paid.html).toContain("No real money was collected.");
  expect(paid.html).not.toContain("<script>");
  expect(paid.html).toContain('lang="en" dir="ltr"');
 });
 it("only offers a payment action for an authentic Paystack checkout URL", () => {
  const valid = buildBookingConfirmationEmail({ ...example, paymentUrl: "https://checkout.paystack.com/testcheckout" });
  const unsafe = buildBookingConfirmationEmail({ ...example, paymentUrl: "javascript:alert(1)" });
  expect(valid.html).toContain('href="https://checkout.paystack.com/testcheckout"');
  expect(unsafe.html).not.toContain("javascript:");
  expect(unsafe.html).toContain("Get help with payment");
 });
});
