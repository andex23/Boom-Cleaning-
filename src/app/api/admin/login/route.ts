import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_COOKIE_OPTIONS,
  ADMIN_SESSION_MAX_AGE,
  clearAdminLoginAttempts,
  createAdminSessionToken,
  isAdminLoginRateLimited,
  isSameOriginRequest,
  validateAdminPassword,
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
  if (!process.env.ADMIN_PASSWORD?.trim() || !process.env.ADMIN_SESSION_SECRET?.trim()) {
    console.error("Admin sign-in is not configured: ADMIN_PASSWORD or ADMIN_SESSION_SECRET is missing");
    return back(request, "unconfigured");
  }

  const formData = await request.formData().catch(() => null);
  const password = formData?.get("password");
  if (typeof password !== "string" || !validateAdminPassword(password)) return back(request, "invalid");

  clearAdminLoginAttempts(request);
  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
    ...ADMIN_SESSION_COOKIE_OPTIONS,
    maxAge: ADMIN_SESSION_MAX_AGE,
    priority: "high",
  });
  return response;
}
