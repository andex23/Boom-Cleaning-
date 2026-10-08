import { beforeEach,describe,expect,it } from "vitest";
import { metadata } from "@/app/admin/setup/page";
import { POST } from "@/app/api/admin/setup/route";
import { resetAdminLoginRateLimitForTests } from "@/lib/admin-session";

const token="a".repeat(64);
function setupRequest(origin:string) {
  return new Request("https://boomcleaning.site/api/admin/setup",{
    method:"POST",
    headers:{origin,"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({token,password:"short",confirm:"short"}),
  });
}

describe("owner activation form origin",()=>{
  beforeEach(()=>resetAdminLoginRateLimitForTests());
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
  it.each(["null","https://other.example"])("continues to reject unsafe origin %s",async(origin)=>{
    expect((await POST(setupRequest(origin))).status).toBe(403);
  });
});
