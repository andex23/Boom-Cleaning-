import { beforeEach,describe,expect,it,vi } from "vitest";
import { metadata } from "@/app/admin/setup/page";
import { POST } from "@/app/api/admin/setup/route";
import { resetAdminLoginRateLimitForTests } from "@/lib/admin-session";

const { claim } = vi.hoisted(() => ({ claim: vi.fn(async () => ({data:true,error:null})) }));
vi.mock("@/lib/admin-owner", () => ({ownerSetupAvailable:async()=>true,setupTokenHash:()=>"hashed-test-token"}));
vi.mock("@/lib/supabase/service", () => ({createServiceRoleClient:()=>({rpc:claim})}));
const token="a".repeat(64);
function setupRequest(origin:string) {
  return new Request("https://boomcleaning.site/api/admin/setup",{
    method:"POST",
    headers:{origin,"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({token,email:"owner@example.com",password:"short",confirm:"short"}),
  });
}

describe("owner activation form origin",()=>{
  beforeEach(()=>{resetAdminLoginRateLimitForTests();claim.mockClear();});
  it("preserves the origin for native same-origin forms without leaking the private link externally",()=>{
    expect(metadata.referrer).toBe("same-origin");
  });
  it("allows a same-origin submission to reach password validation",async()=>{
    const response=await POST(setupRequest("https://boomcleaning.site"));
    expect(response.status).toBe(303);
    const location=new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/admin/setup");
    expect(location.searchParams.get("error")).toBe("password");
  });
  it("accepts an eight-character password and normalizes the chosen email",async()=>{
    const request=new Request("https://boomcleaning.site/api/admin/setup",{method:"POST",headers:{origin:"https://boomcleaning.site","content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({token,email:" New.Owner@example.com ",password:"eight123",confirm:"eight123"})});
    const response=await POST(request);
    expect(response.status).toBe(303);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/admin/login");
    expect(claim).toHaveBeenCalledWith("claim_admin_owner",{token_value:"hashed-test-token",email_value:"new.owner@example.com",password_value:expect.stringMatching(/^scrypt:/)});
    expect(response.headers.get("referrer-policy")).toBe("same-origin");
  });
  it.each(["null","https://other.example"])("continues to reject unsafe origin %s",async(origin)=>{
    expect((await POST(setupRequest(origin))).status).toBe(403);
  });
});
