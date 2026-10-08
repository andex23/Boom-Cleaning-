import "server-only";
import { createHmac } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/service";
export type WebsiteAnalytics = {
  days: number; pageViews: number; sessions: number; firstVisit: string | null;
  daily: { date: string; views: number }[];
  pages: { label: string; views: number }[];
  sources: { label: string; views: number }[];
  devices: { label: string; views: number }[];
};
export function anonymousSession(session: string, now = new Date()) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Analytics secret unavailable");
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return createHmac("sha256", secret).update(`website:${day}:${session}`).digest("hex");
}
export async function loadWebsiteAnalytics(days = 30) {
  const { data, error } = await createServiceRoleClient().rpc("website_analytics", { days_value: days });
  if (error) throw new Error("Analytics unavailable");
  return data as WebsiteAnalytics;
}
// Best-effort per-instance abuse protection; no raw address is stored or logged.
const attempts = new Map<string,{count:number;until:number}>();
export function visitRateLimited(address: string, now = Date.now()) {
  const key = anonymousSession(address);
  const current = attempts.get(key);
  if (current && current.until > now) { current.count++; return current.count > 120; }
  if (attempts.size >= 5000) attempts.clear();
  attempts.set(key,{ count:1,until:now+600000 }); return false;
}
