import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated, isSameOriginRequest } from "@/lib/admin-auth";
import { readBoundedJson } from "@/lib/public-booking";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { loadAdminSchedule, scheduleSchema, blockDatesSchema } from "@/features/operations/catalogue-admin";
const headers = { "Cache-Control": "no-store" };
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  try { return NextResponse.json(await loadAdminSchedule(), { headers }); }
  catch { return NextResponse.json({ error: "Unable to load schedule." }, { status: 502, headers }); }
}
async function mutate(request: Request, action: "save"|"block"|"unblock") {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415, headers });
  try {
    const body = await readBoundedJson(request, 32 * 1024);
    const client = createServiceRoleClient();
    if (action === "save") {
      const { error } = await client.rpc("save_admin_schedule", { request: scheduleSchema.parse(body) }); if (error) throw error;
    } else if (action === "block") {
      const value = blockDatesSchema.parse(body);
      const end = new Date(`${value.to}T00:00:00+01:00`); end.setUTCDate(end.getUTCDate()+1);
      const { error } = await client.from("availability_blackouts").insert({ starts_at: `${value.from}T00:00:00+01:00`, ends_at: end.toISOString(), reason: value.reason }); if (error) throw error;
    } else {
      const value = z.object({ id: z.uuid() }).parse(body);
      const { error } = await client.from("availability_blackouts").delete().eq("id", value.id).is("staff_id", null); if (error) throw error;
    }
    return NextResponse.json(await loadAdminSchedule(), { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Check the dates, times and labels and try again." : "Unable to update schedule. Please try again." }, { status: error instanceof z.ZodError ? 422 : 502, headers });
  }
}
export const PATCH = (request: Request) => mutate(request,"save");
export const POST = (request: Request) => mutate(request,"block");
export const DELETE = (request: Request) => mutate(request,"unblock");
