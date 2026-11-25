import "server-only";
import { processPaymentConfirmationEmails } from "@/features/email/payment-confirmation-worker";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { paymentMatches } from "./paystack-validation";
import { maskReceiptEmail, paidConfirmationSchema } from "./payment-confirmation";
export function paystackSecret() {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret?.startsWith("sk_test_")) throw new Error("Paystack test mode is not configured.");
  return secret;
}
async function paystack(path: string, body?: unknown) {
  const response = await fetch(`https://api.paystack.co${path}`, {
    method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${paystackSecret()}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store", signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  if (!response.ok || result.status !== true) throw new Error("Paystack could not complete the request. Please retry.");
  return result.data;
}
export async function requestPayment(bookingNumber: number, origin: string) {
  const db = createServiceRoleClient();
  const { data: prepared, error } = await db.rpc("prepare_paystack_test_payment", { booking_number_value: bookingNumber });
  if (error || !prepared) throw new Error(error?.code === "22023" ? error.message : "Unable to prepare payment request.");
  const row = z.object({ reference: z.string(), url: z.url().nullable(), amount: z.coerce.number().positive(), email: z.email() }).parse(prepared);
  if (row.url) return { provider_reference: row.reference, provider_payload: { authorization_url: row.url } };
  const reference = row.reference;
  const data = z.object({ authorization_url: z.url(), reference: z.string() }).parse(await paystack("/transaction/initialize", { email: row.email, amount: Math.round(row.amount * 100), currency: "NGN", reference, callback_url: `${origin}/payments/return`, metadata: { booking_number: bookingNumber } }));
  if (new URL(data.authorization_url).hostname !== "checkout.paystack.com" || data.reference !== reference) throw new Error("Unexpected Paystack checkout response.");
  const payload = { authorization_url: data.authorization_url };
  const { error: updateError } = await db.from("payments").update({ provider_payload: payload }).eq("provider_reference", reference).eq("provider", "paystack_test");
  if (updateError) throw new Error("Unable to save checkout link.");
  return { provider_reference: reference, provider_payload: payload };
}
export async function verifyPayment(reference: string) {
  if (!/^BOOM-test-[a-f0-9-]{36}$/.test(reference)) throw new Error("Invalid payment reference.");
  const db = createServiceRoleClient();
  const { data: payment, error } = await db.from("payments").select("id,amount,currency,status,booking_id").eq("provider", "paystack_test").eq("provider_reference", reference).single();
  if (error || !payment) throw new Error("Payment request not found.");
  const transaction = z.object({ status: z.string(), amount: z.number().int(), currency: z.string(), domain: z.string(), reference: z.string(), paid_at: z.string().nullable() }).parse(await paystack(`/transaction/verify/${encodeURIComponent(reference)}`));
  if (transaction.reference !== reference) throw new Error("Payment reference mismatch.");
  if (transaction.status !== "success") return { status: "PENDING" };
  if (!paymentMatches(transaction, payment)) throw new Error("Payment amount, currency or test mode does not match.");
  const { error: settledError } = await db.rpc("settle_paystack_test_payment", { reference_value: reference, amount_minor: transaction.amount, currency_value: transaction.currency });
  if (settledError) throw new Error("Unable to record payment. Please retry verification.");
  try { await processPaymentConfirmationEmails(1); } catch { console.error("Payment receipt delivery will retry."); }
  const [{ data: booking, error: bookingError }, { data: receipt }] = await Promise.all([
    db.from("bookings").select("status,booking_number,scheduled_start_at,scheduled_end_at,address,services(name),customers(email)").eq("id", payment.booking_id).single(),
    db.from("automation_outbox").select("status").eq("event_type", "booking.payment_confirmed").eq("aggregate_id", payment.booking_id).maybeSingle(),
  ]);
  if (bookingError || !booking) throw new Error("Unable to load your booking details. Please retry.");
  const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
  const customer = Array.isArray(booking.customers) ? booking.customers[0] : booking.customers;
  return paidConfirmationSchema.parse({
    status: "PAID", bookingStatus: booking.status, bookingReference: `BOOM-${booking.booking_number}`,
    amount: Number(payment.amount), currency: payment.currency, mode: "test", paidAt: transaction.paid_at,
    appointment: { serviceName: service?.name, scheduledStartAt: booking.scheduled_start_at, scheduledEndAt: booking.scheduled_end_at, address: booking.address },
    receipt: { status: receipt?.status === "DELIVERED" ? "sent" : "queued", email: maskReceiptEmail(customer?.email) },
  });
}
export async function loadPayments() {
  const db = createServiceRoleClient();
  const { data, error } = await db.from("bookings").select("booking_number,status,total,currency,customers(full_name,email),quotes(requires_review),payments(id,provider,provider_reference,status,amount,paid_at,provider_payload)").order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error("Unable to load payments.");
  return data;
}
