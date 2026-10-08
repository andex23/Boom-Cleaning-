import { createHash, timingSafeEqual } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { verifyPayment } from "@/features/payments/provider";
import { processPaymentConfirmationEmails } from "@/features/email/payment-confirmation-worker";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /i, "");
  if (!secret || !supplied || !timingSafeEqual(createHash("sha256").update(secret).digest(), createHash("sha256").update(supplied).digest())) return new Response(null, { status: 401 });
  const db = createServiceRoleClient();
  const retention = await db.from("website_visits").delete().lt("visited_at",new Date(Date.now()-90*86400000).toISOString());
  if (retention.error) console.error("Analytics retention failed");
  const { data, error } = await db.from("payments").select("provider_reference").in("provider", ["flutterwave", "paystack_test"]).eq("status", "PENDING").gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).order("updated_at").limit(10);
  if (error) return new Response(null, { status: 503 });
  let verified = 0;
  for (const payment of data ?? []) {
    try { if ((await verifyPayment(payment.provider_reference)).status === "PAID") verified++; }
    catch { /* Retry next scheduled run; do not trust an unavailable provider. */ }
    await db.from("payments").update({ updated_at: new Date().toISOString() }).eq("provider_reference", payment.provider_reference).in("provider", ["flutterwave", "paystack_test"]);
  }
  return Response.json({ checked: data?.length ?? 0, verified, receipts: await processPaymentConfirmationEmails() }, { headers: { "Cache-Control": "no-store" } });
}
