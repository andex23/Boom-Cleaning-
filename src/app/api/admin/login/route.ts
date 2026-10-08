import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_COOKIE_OPTIONS,
  ADMIN_SESSION_MAX_AGE,
  legacyAdminCookieExpiry,
  clearAdminLoginAttempts,
  createAdminSessionToken,
  isAdminLoginRateLimited,
  isSameOriginRequest,
  validateAdminLogin,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function back(request: Request, reason: string) {
  return NextResponse.redirect(new URL(`/admin/login?error=${reason}`, request.url), 303);
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return new NextResponse("Forbidden", { status: 403 });

  // Without a limit, a shared password is one script away from being guessed.
  if (isAdminLoginRateLimited(request)) return back(request, "throttled");

  // A missing ADMIN_PASSWORD would otherwise look identical to a wrong one, and every
  // attempt would fail with no explanation of why.
  if (!process.env.ADMIN_SESSION_SECRET?.trim()) {
    console.error("Admin sign-in is not configured: ADMIN_SESSION_SECRET is missing");
    return back(request, "unconfigured");
  }

  const formData = await request.formData().catch(() => null);
  const password = formData?.get("password");
  const email=formData?.get("email");
  if (typeof password !== "string" || password.length>128) return back(request,"invalid");
  try {if(!await validateAdminLogin(typeof email === "string" ? email : "",password)) return back(request,"invalid");}
  catch {return back(request,"unavailable");}

  clearAdminLoginAttempts(request);
  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(ADMIN_SESSION_COOKIE, await createAdminSessionToken(), {
    ...ADMIN_SESSION_COOKIE_OPTIONS,
    maxAge: ADMIN_SESSION_MAX_AGE,
    priority: "high",
  });
  // Appended, not set: a session left at the old path would otherwise shadow this one.
  response.headers.append("Set-Cookie", legacyAdminCookieExpiry(ADMIN_SESSION_COOKIE));
  return response;
}
