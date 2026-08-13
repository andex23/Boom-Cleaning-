import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "boom_admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12;

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function safeEqual(left: string, right: string) {
  return timingSafeEqual(digest(left), digest(right));
}

function sessionToken() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update("boom-admin-session-v1").digest("hex");
}

export function validateAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected && safeEqual(password, expected));
}

export function createAdminSessionToken() {
  const token = sessionToken();
  if (!token) throw new Error("ADMIN_SESSION_SECRET is not configured");
  return token;
}

export async function isAdminAuthenticated() {
  const expected = sessionToken();
  const actual = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  return Boolean(expected && actual && safeEqual(actual, expected));
}
