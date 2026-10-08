import { NextResponse } from "next/server";
import { isAdminAuthenticated,isSameOriginRequest } from "@/lib/admin-auth";
import { loadWebsiteAnalytics } from "@/features/analytics/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const headers = { "Cache-Control":"no-store" };
  if (!isSameOriginRequest(request)) return NextResponse.json({error:"Forbidden"},{status:403,headers});
  if (!await isAdminAuthenticated()) return NextResponse.json({error:"Unauthorized"},{status:401,headers});
  try { return NextResponse.json(await loadWebsiteAnalytics(),{headers}); }
  catch { return NextResponse.json({error:"Unable to load analytics."},{status:502,headers}); }
}
