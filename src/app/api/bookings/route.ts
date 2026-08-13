import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isSameOriginRequest } from "@/lib/admin-auth";
import { createBookingRpcRequest, isPublicBookingRateLimited, MAX_PUBLIC_BOOKING_BODY_BYTES } from "@/lib/public-booking";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { publicBookingPayloadSchema, publicBookingResponseSchema } from "@/lib/validation/public-booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idempotencyKeySchema = z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{15,199}$/);
const rpcResultSchema = z.object({ bookingId: z.uuid(), bookingNumber: z.number().int().positive(), status: z.literal("PENDING") });

async function readBoundedJson(request: Request): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_PUBLIC_BOOKING_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_JSON");

  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_PUBLIC_BOOKING_BODY_BYTES) {
      await reader.cancel();
      throw new Error("PAYLOAD_TOO_LARGE");
    }
    text += decoder.decode(value, { stream: true });
  }
  try {
    return JSON.parse(text + decoder.decode());
  } catch {
    throw new Error("INVALID_JSON");
  }
}

function publicError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return publicError("Forbidden", 403);
  if (isPublicBookingRateLimited(request)) return publicError("Too many booking attempts. Please try again later.", 429);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return publicError("Content-Type must be application/json.", 415);

  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch (error) {
    return publicError(error instanceof Error && error.message === "PAYLOAD_TOO_LARGE" ? "Request body is too large." : "Request body must be valid JSON.", error instanceof Error && error.message === "PAYLOAD_TOO_LARGE" ? 413 : 400);
  }

  const booking = publicBookingPayloadSchema.safeParse(body);
  if (!booking.success) return NextResponse.json({ error: "Invalid booking request.", issues: booking.error.flatten() }, { status: 422, headers: { "Cache-Control": "no-store" } });

  const suppliedKey = request.headers.get("idempotency-key");
  const parsedKey = suppliedKey ? idempotencyKeySchema.safeParse(suppliedKey) : null;
  if (parsedKey && !parsedKey.success) return publicError("Invalid Idempotency-Key header.", 422);
  const idempotencyKey = parsedKey?.data ?? randomUUID();

  const serviceClient = createServiceRoleClient();
  const { data: service, error: serviceError } = await serviceClient.from("services").select("id").eq("slug", booking.data.serviceSlug).eq("is_active", true).maybeSingle();
  if (serviceError) {
    console.error("Public booking service lookup failed", { code: serviceError.code });
    return publicError("Unable to create booking. Please try again.", 502);
  }
  if (!service) return publicError("The requested service is unavailable.", 422);

  let rpcPayload: ReturnType<typeof createBookingRpcRequest>;
  try {
    rpcPayload = createBookingRpcRequest(booking.data, service.id, idempotencyKey);
  } catch {
    return publicError("Invalid booking date.", 422);
  }
  const { data, error } = await serviceClient.rpc("create_booking_from_request", { request: rpcPayload });
  if (error) {
    console.error("Public booking RPC failed", { code: error.code });
    if (error.code === "23P01") return publicError("The requested time is no longer available.", 409);
    if (error.code === "22023" || error.code === "23503") return publicError("Invalid booking request.", 422);
    return publicError("Unable to create booking. Please try again.", 502);
  }

  const result = rpcResultSchema.safeParse(Array.isArray(data) ? data[0] : data);
  if (!result.success) {
    console.error("Public booking RPC returned an invalid result");
    return publicError("Unable to create booking. Please try again.", 502);
  }
  const bookingReference = `BOOM-${result.data.bookingNumber}`;
  const emailStatus = process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim() ? "queued" : "not_configured";
  return NextResponse.json(publicBookingResponseSchema.parse({ booking: { id: bookingReference, createdAt: new Date().toISOString(), status: result.data.status, amount: booking.data.amount }, email: { status: emailStatus } }), { status: 201, headers: { "Cache-Control": "no-store" } });
}
