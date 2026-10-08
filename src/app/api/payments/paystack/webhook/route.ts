import { paystackSecret, verifyPayment } from "@/features/payments/paystack";
import { validPaystackSignature } from "@/features/payments/paystack-validation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (body.length > 100000) return new Response(null, { status: 413 });
    if (!validPaystackSignature(body, request.headers.get("x-paystack-signature"), paystackSecret())) return new Response(null, { status: 401 });
    const event = JSON.parse(body);
    if (event.event === "charge.success" && typeof event.data?.reference === "string" && event.data.reference.startsWith("BOOM-test-")) await verifyPayment(event.data.reference);
    return new Response(null, { status: 200 });
  } catch { return new Response(null, { status: 503 }); }
}
