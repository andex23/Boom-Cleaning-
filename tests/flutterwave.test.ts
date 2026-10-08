import { describe, it, expect } from "vitest";
import { validFlutterwaveCheckout, validFlutterwaveWebhook, flutterwavePaymentMatches } from "../src/features/payments/flutterwave-validation";
import { buildPaymentConfirmationEmail, buildAdminConfirmationEmail } from "../src/features/email/payment-confirmation-template";
const data = { outboxId: "preview", bookingNumber: 99, recipientName: "Customer", recipientEmail: "customer@example.com", serviceName: "Deep cleaning", scheduledStartAt: "2026-10-16T13:00:00Z", address: "Kubwa, Abuja", total: 86000, currency: "NGN", mode: "live" as const, paymentProvider: "Flutterwave" };
describe("Flutterwave live payment boundary", () => {
 it("requires exact reference, full amount, success and NGN", () => {
  const txn = { status: "successful", amount: 86000, currency: "NGN", tx_ref: "saved-reference" };
  const payment = { amount: "86000.00", currency: "NGN" };
  expect(flutterwavePaymentMatches(txn,payment,"saved-reference")).toBe(true);
  for(const patch of [{amount:860},{amount:86001},{currency:"USD"},{status:"failed"},{tx_ref:"another-reference"}]) expect(flutterwavePaymentMatches({...txn,...patch},payment,"saved-reference")).toBe(false);
 });
 it("rejects unauthenticated webhook requests and untrusted checkout URLs", () => {
  expect(validFlutterwaveWebhook("secret","secret")).toBe(true);
  expect(validFlutterwaveWebhook(null,"secret")).toBe(false);
  expect(validFlutterwaveWebhook("wrong","secret")).toBe(false);
  expect(validFlutterwaveWebhook("","")).toBe(false);
  expect(validFlutterwaveCheckout("https://checkout.flutterwave.com/v3/hosted/pay/flwlnk-example")).toBe(true);
  for(const url of ["http://checkout.flutterwave.com/v3/hosted/pay/x", "https://checkout.flutterwave.com.evil.test/v3/hosted/pay/x", "https://user:pass@checkout.flutterwave.com/v3/hosted/pay/x", "javascript:alert(1)"]) expect(validFlutterwaveCheckout(url)).toBe(false);
 });
 it("renders real customer and admin receipts without test or Paystack claims", () => {
  for(const email of [buildPaymentConfirmationEmail(data),buildAdminConfirmationEmail({...data,customerEmail:"customer@example.com",customerPhone:null})]) {
   expect(email.subject).not.toContain("TEST");
   expect(email.html).toContain("Flutterwave · Paid in full");
   expect(email.html).not.toContain("No real money");
   expect(email.text).not.toContain("test mode");
   expect(email.text).not.toContain("No real money");
   expect(email.html).toContain('src="https://boomcleaning.site/images/boom-logo.png"');
  }
 });
});
