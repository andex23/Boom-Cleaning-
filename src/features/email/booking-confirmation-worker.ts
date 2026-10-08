import "server-only";

import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { buildBookingConfirmationEmail, type BookingConfirmationEmailData } from "./booking-confirmation-template";

const claimSchema = z.object({
  outboxId: z.uuid(), bookingId: z.uuid(), bookingNumber: z.number().int().positive(), recipientName: z.string().nullable(), recipientEmail: z.email(), serviceName: z.string().min(1), scheduledStartAt: z.string().datetime({ offset: true }), scheduledEndAt: z.string().datetime({ offset: true }), address: z.string().min(5), currency: z.string().regex(/^[A-Z]{3}$/), total: z.coerce.number().nonnegative(), paymentUrl: z.url().nullable().optional(),
});

type ResendConfig = { apiKey: string; from: string; replyTo: string };

function getResendConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || "boomcleaninfo@gmail.com";
  return apiKey && from ? { apiKey, from, replyTo } : null;
}

async function sendWithResend(config: ResendConfig, message: BookingConfirmationEmailData) {
  const content = buildBookingConfirmationEmail(message);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `booking-confirmation:${message.outboxId}`, "User-Agent": "boom-cleaning-booking-email/1.0" },
    body: JSON.stringify({ from: config.from, reply_to: config.replyTo, to: [message.recipientEmail], subject: content.subject, html: content.html, text: content.text }),
  });
  if (!response.ok) throw new Error(`Resend returned ${response.status}: ${(await response.text()).slice(0, 400)}`);
  const result = z.object({ id: z.string().optional() }).safeParse(await response.json());
  return result.success ? result.data.id ?? null : null;
}

export async function processBookingConfirmationEmails(limit = 10, bookingId?: string) {
  const config = getResendConfig();
  if (!config) return { providerConfigured: false, claimed: 0, sent: 0, failed: 0 };

  const supabase = createServiceRoleClient();
  let queue = supabase.from("automation_outbox").select("id").eq("event_type", "booking.requested").in("status", ["PENDING", "FAILED"]).lte("available_at", new Date().toISOString()).order("created_at", { ascending: true }).limit(Math.min(Math.max(limit, 1), 25));
  if (bookingId) queue = queue.eq("aggregate_id", bookingId);
  const { data: outboxRows, error: outboxError } = await queue;
  if (outboxError) throw new Error("Unable to load pending booking confirmations");

  let claimed = 0;
  let sent = 0;
  let failed = 0;
  for (const row of outboxRows ?? []) {
    const { data: rawClaim, error: claimError } = await supabase.rpc("claim_booking_confirmation_email", { outbox_id_value: row.id });
    if (claimError) {
      console.error("Unable to claim booking confirmation", { code: claimError.code });
      failed += 1;
      continue;
    }
    const claim = claimSchema.safeParse(rawClaim);
    if (!claim.success) continue;
    claimed += 1;
    try {
      const checkout = await supabase.from("payments").select("provider_payload").eq("booking_id", claim.data.bookingId).in("provider", ["flutterwave", "paystack_test"]).eq("status", "PENDING").order("created_at", { ascending: false }).limit(1);
      const providerMessageId = await sendWithResend(config, { ...claim.data, paymentUrl: checkout.data?.[0]?.provider_payload?.authorization_url ?? null });
      const { error: completeError } = await supabase.rpc("complete_booking_confirmation_email", { outbox_id_value: claim.data.outboxId, was_sent: true, provider_value: "resend", provider_message_id_value: providerMessageId, error_value: null });
      if (completeError) throw new Error("Unable to mark booking confirmation as delivered");
      sent += 1;
    } catch (error) {
      const reason = error instanceof Error ? error.message.slice(0, 1_000) : "Unknown email delivery failure";
      const { error: completeError } = await supabase.rpc("complete_booking_confirmation_email", { outbox_id_value: claim.data.outboxId, was_sent: false, provider_value: "resend", provider_message_id_value: null, error_value: reason });
      if (completeError) console.error("Unable to schedule booking confirmation retry", { code: completeError.code });
      failed += 1;
    }
  }
  return { providerConfigured: true, claimed, sent, failed };
}
