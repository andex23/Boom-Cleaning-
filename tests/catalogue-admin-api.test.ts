import { beforeEach, describe, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({origin:vi.fn(),auth:vi.fn(),load:vi.fn(),create:vi.fn()}));
vi.mock("@/lib/admin-auth",()=>({isSameOriginRequest:mock.origin,isAdminAuthenticated:mock.auth}));
vi.mock("@/features/operations/catalogue-admin",async original=>({...await original<typeof import("@/features/operations/catalogue-admin")>(),loadAdminSchedule:mock.load,createAdminService:mock.create}));
import { GET, PATCH } from "@/app/api/admin/schedule/route";
import { POST } from "@/app/api/admin/pricing/route";
beforeEach(()=>{vi.clearAllMocks();mock.origin.mockReturnValue(true);mock.auth.mockResolvedValue(true);mock.load.mockResolvedValue({days:[],slots:[],blocks:[]});});
describe("catalogue and schedule authorization",()=>{
 it("rejects cross-origin changes before creating a service",async()=>{
  mock.origin.mockReturnValue(false);
  expect((await POST(new Request("https://boomcleaning.site/api/admin/pricing",{method:"POST"}))).status).toBe(403);
  expect(mock.create).not.toHaveBeenCalled();expect(mock.auth).not.toHaveBeenCalled();
 });
 it("protects schedule read and write operations with owner authentication",async()=>{
  mock.auth.mockResolvedValue(false);
  expect((await GET(new Request("https://boomcleaning.site/api/admin/schedule"))).status).toBe(401);
  expect((await PATCH(new Request("https://boomcleaning.site/api/admin/schedule",{method:"PATCH"}))).status).toBe(401);
  expect(mock.load).not.toHaveBeenCalled();
 });
 it("rejects invalid schedule input without applying changes",async()=>{
  const result=await PATCH(new Request("https://boomcleaning.site/api/admin/schedule",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({days:[],slots:[]})}));
  expect(result.status).toBe(422);expect(mock.load).not.toHaveBeenCalled();
 });
});
