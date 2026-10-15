import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated, isSameOriginRequest } from "@/lib/admin-auth";
import { readBoundedJson } from "@/lib/public-booking";
import { createAdminService, createServiceSchema } from "@/features/operations/catalogue-admin";
import { applyPricingUpdate, loadPricingAdminData, pricingUpdateSchema } from "@/features/pricing/pricing-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

function adminError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: noStore });
}

export async function GET(request: Request) {
  if (!isSameOriginRequest(request)) return adminError("Forbidden", 403);
  if (!(await isAdminAuthenticated())) return adminError("Unauthorized", 401);
  try {
    return NextResponse.json(await loadPricingAdminData(), { headers: noStore });
  } catch {
    console.error("Pricing admin load failed");
    return adminError("Unable to load pricing.", 502);
  }
}

/** Price edits take effect on new quotes only; existing quote_items are already frozen. */
export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) return adminError("Forbidden", 403);
  if (!(await isAdminAuthenticated())) return adminError("Unauthorized", 401);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return adminError("Content-Type must be application/json.", 415);

  let body: unknown;
  try {
    body = await readBoundedJson(request,128 * 1024);
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "PAYLOAD_TOO_LARGE";
    return adminError(tooLarge ? "Request body is too large." : "Request body must be valid JSON.", tooLarge ? 413 : 400);
  }

  const parsed = pricingUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid pricing update.", issues: z.flattenError(parsed.error) }, { status: 422, headers: noStore });

  try {
    await applyPricingUpdate(parsed.data);
    return NextResponse.json(await loadPricingAdminData(), { headers: noStore });
  } catch {
    console.error("Pricing admin update failed");
    return adminError("Unable to save pricing.", 502);
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return adminError("Forbidden", 403);
  if (!(await isAdminAuthenticated())) return adminError("Unauthorized", 401);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return adminError("Content-Type must be application/json.", 415);
  let body: unknown;
  try { body = await readBoundedJson(request, 16 * 1024); } catch { return adminError("Invalid request body.", 400); }
  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success) return adminError("Enter a name, description, unique service link and starting service.", 422);
  try { const slug = await createAdminService(parsed.data); return NextResponse.json({ slug, data: await loadPricingAdminData() }, { status: 201, headers: noStore }); }
  catch (error) { return adminError(error instanceof Error && error.message === "DUPLICATE_SERVICE" ? "That service link already exists. Choose another." : "Unable to create service. Check the starting service and try again.", 422); }
}
