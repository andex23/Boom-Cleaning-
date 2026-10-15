import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE_OPTIONS, isAdminLoginRateLimited, isSameOriginRequest } from "@/lib/admin-auth";
import { TEMPORARY_ADMIN_COOKIE,TEMPORARY_ADMIN_MAX_AGE,validAccessToken,redeemTemporaryAdminAccess } from "@/lib/admin-temporary-access";
import { readBoundedJson } from "@/lib/public-booking";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store","Referrer-Policy":"same-origin","X-Robots-Tag":"noindex, nofollow"};
export async function POST(request:Request) {
  const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
  if(!isSameOriginRequest(request))return fail("Forbidden",403);
  if(isAdminLoginRateLimited(request))return fail("Too many attempts. Try again shortly.",429);
  if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))return fail("Unsupported request.",415);
  let body:unknown;
  try {body=await readBoundedJson(request,4096);}catch{return fail("Invalid access request.",400);}
  const token=body && typeof body==="object" && "token" in body ? body.token : null;
  if(!validAccessToken(token))return fail("This link is invalid, expired or already used.",422);
  try {
    const session=await redeemTemporaryAdminAccess(token);
    if(!session)return fail("This link is invalid, expired or already used.",422);
    const response=NextResponse.json({ok:true},{headers});
    response.cookies.set(TEMPORARY_ADMIN_COOKIE,session,{...ADMIN_SESSION_COOKIE_OPTIONS,maxAge:TEMPORARY_ADMIN_MAX_AGE,priority:"high"});
    return response;
  }catch{return fail("Temporary access is unavailable. Please try again.",503);}
}
