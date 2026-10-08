import { describe,expect,it,vi,beforeEach } from "vitest";
import { visitSchema,referrerHost,deviceCategory } from "@/features/analytics/validation";
import { anonymousSession,visitRateLimited } from "@/features/analytics/server";

describe("anonymous website analytics", () => {
  beforeEach(() => vi.stubEnv("ADMIN_SESSION_SECRET","test-analytics-secret"));
  it("never accepts admin, callback, query-string or unknown paths", () => {
    for (const path of ["/admin","/payments/return","/quote?email=a@example.com","/api/admin","/unknown"]) {
      expect(visitSchema.safeParse({path,session:"c7ea3c0b-3f0a-44ce-8f4a-5156f1204c71"}).success).toBe(false);
    }
    expect(visitSchema.safeParse({path:"/quote",session:"c7ea3c0b-3f0a-44ce-8f4a-5156f1204c71"}).success).toBe(true);
  });
  it("keeps only the referring hostname and strips secrets and paths", () => {
    expect(referrerHost("https://example.com/private?email=x&token=secret")).toBe("example.com");
    expect(referrerHost("javascript:alert(1)")).toBe("Direct");
    expect(referrerHost("https://boomcleaning.site/quote?resume=BOOM-15")).toBe("Internal");
  });
  it("rotates anonymous session hashes at Lagos midnight", () => {
    const session = "c7ea3c0b-3f0a-44ce-8f4a-5156f1204c71";
    const before = anonymousSession(session,new Date("2026-10-08T22:59:59Z"));
    expect(before).toMatch(/^[a-f0-9]{64}$/);
    expect(anonymousSession(session,new Date("2026-10-08T23:00:00Z"))).not.toBe(before);
    expect(anonymousSession(session,new Date("2026-10-08T10:00:00Z"))).toBe(before);
  });
  it("bounds repeated collection requests and permits them after cooldown", () => {
    for(let i=0;i<120;i++) expect(visitRateLimited("analytics-test-address",1000)).toBe(false);
    expect(visitRateLimited("analytics-test-address",1001)).toBe(true);
    expect(visitRateLimited("analytics-test-address",601001)).toBe(false);
  });
  it("stores only a device category", () => {
    expect(deviceCategory("Mozilla iPhone Mobile Safari")).toBe("Mobile");
    expect(deviceCategory("Mozilla iPad Safari")).toBe("Tablet");
    expect(deviceCategory("Mozilla Macintosh Chrome")).toBe("Desktop");
  });
});
