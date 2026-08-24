import "server-only";

import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const LEAD_STATUSES = ["NEW", "QUALIFYING", "QUALIFIED", "QUOTE_SENT", "AWAITING_PAYMENT", "BOOKED", "LOST", "CANCELLED"] as const;

export const leadUpdateSchema = z.object({
  leadId: z.uuid(),
  status: z.enum(LEAD_STATUSES),
});

export type LeadRecord = {
  id: string;
  customer: string | null;
  phone: string | null;
  email: string | null;
  service: string | null;
  source: string;
  status: string;
  notes: string | null;
  createdAt: string;
};

export type CustomerRecord = {
  id: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  createdAt: string;
  channels: string[];
  bookingCount: number;
  /** Only completed and confirmed work counts, so cancellations do not inflate it. */
  lifetimeValue: number;
  lastBookingAt: string | null;
};

export async function loadLeads(limit = 100): Promise<LeadRecord[]> {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from("leads")
    .select("id,source,status,notes,created_at,customers(full_name,phone,email),services(name)")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 200));
  if (error) throw new Error(error.message);

  type Row = { id: string; source: string; status: string; notes: string | null; created_at: string; customers: { full_name: string | null; phone: string | null; email: string | null } | null; services: { name: string } | null };
  return (data as unknown as Row[]).map((row) => ({
    id: row.id,
    customer: row.customers?.full_name ?? null,
    phone: row.customers?.phone ?? null,
    email: row.customers?.email ?? null,
    service: row.services?.name ?? null,
    source: row.source,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  }));
}

export async function updateLeadStatus(update: z.infer<typeof leadUpdateSchema>) {
  const client = createServiceRoleClient();
  const { error } = await client
    .from("leads")
    .update({ status: update.status, updated_at: new Date().toISOString() })
    .eq("id", update.leadId);
  if (error) throw new Error(error.message);
}

/**
 * The customer list with the numbers staff actually ask for: how many jobs, how much
 * they're worth, and which channels they've reached BOOM through.
 */
export async function loadCustomers(limit = 100): Promise<CustomerRecord[]> {
  const client = createServiceRoleClient();
  const [customers, bookings, identities] = await Promise.all([
    client.from("customers").select("id,full_name,phone,email,location,created_at").order("created_at", { ascending: false }).limit(Math.min(Math.max(limit, 1), 200)),
    client.from("bookings").select("customer_id,total,status,scheduled_start_at"),
    client.from("customer_identities").select("customer_id,channel"),
  ]);
  for (const result of [customers, bookings, identities]) {
    if (result.error) throw new Error(result.error.message);
  }

  type BookingRow = { customer_id: string; total: number | string; status: string; scheduled_start_at: string };
  const bookingRows = (bookings.data ?? []) as BookingRow[];
  const identityRows = (identities.data ?? []) as { customer_id: string; channel: string }[];

  return ((customers.data ?? []) as { id: string; full_name: string | null; phone: string | null; email: string | null; location: string | null; created_at: string }[]).map((customer) => {
    const theirs = bookingRows.filter((row) => row.customer_id === customer.id);
    const billable = theirs.filter((row) => ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(row.status));
    const last = theirs.map((row) => row.scheduled_start_at).sort().at(-1) ?? null;
    return {
      id: customer.id,
      fullName: customer.full_name,
      phone: customer.phone,
      email: customer.email,
      location: customer.location,
      createdAt: customer.created_at,
      channels: [...new Set(identityRows.filter((row) => row.customer_id === customer.id).map((row) => row.channel))],
      bookingCount: theirs.length,
      lifetimeValue: billable.reduce((total, row) => total + Number(row.total), 0),
      lastBookingAt: last,
    };
  });
}
