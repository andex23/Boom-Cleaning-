import { readBoundedJson } from "@/lib/public-booking";
import { NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/admin-auth";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { anonymousSession, visitRateLimited } from "@/features/analytics/server";
import { visitSchema, referrerHost, deviceCategory } from "@/features/analytics/validation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!isSameOriginRequest(request)) return new NextResponse(null,{status:403,headers});
  if (request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1" || /bot|crawler|spider|preview/i.test(request.headers.get("user-agent") ?? "")) return new NextResponse(null,{status:204,headers});
  try {
    if (Number(request.headers.get("content-length") ?? 0)>4096) return new NextResponse(null,{status:413,headers});
    const value = visitSchema.safeParse(await readBoundedJson(request));
    if (!value.success) return new NextResponse(null,{status:400,headers});
    if (visitRateLimited(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown")) return new NextResponse(null,{status:429,headers});
    const now = new Date();
    const client = createServiceRoleClient();
    const { error } = await client.from("website_visits").upsert({ session_hash:anonymousSession(value.data.session,now),path:value.data.path,referrer:referrerHost(value.data.referrer),device:deviceCategory(request.headers.get("user-agent") ?? ""),bucket:Math.floor(now.getTime()/1800000) },{onConflict:"session_hash,path,bucket",ignoreDuplicates:true});
    if (error) throw error;
    return new NextResponse(null,{status:204,headers});
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return new NextResponse(null,{status:message === "INVALID_JSON" ? 400 : message === "PAYLOAD_TOO_LARGE" ? 413 : 503,headers});
  }
}
