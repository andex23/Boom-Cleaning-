import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createServiceRoleClient } from "./supabase/service";
export const TEMPORARY_ADMIN_COOKIE = "boom_admin_temporary_session";
export const TEMPORARY_ADMIN_MAX_AGE = 60 * 60;
export const validAccessToken = (token: unknown): token is string => typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
export const accessTokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function redeemTemporaryAdminAccess(token: string) {
  if (!validAccessToken(token)) return null;
  const session = randomBytes(32).toString("hex");
  const { data, error } = await createServiceRoleClient().rpc("redeem_temporary_admin_access", { token_value: accessTokenHash(token), session_value: accessTokenHash(session) });
  if (error) throw new Error("Temporary access unavailable");
  return data === true ? session : null;
}
export async function isTemporaryAdminAuthenticated(session: string | undefined) {
  if (!validAccessToken(session)) return false;
  const { data, error } = await createServiceRoleClient().rpc("valid_temporary_admin_session", { session_value: accessTokenHash(session) });
  return !error && data === true;
}
export async function revokeTemporaryAdminSession(session: string | undefined) {
  if (!validAccessToken(session)) return;
  const { error } = await createServiceRoleClient().from("admin_temporary_access").update({ revoked_at: new Date().toISOString() }).eq("session_hash", accessTokenHash(session));
  if (error) throw new Error("Unable to revoke temporary session");
}
