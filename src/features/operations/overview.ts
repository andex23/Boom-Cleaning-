import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";

/** BOOM operates in Abuja; every "today" in the console means today in Africa/Lagos. */
const LAGOS_OFFSET = "+01:00";

function lagosToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return parts;
}

function lagosDayRange(isoDate: string) {
  return { start: `${isoDate}T00:00:00${LAGOS_OFFSET}`, end: `${isoDate}T23:59:59.999${LAGOS_OFFSET}` };
}

export type OperationsOverview = {
  today: string;
  kpis: { label: string; value: string; note: string; tone: "positive" | "neutral" | "warning" }[];
  weeklyRevenue: { day: string; date: string; value: number }[];
  weeklyRevenueTotal: number;
  schedule: { id: string; reference: string; time: string; customer: string; initials: string; service: string; address: string; status: string; total: number; requiresReview: boolean }[];
  /** Jobs after today, so a booking for next week is not invisible. */
  upcoming: { id: string; reference: string; date: string; time: string; customer: string; service: string; status: string; total: number; requiresReview: boolean }[];
  enquiries: { id: string; customer: string; initials: string; service: string; source: string; received: string; status: string }[];
};

const initialsOf = (name: string | null) =>
  (name ?? "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";

const ACTIVE_BOOKING_STATUSES = ["CONFIRMED", "IN_PROGRESS", "COMPLETED"];

/** The console's overview, built from real bookings, quotes and leads. */
export async function loadOperationsOverview(now = new Date()): Promise<OperationsOverview> {
  const client = createServiceRoleClient();
  const today = lagosToday(now);
  const todayRange = lagosDayRange(today);

  const [todayBookings, metrics, recentLeads, upcomingBookings] = await Promise.all([
    client.from("bookings")
      .select("id,booking_number,status,total,scheduled_start_at,address,customers(full_name),services(name),quotes(requires_review)")
      .in("status", ACTIVE_BOOKING_STATUSES)
      .gte("scheduled_start_at", todayRange.start).lte("scheduled_start_at", todayRange.end)
      .order("scheduled_start_at"),
    client.rpc("dashboard_metrics", { at_time: now.toISOString() }),
    client.from("leads")
      .select("id,source,status,created_at,customers(full_name),services(name)")
      .order("created_at", { ascending: false }).limit(8),
    client.from("bookings")
      .select("id,booking_number,status,total,scheduled_start_at,customers(full_name),services(name),quotes(requires_review)")
      .gt("scheduled_start_at", todayRange.end)
      .in("status", ACTIVE_BOOKING_STATUSES)
      .order("scheduled_start_at").limit(10),
  ]);
  for (const result of [todayBookings, metrics, recentLeads, upcomingBookings]) {
    if (result.error) throw new Error(result.error.message);
  }

  type BookingRow = { id: string; booking_number: number; status: string; total: number | string; scheduled_start_at: string; address: string; customers: { full_name: string | null } | null; services: { name: string } | null; quotes: { requires_review: boolean } | null };
  type LeadRow = { id: string; source: string; status: string; created_at: string; customers: { full_name: string | null } | null; services: { name: string } | null };

  const todayRows = (todayBookings.data ?? []) as unknown as BookingRow[];
  const leadRows = (recentLeads.data ?? []) as unknown as LeadRow[];
  const upcomingRows = (upcomingBookings.data ?? []) as unknown as BookingRow[];

  const summary = metrics.data as { weeklyRevenue: OperationsOverview["weeklyRevenue"]; weeklyRevenueTotal: number; pendingPayments: number; openEnquiries: number; siteVisits: number };
  const weeklyRevenue = summary.weeklyRevenue;
  const weeklyRevenueTotal = Number(summary.weeklyRevenueTotal);

  const timeFormatter = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hour12: false });
  const nairaCompact = (value: number) => value >= 1_000_000 ? `₦${(value / 1_000_000).toFixed(2)}m` : value >= 1000 ? `₦${Math.round(value / 1000)}k` : `₦${value}`;

  return {
    today,
    kpis: [
      { label: "Jobs today", value: String(todayRows.length), note: todayRows.length ? "Scheduled in Abuja" : "Nothing booked yet", tone: todayRows.length ? "positive" : "neutral" },
      { label: "Revenue this week", value: nairaCompact(weeklyRevenueTotal), note: "Verified payments received", tone: weeklyRevenueTotal > 0 ? "positive" : "neutral" },
      { label: "Site visits", value: String(summary.siteVisits), note: "Public page views this week", tone: "neutral" },
      { label: "Unpaid bookings", value: String(summary.pendingPayments), note: "Awaiting customer payment", tone: "neutral" },
    ],
    weeklyRevenue,
    weeklyRevenueTotal,
    schedule: todayRows.map((row) => ({
      id: row.id,
      reference: `BOOM-${row.booking_number}`,
      time: timeFormatter.format(new Date(row.scheduled_start_at)),
      customer: row.customers?.full_name ?? "Unnamed customer",
      initials: initialsOf(row.customers?.full_name ?? null),
      service: row.services?.name ?? "Unknown service",
      address: row.address,
      status: row.status,
      total: Number(row.total),
      requiresReview: row.quotes?.requires_review ?? false,
    })),
    upcoming: upcomingRows.map((row) => ({
      id: row.id,
      reference: `BOOM-${row.booking_number}`,
      date: new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short" }).format(new Date(row.scheduled_start_at)),
      time: timeFormatter.format(new Date(row.scheduled_start_at)),
      customer: row.customers?.full_name ?? "Unnamed customer",
      service: row.services?.name ?? "Unknown service",
      status: row.status,
      total: Number(row.total),
      requiresReview: row.quotes?.requires_review ?? false,
    })),
    enquiries: leadRows.map((lead) => ({
      id: lead.id,
      customer: lead.customers?.full_name ?? "Unnamed",
      initials: initialsOf(lead.customers?.full_name ?? null),
      service: lead.services?.name ?? "Unspecified",
      source: lead.source,
      received: new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short" }).format(new Date(lead.created_at)),
      status: lead.status,
    })),
  };
}
