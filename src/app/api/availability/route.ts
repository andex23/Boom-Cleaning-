import { NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/admin-auth";
import { isPublicQuoteRateLimited } from "@/lib/public-booking";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { availabilityResultSchema } from "@/lib/validation/availability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const slug = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function publicError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Real bookable slots: working hours, minus time off, minus bookings that already exist. */
export async function GET(request: Request) {
  if (!isSameOriginRequest(request)) return publicError("Forbidden", 403);
  if (isPublicQuoteRateLimited(request)) return publicError("Too many availability requests. Please try again shortly.", 429);

  const params = new URL(request.url).searchParams;
  const serviceSlug = params.get("service")?.trim() ?? "";
  const from = params.get("from")?.trim() ?? "";
  const to = params.get("to")?.trim() ?? "";
  if (!slug.test(serviceSlug)) return publicError("A valid service is required.", 422);
  if (!isoDate.test(from) || !isoDate.test(to)) return publicError("A valid from and to date is required.", 422);

  const { data, error } = await createServiceRoleClient().rpc("get_availability", { request: { serviceSlug, from, to } });
  if (error) {
    if (error.code === "23503") return publicError("That service is unavailable.", 404);
    if (error.code === "22023") return publicError("That date range can’t be checked.", 422);
    console.error("Availability lookup failed", { code: error.code });
    return publicError("We couldn’t check availability. Please try again.", 502);
  }

  const parsed = availabilityResultSchema.safeParse(data);
  if (!parsed.success) {
    console.error("Availability returned an unexpected shape");
    return publicError("We couldn’t check availability. Please try again.", 502);
  }
  return NextResponse.json(parsed.data, { headers: { "Cache-Control": "no-store" } });
}
