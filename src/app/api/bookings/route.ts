import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isSameOriginRequest } from "@/lib/admin-auth";
import { createBookingRpcRequest, isPublicBookingRateLimited, readBoundedJson } from "@/lib/public-booking";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { publicBookingPayloadSchema, publicBookingResponseSchema } from "@/lib/validation/public-booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idempotencyKeySchema = z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{15,199}$/);
const rpcResultSchema = z.object({
  bookingId: z.uuid(),
  bookingNumber: z.number().int().positive(),
  status: z.literal("PENDING"),
  total: z.coerce.number().finite().nonnegative(),
  requiresReview: z.boolean(),
});

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
    const tooLarge = error instanceof Error && error.message === "PAYLOAD_TOO_LARGE";
    return publicError(tooLarge ? "Request body is too large." : "Request body must be valid JSON.", tooLarge ? 413 : 400);
  }

  const booking = publicBookingPayloadSchema.safeParse(body);
  if (!booking.success) return NextResponse.json({ error: "Invalid booking request.", issues: z.flattenError(booking.error) }, { status: 422, headers: { "Cache-Control": "no-store" } });

  const suppliedKey = request.headers.get("idempotency-key");
  const parsedKey = suppliedKey ? idempotencyKeySchema.safeParse(suppliedKey) : null;
  if (parsedKey && !parsedKey.success) return publicError("Invalid Idempotency-Key header.", 422);
  const idempotencyKey = parsedKey?.data ?? randomUUID();

  let rpcPayload: ReturnType<typeof createBookingRpcRequest>;
  try {
    rpcPayload = createBookingRpcRequest(booking.data, idempotencyKey);
  } catch {
    return publicError("Invalid booking date.", 422);
  }

  // The service, property type, area and every amount are resolved and priced inside the
  // RPC, so nothing about the total can be influenced from here or from the browser.
  const serviceClient = createServiceRoleClient();

  // Slot times are configurable data, so an arbitrary time is rejected here rather than
  // being pinned by the payload schema.
  const { data: slot, error: slotError } = await serviceClient
    .from("booking_slots").select("start_time").eq("is_active", true);
  if (slotError) {
    console.error("Booking slot lookup failed", { code: slotError.code });
    return publicError("Unable to create booking. Please try again.", 502);
  }
  const openSlots = (slot ?? []).map((row) => String(row.start_time).slice(0, 5));
  if (!openSlots.includes(booking.data.time)) return publicError("That appointment time isn’t offered. Please choose one of the available times.", 422);
  const { data, error } = await serviceClient.rpc("create_booking_from_request", { request: rpcPayload });
  if (error) {
    console.error("Public booking RPC failed", { code: error.code });
    if (error.code === "23P01") return publicError("The requested time is no longer available.", 409);
    if (error.code === "23503") return publicError("The requested service, property type or area is unavailable.", 422);
    if (error.code === "22023") return publicError("Invalid booking request.", 422);
    return publicError("Unable to create booking. Please try again.", 502);
  }

  const result = rpcResultSchema.safeParse(Array.isArray(data) ? data[0] : data);
  if (!result.success) {
    console.error("Public booking RPC returned an invalid result");
    return publicError("Unable to create booking. Please try again.", 502);
  }

  const bookingReference = `BOOM-${result.data.bookingNumber}`;
  const emailStatus = process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim() ? "queued" : "not_configured";
  return NextResponse.json(
    publicBookingResponseSchema.parse({
      booking: {
        id: bookingReference,
        createdAt: new Date().toISOString(),
        // A scope we could not price safely holds the slot but carries no agreed amount.
        status: result.data.requiresReview ? "REVIEW_REQUIRED" : result.data.status,
        amount: result.data.requiresReview ? null : result.data.total,
        items: [],
      },
      email: { status: emailStatus },
    }),
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
