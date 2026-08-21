import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12;
const ADMIN_SESSION_VERSION = "v1";

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function safeEqual(left: string, right: string) {
  return timingSafeEqual(digest(left), digest(right));
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createExpiringAdminSessionToken(secret: string, now = Date.now()) {
  const expiresAt = now + ADMIN_SESSION_MAX_AGE * 1000;
  const payload = `${ADMIN_SESSION_VERSION}.${expiresAt}`;
  return `${payload}.${signature(payload, secret)}`;
}

export function isValidExpiringAdminSessionToken(token: string | undefined, secret: string | undefined, now = Date.now()) {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== ADMIN_SESSION_VERSION || !/^\d{13}$/.test(parts[1]) || !/^[a-f0-9]{64}$/.test(parts[2])) return false;

  const expiresAt = Number(parts[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) return false;
  return safeEqual(parts[2], signature(`${parts[0]}.${parts[1]}`, secret));
}

/**
 * The session cookie must cover `/api/admin/*` as well as `/admin`. Scoping it to `/admin`
 * alone means the browser never sends it to the console's own APIs, and every request from
 * the console is rejected as unauthenticated.
 */
export const ADMIN_SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

/**
 * Sessions issued before the path was corrected still sit at `/admin`. A browser will send
 * both cookies for `/admin` requests, and whichever the server reads first wins — so a
 * stale one can shadow a freshly issued session and bounce staff back to the sign-in page
 * forever. Every login and logout expires the old path explicitly.
 */
export const LEGACY_ADMIN_SESSION_COOKIE_OPTIONS = {
  ...ADMIN_SESSION_COOKIE_OPTIONS,
  path: "/admin",
} as const;

/**
 * Built as a raw header on purpose. NextResponse.cookies keys by name alone, so setting the
 * same cookie name twice replaces the first entry instead of emitting both headers — and
 * expiring the old path is exactly the case that needs two.
 */
export function legacyAdminCookieExpiry(cookieName: string) {
  const parts = [`${cookieName}=`, "Path=/admin", "Max-Age=0", "HttpOnly", "SameSite=Strict"];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

/** A bounded, per-instance brute-force guard on the password form. */
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const MAX_LOGIN_ENTRIES = 5_000;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function isAdminLoginRateLimited(request: Request, now = Date.now()) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const key = forwardedFor?.split(",", 1)[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    if (loginAttempts.size >= MAX_LOGIN_ENTRIES) {
      for (const [entryKey, entry] of loginAttempts) if (entry.resetAt <= now) loginAttempts.delete(entryKey);
      if (loginAttempts.size >= MAX_LOGIN_ENTRIES) {
        const oldest = loginAttempts.keys().next().value;
        if (oldest) loginAttempts.delete(oldest);
      }
    }
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > LOGIN_MAX_ATTEMPTS;
}

export function clearAdminLoginAttempts(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const key = forwardedFor?.split(",", 1)[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  loginAttempts.delete(key);
}

export function resetAdminLoginRateLimitForTests() {
  loginAttempts.clear();
}
