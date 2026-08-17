import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated, isSameOriginRequest } from "@/lib/admin-auth";
import { readBoundedJson } from "@/lib/public-booking";
import { bookingPriceSchema, bookingStatusSchema, BookingPriceError, loadRecentBookingBreakdowns, rescheduleBooking, rescheduleSchema, setBookingPrice, setBookingStatus } from "@/features/pricing/pricing-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });

  try {
    return NextResponse.json(await loadRecentBookingBreakdowns(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Admin booking breakdown load failed");
    return NextResponse.json({ error: "Unable to load bookings." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

const noStore = { "Cache-Control": "no-store" };

/** Sets the agreed price on one booking, for scopes the calculator would not price. */
export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415, headers: noStore });

  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "PAYLOAD_TOO_LARGE";
    return NextResponse.json({ error: tooLarge ? "Request body is too large." : "Request body must be valid JSON." }, { status: tooLarge ? 413 : 400, headers: noStore });
  }

  // One endpoint, three actions. Each branch keeps its own schema so the parsed type stays
  // concrete rather than collapsing into a union.
  const action = body && typeof body === "object" && "action" in body ? String((body as { action?: unknown }).action) : "price";
  const invalid = (error: z.ZodError<unknown>) =>
    NextResponse.json({ error: "Invalid request.", issues: z.flattenError(error) }, { status: 422, headers: noStore });

  try {
    if (action === "status") {
      const parsed = bookingStatusSchema.safeParse(body);
      if (!parsed.success) return invalid(parsed.error);
      await setBookingStatus(parsed.data);
    } else if (action === "reschedule") {
      const parsed = rescheduleSchema.safeParse(body);
      if (!parsed.success) return invalid(parsed.error);
      await rescheduleBooking(parsed.data);
    } else {
      const parsed = bookingPriceSchema.safeParse(body);
      if (!parsed.success) return invalid(parsed.error);
      await setBookingPrice(parsed.data);
    }
    return NextResponse.json({ bookings: await loadRecentBookingBreakdowns() }, { headers: noStore });
  } catch (error) {
    if (error instanceof BookingPriceError) return NextResponse.json({ error: error.message }, { status: 422, headers: noStore });
    console.error("Admin booking update failed", { action });
    return NextResponse.json({ error: "Unable to update that booking." }, { status: 502, headers: noStore });
  }
}
