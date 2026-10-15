import { beforeEach,describe,expect,it,vi } from "vitest";
const mock=vi.hoisted(()=>({rpc:vi.fn(),origin:vi.fn(),limited:vi.fn()}));
vi.mock("@/lib/supabase/service",()=>({createServiceRoleClient:()=>({rpc:mock.rpc})}));
vi.mock("@/lib/admin-auth",()=>({ADMIN_SESSION_COOKIE_OPTIONS:{httpOnly:true,secure:true,sameSite:"strict",path:"/"},isSameOriginRequest:mock.origin,isAdminLoginRateLimited:mock.limited}));
import { POST } from "@/app/api/admin/access/route";
import { accessTokenHash,isTemporaryAdminAuthenticated,redeemTemporaryAdminAccess } from "@/lib/admin-temporary-access";
const token="a".repeat(64);
function request(value=token){return new Request("https://boomcleaning.site/api/admin/access",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:value})});}
beforeEach(()=>{vi.clearAllMocks();mock.origin.mockReturnValue(true);mock.limited.mockReturnValue(false);mock.rpc.mockResolvedValue({data:true,error:null});});
describe("one-time temporary admin access",()=>{
 it("rejects cross-origin requests without touching grants",async()=>{mock.origin.mockReturnValue(false);expect((await POST(request())).status).toBe(403);expect(mock.rpc).not.toHaveBeenCalled();});
 it("rejects malformed tokens before database access",async()=>{expect((await POST(request("bad"))).status).toBe(422);expect(await isTemporaryAdminAuthenticated("bad")).toBe(false);expect(mock.rpc).not.toHaveBeenCalled();});
 it("uses distinct random sessions and stores only hashes",async()=>{const session=await redeemTemporaryAdminAccess(token);expect(session).toMatch(/^[a-f0-9]{64}$/);expect(session).not.toBe(token);expect(mock.rpc).toHaveBeenCalledWith("redeem_temporary_admin_access",{token_value:accessTokenHash(token),session_value:accessTokenHash(session!)});});
 it("honors database rejection for expired, used or revoked grants",async()=>{mock.rpc.mockResolvedValue({data:false,error:null});const response=await POST(request());expect(response.status).toBe(422);expect(response.headers.get("set-cookie")).toBeNull();});
 it("sets an hour-long secure root cookie without changing owner sessions",async()=>{const response=await POST(request());expect(response.status).toBe(200);const cookie=response.headers.get("set-cookie")!;for(const value of ["boom_admin_temporary_session=","Max-Age=3600","Path=/","HttpOnly","Secure","SameSite=strict"])expect(cookie).toContain(value);expect(cookie).not.toContain("boom_admin_session=");expect(response.headers.get("Cache-Control")).toBe("no-store");expect(await response.json()).toEqual({ok:true});});
 it("fails closed on database errors and checks sessions on every request",async()=>{mock.rpc.mockResolvedValue({data:null,error:{message:"offline"}});expect((await POST(request())).status).toBe(503);expect(await isTemporaryAdminAuthenticated(token)).toBe(false);expect(mock.rpc).toHaveBeenCalledWith("valid_temporary_admin_session",{session_value:accessTokenHash(token)});});
});
