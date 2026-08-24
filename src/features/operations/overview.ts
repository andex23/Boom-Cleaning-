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

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Monday of the week containing the given Lagos date. */
function weekStart(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  return addDays(isoDate, -((date.getUTCDay() + 6) % 7));
}

export type OperationsOverview = {
  today: string;
  kpis: { label: string; value: string; note: string; tone: "positive" | "neutral" | "warning" }[];
  weeklyRevenue: { day: string; date: string; value: number }[];
  weeklyRevenueTotal: number;
  schedule: { id: string; reference: string; time: string; customer: string; initials: string; service: string; address: string; status: string; total: number; requiresReview: boolean }[];
  /** Jobs after today, so a booking for next week is not invisible. */
  upcoming: { id: string; reference: string; date: string; time: string; customer: string; service: string; status: string; total: number; requiresReview: boolean }[];
  attention: { id: string; kind: "Pricing" | "Confirm" | "Lead"; title: string; detail: string }[];
  enquiries: { id: string; customer: string; initials: string; service: string; source: string; received: string; status: string }[];
  counts: { awaitingPricing: number; pendingConfirmation: number; openLeads: number };
};

const initialsOf = (name: string | null) =>
  (name ?? "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";

const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"];

/** The console's overview, built from real bookings, quotes and leads. */
export async function loadOperationsOverview(now = new Date()): Promise<OperationsOverview> {
  const client = createServiceRoleClient();
  const today = lagosToday(now);
  const todayRange = lagosDayRange(today);
  const monday = weekStart(today);
  const sunday = addDays(monday, 6);

  const [todayBookings, weekBookings, reviewQuotes, recentLeads, upcomingBookings] = await Promise.all([
    client.from("bookings")
      .select("id,booking_number,status,total,scheduled_start_at,address,customers(full_name),services(name),quotes(requires_review)")
      .gte("scheduled_start_at", todayRange.start).lte("scheduled_start_at", todayRange.end)
      .order("scheduled_start_at"),
    client.from("bookings")
      .select("id,status,total,scheduled_start_at")
      .gte("scheduled_start_at", lagosDayRange(monday).start).lte("scheduled_start_at", lagosDayRange(sunday).end)
      .in("status", ACTIVE_BOOKING_STATUSES),
    client.from("bookings")
      .select("id,booking_number,scheduled_start_at,customers(full_name),services(name),quotes!inner(requires_review)")
      .eq("quotes.requires_review", true).in("status", ["PENDING", "CONFIRMED"])
      .order("scheduled_start_at").limit(10),
    client.from("leads")
      .select("id,source,status,created_at,customers(full_name),services(name)")
      .order("created_at", { ascending: false }).limit(8),
    client.from("bookings")
      .select("id,booking_number,status,total,scheduled_start_at,customers(full_name),services(name),quotes(requires_review)")
      .gt("scheduled_start_at", todayRange.end)
      .not("status", "in", "(CANCELLED,NO_SHOW)")
      .order("scheduled_start_at").limit(10),
  ]);
  for (const result of [todayBookings, weekBookings, reviewQuotes, recentLeads, upcomingBookings]) {
    if (result.error) throw new Error(result.error.message);
  }

  type BookingRow = { id: string; booking_number: number; status: string; total: number | string; scheduled_start_at: string; address: string; customers: { full_name: string | null } | null; services: { name: string } | null; quotes: { requires_review: boolean } | null };
  type WeekRow = { id: string; status: string; total: number | string; scheduled_start_at: string };
  type ReviewRow = { id: string; booking_number: number; scheduled_start_at: string; customers: { full_name: string | null } | null; services: { name: string } | null };
  type LeadRow = { id: string; source: string; status: string; created_at: string; customers: { full_name: string | null } | null; services: { name: string } | null };

  const todayRows = (todayBookings.data ?? []) as unknown as BookingRow[];
  const weekRows = (weekBookings.data ?? []) as unknown as WeekRow[];
  const reviewRows = (reviewQuotes.data ?? []) as unknown as ReviewRow[];
  const leadRows = (recentLeads.data ?? []) as unknown as LeadRow[];
  const upcomingRows = (upcomingBookings.data ?? []) as unknown as BookingRow[];

  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyRevenue = weekdayLabels.map((day, index) => {
    const date = addDays(monday, index);
    const value = weekRows
      .filter((row) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date(row.scheduled_start_at)) === date)
      .reduce((total, row) => total + Number(row.total), 0);
    return { day, date, value };
  });
  const weeklyRevenueTotal = weeklyRevenue.reduce((total, entry) => total + entry.value, 0);

  const timeFormatter = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hour12: false });
  const openLeads = leadRows.filter((lead) => ["NEW", "QUALIFYING", "QUALIFIED"].includes(lead.status)).length;
  const nairaCompact = (value: number) => value >= 1_000_000 ? `₦${(value / 1_000_000).toFixed(2)}m` : value >= 1000 ? `₦${Math.round(value / 1000)}k` : `₦${value}`;

  return {
    today,
    kpis: [
      { label: "Jobs today", value: String(todayRows.length), note: todayRows.length ? "Scheduled in Abuja" : "Nothing booked yet", tone: todayRows.length ? "positive" : "neutral" },
      { label: "Revenue this week", value: nairaCompact(weeklyRevenueTotal), note: `Week of ${monday}`, tone: weeklyRevenueTotal > 0 ? "positive" : "neutral" },
      { label: "Awaiting pricing", value: String(reviewRows.length), note: reviewRows.length ? "Needs a quote from the team" : "All bookings priced", tone: reviewRows.length ? "warning" : "positive" },
      { label: "Open leads", value: String(openLeads), note: "Not yet booked", tone: openLeads ? "neutral" : "positive" },
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
    attention: [
      ...reviewRows.map((row) => ({
        id: `price-${row.id}`, kind: "Pricing" as const,
        title: `BOOM-${row.booking_number} needs a price`,
        detail: `${row.customers?.full_name ?? "A customer"} · ${row.services?.name ?? "service"}`,
      })),
      ...[...todayRows, ...upcomingRows].filter((row) => row.status === "PENDING").slice(0, 5).map((row) => ({
        id: `confirm-${row.id}`, kind: "Confirm" as const,
        title: `BOOM-${row.booking_number} is not confirmed`,
        detail: `${row.customers?.full_name ?? "A customer"} · ${new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short" }).format(new Date(row.scheduled_start_at))} at ${timeFormatter.format(new Date(row.scheduled_start_at))}`,
      })),
    ].slice(0, 8),
    enquiries: leadRows.map((lead) => ({
      id: lead.id,
      customer: lead.customers?.full_name ?? "Unnamed",
      initials: initialsOf(lead.customers?.full_name ?? null),
      service: lead.services?.name ?? "Unspecified",
      source: lead.source,
      received: new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short" }).format(new Date(lead.created_at)),
      status: lead.status,
    })),
    counts: {
      awaitingPricing: reviewRows.length,
      pendingConfirmation: todayRows.filter((row) => row.status === "PENDING").length,
      openLeads,
    },
  };
}
