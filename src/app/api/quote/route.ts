import { NextResponse } from "next/server";
import { z } from "zod";
import { isSameOriginRequest } from "@/lib/admin-auth";
import { isPublicQuoteRateLimited, readBoundedJson } from "@/lib/public-booking";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { calculateQuote, loadPricingCatalog, UnknownPricingSelectionError } from "@/features/pricing/quote-service";
import { quoteRequestSchema } from "@/lib/validation/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function publicError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Options for one service's property step: property types, priced spaces and areas. */
export async function GET(request: Request) {
  if (!isSameOriginRequest(request)) return publicError("Forbidden", 403);
  const serviceSlug = new URL(request.url).searchParams.get("service")?.trim() ?? "";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(serviceSlug)) return publicError("A valid service slug is required.", 422);

  try {
    const catalog = await loadPricingCatalog(createServiceRoleClient(), serviceSlug);
    return NextResponse.json(catalog, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof UnknownPricingSelectionError) return publicError("The requested service is unavailable.", 404);
    console.error("Pricing catalog lookup failed");
    return publicError("Unable to load pricing options. Please try again.", 502);
  }
}

/**
 * Prices a scope for display. This is the same database function the booking transaction
 * uses, so the preview a customer sees is the amount they are charged.
 */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return publicError("Forbidden", 403);
  if (isPublicQuoteRateLimited(request)) return publicError("Too many quote requests. Please try again shortly.", 429);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return publicError("Content-Type must be application/json.", 415);

  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "PAYLOAD_TOO_LARGE";
    return publicError(tooLarge ? "Request body is too large." : "Request body must be valid JSON.", tooLarge ? 413 : 400);
  }

  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid quote request.", issues: z.flattenError(parsed.error) }, { status: 422, headers: { "Cache-Control": "no-store" } });

  try {
    const quote = await calculateQuote(createServiceRoleClient(), parsed.data);
    return NextResponse.json(quote, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof UnknownPricingSelectionError) return publicError("That combination is not available. Please review your selection.", 422);
    console.error("Quote calculation failed");
    return publicError("Unable to price this scope. Please try again.", 502);
  }
}
