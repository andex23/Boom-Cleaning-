import { verifyPayment } from "@/features/payments/flutterwave";
import { validFlutterwaveWebhook } from "@/features/payments/flutterwave-validation";
export const runtime = "nodejs";
export async function POST(request: Request) {
 if (!validFlutterwaveWebhook(request.headers.get("verif-hash"), process.env.FLUTTERWAVE_WEBHOOK_SECRET)) return new Response(null, { status: 401 });
 try {
  const body = await request.text();
  if (body.length > 100000) return new Response(null, { status: 413 });
  const event = JSON.parse(body);
  if (event.event === "charge.completed" && typeof event.data?.tx_ref === "string" && event.data.tx_ref.startsWith("BOOM-flw-")) await verifyPayment(event.data.tx_ref);
  return new Response(null, { status: 200 });
 } catch { return new Response(null, { status: 503 }); }
}
