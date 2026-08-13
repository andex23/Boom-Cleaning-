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
