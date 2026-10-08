import "server-only";
import { createHash } from "node:crypto";
import { createServiceRoleClient } from "./supabase/service";
export const OWNER_EMAIL="boomcleaninfo@gmail.com";
export async function loadAdminOwner() {
  const {data,error}=await createServiceRoleClient().from("admin_owner").select("email,password_hash").eq("id",1).maybeSingle();
  if(error) throw new Error("Owner access unavailable");
  return data as {email:string;password_hash:string}|null;
}
export function setupTokenHash(token:string) {return createHash("sha256").update(token).digest("hex");}
export async function ownerSetupAvailable(token:string) {
  if(!/^[a-f0-9]{64}$/.test(token)) return false;
  const {data,error}=await createServiceRoleClient().from("admin_owner_setup").select("id").eq("id",1).eq("token_hash",setupTokenHash(token)).gt("expires_at",new Date().toISOString()).is("used_at",null).maybeSingle();
  if(error) throw new Error("Owner setup unavailable");
  return Boolean(data) && !await loadAdminOwner();
}
