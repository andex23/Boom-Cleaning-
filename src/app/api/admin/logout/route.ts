import { cookies } from "next/headers";
import { TEMPORARY_ADMIN_COOKIE, revokeTemporaryAdminSession } from "@/lib/admin-temporary-access";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_COOKIE_OPTIONS, isSameOriginRequest, legacyAdminCookieExpiry } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return new NextResponse("Forbidden", { status: 403 });

  try {await revokeTemporaryAdminSession((await cookies()).get(TEMPORARY_ADMIN_COOKIE)?.value);} catch {return new NextResponse("Unable to sign out. Please try again.",{status:503});}
  const response = NextResponse.redirect(new URL("/admin/login?signedOut=1", request.url), 303);
  // The options must match the ones used to set it, or the browser keeps the old cookie.
  response.cookies.set(ADMIN_SESSION_COOKIE, "", { ...ADMIN_SESSION_COOKIE_OPTIONS, maxAge: 0 });
  // Sessions issued before the path fix live at /admin and must be expired too.
  response.cookies.set(TEMPORARY_ADMIN_COOKIE,"",{...ADMIN_SESSION_COOKIE_OPTIONS,maxAge:0});
  response.headers.append("Set-Cookie", legacyAdminCookieExpiry(ADMIN_SESSION_COOKIE));
  response.headers.set("Cache-Control","no-store");
  return response;
}
