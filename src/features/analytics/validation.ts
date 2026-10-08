import { z } from "zod";
export const PUBLIC_ANALYTICS_PATHS = ["/", "/quote", "/terms", "/about", "/faq", "/pricing", "/services"] as const;
export const visitSchema = z.object({ path: z.enum(PUBLIC_ANALYTICS_PATHS), session: z.uuid(), referrer: z.string().max(2048).optional() }).strict();
export function referrerHost(value?: string) {
  try {
    const url = new URL(value ?? "");
    if (!["http:","https:"].includes(url.protocol) || url.hostname.length > 253) return "Direct";
    return ["boomcleaning.site","www.boomcleaning.site"].includes(url.hostname) ? "Internal" : url.hostname;
  } catch { return "Direct"; }
}
export function deviceCategory(agent: string) {
  return /iPad|Tablet/i.test(agent) ? "Tablet" : /Mobile|Android|iPhone/i.test(agent) ? "Mobile" : "Desktop";
}
