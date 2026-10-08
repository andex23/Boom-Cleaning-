import { verifyPayment } from "@/features/payments/flutterwave";
import { isSameOriginRequest } from "@/lib/admin-auth";
import { readBoundedJson, isPublicBookingRateLimited } from "@/lib/public-booking";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!isSameOriginRequest(request)) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  if (isPublicBookingRateLimited(request)) return Response.json({ error: "Please try again shortly." }, { status: 429, headers });
  try {
    const body = await readBoundedJson(request) as { reference?: unknown };
    if (typeof body.reference !== "string") throw new Error();
    return Response.json(await verifyPayment(body.reference), { headers });
  } catch { return Response.json({ error: "Unable to verify this payment. Contact BOOM if you were charged." }, { status: 422, headers }); }
}
