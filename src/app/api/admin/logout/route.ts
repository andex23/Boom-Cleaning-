import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_COOKIE_OPTIONS, isSameOriginRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return new NextResponse("Forbidden", { status: 403 });

  const response = NextResponse.redirect(new URL("/admin/login?signedOut=1", request.url), 303);
  // The options must match the ones used to set it, or the browser keeps the old cookie.
  response.cookies.set(ADMIN_SESSION_COOKIE, "", { ...ADMIN_SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
