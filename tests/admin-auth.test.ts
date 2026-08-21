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

describe("admin session cookie scope", () => {
  it("covers the console's own APIs, not just /admin pages", async () => {
    const { ADMIN_SESSION_COOKIE_OPTIONS } = await import("../src/lib/admin-session");
    // A cookie scoped to /admin is never sent to /api/admin/*, so every console request
    // would be rejected as unauthenticated.
    expect(ADMIN_SESSION_COOKIE_OPTIONS.path).toBe("/");
    expect(ADMIN_SESSION_COOKIE_OPTIONS.httpOnly).toBe(true);
    expect(ADMIN_SESSION_COOKIE_OPTIONS.sameSite).toBe("strict");
  });
});

describe("admin login throttling", () => {
  it("stops a password from being guessed indefinitely", async () => {
    const { isAdminLoginRateLimited, clearAdminLoginAttempts, resetAdminLoginRateLimitForTests } = await import("../src/lib/admin-session");
    resetAdminLoginRateLimitForTests();
    const request = new Request("https://boom.example/api/admin/login", { headers: { "x-forwarded-for": "198.51.100.7" } });
    for (let attempt = 0; attempt < 8; attempt += 1) expect(isAdminLoginRateLimited(request, 1_700_000_000_000)).toBe(false);
    expect(isAdminLoginRateLimited(request, 1_700_000_000_000)).toBe(true);

    // A correct password clears the counter so one bad day does not lock staff out.
    clearAdminLoginAttempts(request);
    expect(isAdminLoginRateLimited(request, 1_700_000_000_000)).toBe(false);
    resetAdminLoginRateLimitForTests();
  });

  it("counts each client separately", async () => {
    const { isAdminLoginRateLimited, resetAdminLoginRateLimitForTests } = await import("../src/lib/admin-session");
    resetAdminLoginRateLimitForTests();
    const attacker = new Request("https://boom.example/api/admin/login", { headers: { "x-forwarded-for": "198.51.100.8" } });
    const staff = new Request("https://boom.example/api/admin/login", { headers: { "x-forwarded-for": "198.51.100.9" } });
    for (let attempt = 0; attempt < 9; attempt += 1) isAdminLoginRateLimited(attacker, 1_700_000_000_000);
    expect(isAdminLoginRateLimited(attacker, 1_700_000_000_000)).toBe(true);
    expect(isAdminLoginRateLimited(staff, 1_700_000_000_000)).toBe(false);
    resetAdminLoginRateLimitForTests();
  });
});

describe("legacy admin cookie expiry", () => {
  it("expires the old /admin-scoped session so it cannot shadow a new one", async () => {
    const { legacyAdminCookieExpiry } = await import("../src/lib/admin-session");
    // Emitted as a raw header because NextResponse.cookies keys by name alone: setting the
    // same name twice replaces the first entry instead of sending both.
    const header = legacyAdminCookieExpiry("boom_admin_session");
    expect(header).toContain("boom_admin_session=");
    expect(header).toContain("Path=/admin");
    expect(header).toContain("Max-Age=0");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Strict");
  });
});
