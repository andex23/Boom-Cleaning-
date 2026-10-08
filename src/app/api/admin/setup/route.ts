import { NextResponse } from "next/server";
import { isSameOriginRequest,isAdminLoginRateLimited,ADMIN_SESSION_COOKIE,ADMIN_SESSION_COOKIE_OPTIONS } from "@/lib/admin-auth";
import { hashOwnerPassword } from "@/lib/admin-password";
import { ownerSetupAvailable,setupTokenHash } from "@/lib/admin-owner";
import { createServiceRoleClient } from "@/lib/supabase/service";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:Request) {
  if(!isSameOriginRequest(request)) return new NextResponse("Forbidden",{status:403});
  if(isAdminLoginRateLimited(request)) return new NextResponse("Too many attempts. Try again in 15 minutes.",{status:429});
  if(Number(request.headers.get("content-length") ?? 0)>8192) return new NextResponse("Too large",{status:413});
  if(!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) return new NextResponse("Unsupported form",{status:415});
  const reader=request.body?.getReader();
  if(!reader) return new NextResponse("Missing form",{status:400});
  const chunks:Uint8Array[]=[];let bytes=0;
  while(true) {const {done,value}=await reader.read();if(done) break;bytes+=value.length;if(bytes>8192) {await reader.cancel();return new NextResponse("Too large",{status:413});}chunks.push(value);}
  const form=new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
  const token=form?.get("token"),password=form?.get("password"),confirm=form?.get("confirm");
  if(typeof token!=="string" || !/^[a-f0-9]{64}$/.test(token)) return new NextResponse("Invalid setup link",{status:400});
  const back=(error:string)=>NextResponse.redirect(new URL(`/admin/setup?token=${token}&error=${error}`,request.url),303);
  if(typeof password!=="string" || password.length<12 || password.length>128 || password!==confirm) return back("password");
  try {
    if(!await ownerSetupAvailable(token)) return back("invalid");
    const hash=await hashOwnerPassword(password);
    const {data,error}=await createServiceRoleClient().rpc("claim_admin_owner",{token_value:setupTokenHash(token),password_value:hash});
    if(error || data!==true) return back("invalid");
    const response=NextResponse.redirect(new URL("/admin/login?created=1",request.url),303);
    response.cookies.set(ADMIN_SESSION_COOKIE,"",{...ADMIN_SESSION_COOKIE_OPTIONS,maxAge:0});
    response.headers.set("Cache-Control","no-store");response.headers.set("Referrer-Policy","no-referrer");
    return response;
  } catch {return back("unavailable");}
}
