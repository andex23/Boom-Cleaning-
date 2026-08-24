import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated, isSameOriginRequest } from "@/lib/admin-auth";
import { readBoundedJson } from "@/lib/public-booking";
import { leadUpdateSchema, loadCustomers, loadLeads, updateLeadStatus } from "@/features/operations/directory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers: noStore });

async function guard(request: Request) {
  if (!isSameOriginRequest(request)) return fail("Forbidden", 403);
  if (!(await isAdminAuthenticated())) return fail("Unauthorized", 401);
  return null;
}

/** `?view=leads` or `?view=customers`. */
export async function GET(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;

  const view = new URL(request.url).searchParams.get("view");
  try {
    if (view === "leads") return NextResponse.json(await loadLeads(), { headers: noStore });
    if (view === "customers") return NextResponse.json(await loadCustomers(), { headers: noStore });
    return fail("Unknown view.", 422);
  } catch {
    console.error("Admin directory load failed", { view });
    return fail("Unable to load that list.", 502);
  }
}

export async function PATCH(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return fail("Content-Type must be application/json.", 415);

  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch {
    return fail("Request body must be valid JSON.", 400);
  }

  const parsed = leadUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid update.", issues: z.flattenError(parsed.error) }, { status: 422, headers: noStore });

  try {
    await updateLeadStatus(parsed.data);
    return NextResponse.json({ leads: await loadLeads() }, { headers: noStore });
  } catch {
    console.error("Admin lead update failed");
    return fail("Unable to update that lead.", 502);
  }
}
