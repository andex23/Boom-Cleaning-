import { NextResponse } from "next/server";
import { isAdminAuthenticated,isSameOriginRequest } from "@/lib/admin-auth";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { lagosToday,revenuePeriod } from "@/features/operations/revenue-period";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request) {
  const headers={"Cache-Control":"no-store"};
  if (!isSameOriginRequest(request)) return NextResponse.json({error:"Forbidden"},{status:403,headers});
  if (!await isAdminAuthenticated()) return NextResponse.json({error:"Unauthorized"},{status:401,headers});
  const params=new URL(request.url).searchParams;
  const unit=params.get("unit") ?? "week";
  if(unit!=="week" && unit!=="month") return NextResponse.json({error:"Choose week or month."},{status:400,headers});
  let period;
  try { period=revenuePeriod(unit,params.get("date") ?? lagosToday()); }
  catch {return NextResponse.json({error:"Choose a valid date."},{status:400,headers});}
  try {
    const {data,error}=await createServiceRoleClient().rpc("payment_revenue",{start_date:period.start,end_date:period.end});
    if(error) throw error;
    return NextResponse.json({...data,period},{headers});
  } catch {return NextResponse.json({error:"Unable to load payment history."},{status:502,headers});}
}
