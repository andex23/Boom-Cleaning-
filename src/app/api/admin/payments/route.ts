import { isAdminAuthenticated, isSameOriginRequest } from "@/lib/admin-auth";
import { readBoundedJson } from "@/lib/public-booking";
import { loadPayments, requestPayment, verifyPayment } from "@/features/payments/provider";
import { z } from "zod";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
async function authorized(request: Request) { return isSameOriginRequest(request) && await isAdminAuthenticated(); }
export async function GET(request: Request) {
  if (!await authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  try { return Response.json({ bookings: await loadPayments(), mode: "live" }, { headers }); }
  catch { return Response.json({ error: "Unable to load payments." }, { status: 502, headers }); }
}
export async function POST(request: Request) {
  if (!await authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  const schema = z.discriminatedUnion("action", [z.object({ action: z.literal("request"), bookingNumber: z.number().int().positive() }), z.object({ action: z.literal("verify"), reference: z.string().max(80) })]);
  try {
    const body = schema.parse(await readBoundedJson(request));
    const result = body.action === "request" ? await requestPayment(body.bookingNumber, new URL(request.url).origin) : await verifyPayment(body.reference);
    return Response.json(result, { headers });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Payment request failed." }, { status: 422, headers }); }
}
