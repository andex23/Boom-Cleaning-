import { beforeEach,describe,expect,it,vi } from "vitest";
const mock=vi.hoisted(()=>({revoke:vi.fn(),origin:vi.fn()}));
vi.mock("next/headers",()=>({cookies:async()=>({get:()=>({value:"a".repeat(64)})})}));
vi.mock("@/lib/admin-auth",()=>({ADMIN_SESSION_COOKIE:"boom_admin_session",ADMIN_SESSION_COOKIE_OPTIONS:{httpOnly:true,secure:true,sameSite:"strict",path:"/"},legacyAdminCookieExpiry:()=>"boom_admin_session=; Path=/admin; Max-Age=0; HttpOnly; SameSite=Strict; Secure",isSameOriginRequest:mock.origin}));
vi.mock("@/lib/admin-temporary-access",()=>({TEMPORARY_ADMIN_COOKIE:"boom_admin_temporary_session",revokeTemporaryAdminSession:mock.revoke}));
import { POST } from "@/app/api/admin/logout/route";
beforeEach(()=>{vi.clearAllMocks();mock.origin.mockReturnValue(true);mock.revoke.mockResolvedValue(undefined);});
describe("temporary logout",()=>{
 it("revokes server access and expires both root cookies and the legacy admin-path cookie",async()=>{
  const response=await POST(new Request("https://boomcleaning.site/api/admin/logout",{method:"POST"}));
  expect(response.status).toBe(303);expect(mock.revoke).toHaveBeenCalledWith("a".repeat(64));
  const cookie=response.headers.get("set-cookie")!;
  expect(cookie).toContain("boom_admin_temporary_session=");expect(cookie).toContain("boom_admin_session=");expect(cookie).toContain("Path=/admin;");expect(cookie.match(/Max-Age=0/g)).toHaveLength(3);
 });
 it("does not claim successful revocation during a database failure",async()=>{mock.revoke.mockRejectedValue(new Error("offline"));expect((await POST(new Request("https://boomcleaning.site/api/admin/logout",{method:"POST"}))).status).toBe(503);});
});
