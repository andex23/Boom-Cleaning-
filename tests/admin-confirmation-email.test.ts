import { describe, it, expect, vi, afterEach } from "vitest";
import { buildAdminConfirmationEmail } from "../src/features/email/payment-confirmation-template";
const { rpc, from, fetchMock } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), fetchMock: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient: () => ({ rpc, from }) }));
import { processPaymentConfirmationEmails } from "../src/features/email/payment-confirmation-worker";
const data = { outboxId: "00000000-0000-4000-8000-000000000001", bookingId: "00000000-0000-4000-8000-000000000002", bookingNumber: 15, recipientName: "Customer <script>", recipientEmail: "boomcleaninfo@gmail.com", customerEmail: "customer@example.com", customerPhone: "+234123456789", serviceName: "Post-construction cleaning", scheduledStartAt: "2026-10-16T13:00:00Z", scheduledEndAt: "2026-10-16T21:00:00Z", address: "Kubwa, Abuja", currency: "NGN", total: 220000 };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetAllMocks(); });
describe("Admin booking confirmation", () => {
 it("includes operational details, escapes customer input and labels test payment", () => {
  const email = buildAdminConfirmationEmail(data);
  expect(email.subject).toBe("New confirmed booking · BOOM-15 [TEST]");
  for (const value of ["customer@example.com", "+234123456789", "Kubwa, Abuja", "Post-construction cleaning", "2:00", "No real money", "Return to home"]) expect(email.html).toContain(value);
  expect(email.html).toContain("Customer &lt;script&gt;");
  expect(email.html).not.toContain("Customer <script>");
  expect(email.text).not.toContain("staff approval");
 });
 it("sends the independent admin event even when the customer send fails", async () => {
  vi.stubEnv("RESEND_API_KEY", "fake-test-key"); vi.stubEnv("EMAIL_FROM", "BOOM <bookings@boomcleaning.site>");
  let event = "";
  const chain = { select: () => chain, eq: (_: string, value: string) => { event = value; return chain; }, in: () => chain, lte: () => chain, order: () => chain, limit: async () => ({ data: [{ id: event === "booking.admin_confirmed" ? "admin" : "customer" }], error: null }) };
  from.mockReturnValue(chain);
  rpc.mockImplementation(async (name: string, args?: { outbox_id_value: string }) => name === "claim_payment_confirmation_email" ? { data: { ...data, audience: args?.outbox_id_value === "admin" ? "admin" : "customer", recipientEmail: args?.outbox_id_value === "admin" ? "boomcleaninfo@gmail.com" : "customer@example.com", outboxId: args?.outbox_id_value === "admin" ? "00000000-0000-4000-8000-000000000003" : data.outboxId }, error: null } : { data: true, error: null });
  fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => "Temporary failure" }).mockResolvedValueOnce({ ok: true, json: async () => ({ id: "admin-provider-id" }) });
  vi.stubGlobal("fetch", fetchMock);
  expect(await processPaymentConfirmationEmails(1)).toEqual({ providerConfigured: true, claimed: 2, sent: 1, failed: 1 });
  const request = fetchMock.mock.calls[1][1];
  expect(JSON.parse(request.body).to).toEqual(["boomcleaninfo@gmail.com"]);
  expect(JSON.parse(request.body).subject).toContain("New confirmed booking");
  expect(request.headers["Idempotency-Key"]).toBe("payment-confirmation:00000000-0000-4000-8000-000000000003");
  expect(rpc).toHaveBeenCalledWith("complete_payment_confirmation_email", expect.objectContaining({ provider_message_id_value: "admin-provider-id", was_sent: true }));
 });
});
