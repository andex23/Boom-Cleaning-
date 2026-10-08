import { describe,it,expect } from "vitest";
import { lagosToday,revenuePeriod,shiftRevenuePeriod } from "./revenue-period";
describe("payment history periods",()=>{
  it("uses Lagos midnight rather than browser or server timezone",()=>{expect(lagosToday(new Date("2026-10-07T23:30:00Z"))).toBe("2026-10-08");});
  it("uses Monday through Sunday across a year boundary",()=>{expect(revenuePeriod("week","2026-01-01")).toMatchObject({start:"2025-12-29",end:"2026-01-05"});});
  it("uses complete calendar months including leap days",()=>{expect(revenuePeriod("month","2024-02-29")).toMatchObject({start:"2024-02-01",end:"2024-03-01"});});
  it("moves back from March without skipping February",()=>{expect(shiftRevenuePeriod(revenuePeriod("month","2026-03-31"),-1)).toBe("2026-02-01");});
  it("moves weeks over a year boundary",()=>{expect(shiftRevenuePeriod(revenuePeriod("week","2026-01-01"),-1)).toBe("2025-12-22");});
  it("rejects impossible dates and unbounded years",()=>{for(const date of ["2026-02-30","bad","1999-12-01","2101-01-01"]) expect(()=>revenuePeriod("week",date)).toThrow();});
});
