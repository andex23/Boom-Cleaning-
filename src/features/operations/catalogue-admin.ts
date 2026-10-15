import "server-only";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const createServiceSchema = z.object({
  name: z.string().trim().min(2).max(120), description: z.string().trim().min(10).max(3000),
  slug: z.string().trim().max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  templateSlug: z.string().trim().max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
});
export async function createAdminService(input: z.infer<typeof createServiceSchema>) {
  const { data, error } = await createServiceRoleClient().rpc("create_admin_service", { request: input });
  if (error) throw new Error(error.code === "23505" ? "DUPLICATE_SERVICE" : "CREATE_FAILED");
  return data as string;
}
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const scheduleSchema = z.object({
  days: z.array(z.object({ weekday: z.number().int().min(0).max(6), open: z.boolean(), start: time, end: time }).refine(day => day.end > day.start, "Closing time must be later than opening time")).length(7).refine(days => new Set(days.map(day => day.weekday)).size === 7),
  slots: z.array(z.object({ id: z.uuid(), label: z.string().trim().min(2).max(60), isActive: z.boolean() })).max(24),
});
export const blockDatesSchema = z.object({
  from: z.iso.date(), to: z.iso.date(), reason: z.string().trim().min(2).max(500),
}).refine(value => value.to >= value.from && (Date.parse(value.to) - Date.parse(value.from)) / 86400000 <= 366, "Choose an end date on or after the start, within a year");
export async function loadAdminSchedule() {
  const client = createServiceRoleClient();
  const [rules, slots, blocks] = await Promise.all([
    client.from("availability_rules").select("weekday,starts_at,ends_at,is_active").is("staff_id", null).eq("is_active", true).order("starts_at"),
    client.from("booking_slots").select("id,label,start_time,is_active").order("start_time"),
    client.from("availability_blackouts").select("id,starts_at,ends_at,reason").is("staff_id", null).gte("ends_at", new Date().toISOString()).order("starts_at"),
  ]);
  for (const result of [rules, slots, blocks]) if (result.error) throw new Error(result.error.message);
  return {
    days: Array.from({ length: 7 }, (_, weekday) => { const rule = rules.data?.find(row => row.weekday === weekday); return { weekday, open: Boolean(rule), start: rule?.starts_at.slice(0,5) ?? "08:00", end: rule?.ends_at.slice(0,5) ?? "18:00" }; }),
    slots: (slots.data ?? []).map(row => ({ id: row.id, label: row.label, time: row.start_time.slice(0,5), isActive: row.is_active })),
    blocks: blocks.data ?? [],
  };
}
export type AdminScheduleData = Awaited<ReturnType<typeof loadAdminSchedule>>;
