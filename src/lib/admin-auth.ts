import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createExpiringAdminSessionToken, isValidExpiringAdminSessionToken } from "./admin-session";

export const ADMIN_SESSION_COOKIE = "boom_admin_session";
export { ADMIN_SESSION_MAX_AGE } from "./admin-session";

function safeEqual(left: string, right: string) {
  return timingSafeEqual(createHash("sha256").update(left).digest(), createHash("sha256").update(right).digest());
}

export function validateAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected && safeEqual(password, expected));
}

export function createAdminSessionToken() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");
  return createExpiringAdminSessionToken(secret);
}

export function isValidAdminSessionToken(token: string | undefined, now = Date.now()) {
  return isValidExpiringAdminSessionToken(token, process.env.ADMIN_SESSION_SECRET, now);
}

export function isSameOriginRequest(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin) return origin === requestOrigin;

  const referer = request.headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).origin === requestOrigin;
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated() {
  const actual = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  return isValidAdminSessionToken(actual);
}
