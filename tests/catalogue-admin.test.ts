import { describe, expect, it } from "vitest";
import { blockDatesSchema, createServiceSchema, scheduleSchema } from "@/features/operations/catalogue-admin";
import { pricingUpdateSchema } from "@/features/pricing/pricing-admin";
const days=Array.from({length:7},(_,weekday)=>({weekday,open:weekday!==0,start:"08:00",end:"18:00"}));
describe("owner catalogue and calendar input",()=>{
 it("accepts renamed services but keeps their stable booking identifier",()=>{
  expect(pricingUpdateSchema.parse({services:[{slug:"deep-cleaning",name:"Deep cleaning only",description:"A complete clean",basePrice:0,minimumCharge:0,requiresReview:false,isActive:true,durationMinutes:300}]}).services[0].name).toBe("Deep cleaning only");
  expect(pricingUpdateSchema.safeParse({services:[{slug:"deep-cleaning",name:"",basePrice:0,minimumCharge:0,requiresReview:false}]}).success).toBe(false);
 });
 it("requires a safe unique-link shape and a real starting service identifier",()=>{
  const input={name:"Apartment refresh",description:"A full apartment clean.",slug:"apartment-refresh",templateSlug:"deep-cleaning"};
  expect(createServiceSchema.safeParse(input).success).toBe(true);
  for(const slug of ["../admin","unsafe?x=1","Spaces here",""])expect(createServiceSchema.safeParse({...input,slug}).success).toBe(false);
 });
 it("requires every weekday exactly once and correctly ordered real times",()=>{
  expect(scheduleSchema.safeParse({days,slots:[]}).success).toBe(true);
  expect(scheduleSchema.safeParse({days:[...days.slice(1),days[1]],slots:[]}).success).toBe(false);
  for(const end of ["07:00","08:00","25:00","09:99"])expect(scheduleSchema.safeParse({days:days.map(day=>({...day,end})),slots:[]}).success).toBe(false);
 });
 it("accepts same-day closures and rejects invalid or reversed dates",()=>{
  expect(blockDatesSchema.safeParse({from:"2026-12-25",to:"2026-12-25",reason:"Christmas"}).success).toBe(true);
  for(const to of ["2026-12-24","2026-02-30","2028-12-25"])expect(blockDatesSchema.safeParse({from:"2026-12-25",to,reason:"Holiday"}).success).toBe(false);
 });
});
