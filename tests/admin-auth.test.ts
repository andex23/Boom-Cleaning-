import { describe, expect, it } from "vitest";
import { ADMIN_SESSION_MAX_AGE, createExpiringAdminSessionToken, isValidExpiringAdminSessionToken } from "../src/lib/admin-session";

describe("admin session security", () => {
  it("signs sessions and rejects expired or tampered tokens", () => {
    const secret = "a test secret that is long enough for deterministic signing";
    const issuedAt = 1_700_000_000_000;
    const token = createExpiringAdminSessionToken(secret, issuedAt);
    expect(isValidExpiringAdminSessionToken(token, secret, issuedAt)).toBe(true);
    expect(isValidExpiringAdminSessionToken(`${token}x`, secret, issuedAt)).toBe(false);
    expect(isValidExpiringAdminSessionToken(token, secret, issuedAt + ADMIN_SESSION_MAX_AGE * 1000)).toBe(false);
  });
});
