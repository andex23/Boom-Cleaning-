import "server-only";

import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service";

const money = z.number().finite().nonnegative().max(100_000_000).multipleOf(0.01);

/**
 * What staff may change without a deploy. Slugs are deliberately not editable: they are the
 * contract shared with the booking payload, the DM agent and every frozen quote item.
 */
export const pricingUpdateSchema = z.object({
  services: z.array(z.object({ slug: z.string().trim().max(100), basePrice: money, minimumCharge: money, requiresReview: z.boolean() })).max(100).default([]),
  propertyTypes: z.array(z.object({ slug: z.string().trim().max(100), baseMultiplier: z.number().finite().gt(0).max(10), minimumCharge: money, requiresReview: z.boolean() })).max(100).default([]),
  spacePrices: z.array(z.object({ serviceSlug: z.string().trim().max(100), spaceSlug: z.string().trim().max(100), unitPrice: money, includedCount: z.number().int().min(0).max(100) })).max(600).default([]),
  serviceAreas: z.array(z.object({ slug: z.string().trim().max(100), surcharge: money, requiresReview: z.boolean() })).max(100).default([]),
});

export type PricingUpdate = z.infer<typeof pricingUpdateSchema>;

export type PricingAdminData = {
  services: { slug: string; name: string; basePrice: number; minimumCharge: number; requiresReview: boolean }[];
  propertyTypes: { slug: string; name: string; baseMultiplier: number; minimumCharge: number; requiresReview: boolean }[];
  spaceTypes: { slug: string; name: string; requiresReview: boolean }[];
  serviceAreas: { slug: string; name: string; surcharge: number; requiresReview: boolean }[];
  /** Keyed `${serviceSlug}::${spaceSlug}`; a missing key means the scope goes to review. */
  spacePrices: Record<string, { unitPrice: number; includedCount: number }>;
};

export async function loadPricingAdminData(): Promise<PricingAdminData> {
  const client = createServiceRoleClient();
  const [services, propertyTypes, spaceTypes, serviceAreas, spacePrices] = await Promise.all([
    client.from("services").select("id,slug,name,base_price,minimum_charge,requires_review").eq("is_active", true).order("sort_order"),
    client.from("property_types").select("slug,name,base_multiplier,minimum_charge,requires_review").eq("is_active", true).order("sort_order"),
    client.from("space_types").select("id,slug,name,requires_review").eq("is_active", true).order("sort_order"),
    client.from("service_areas").select("slug,name,surcharge,requires_review").eq("is_active", true).order("sort_order"),
    client.from("service_space_prices").select("service_id,space_type_id,unit_price,included_count").eq("is_active", true),
  ]);
  for (const result of [services, propertyTypes, spaceTypes, serviceAreas, spacePrices]) {
    if (result.error) throw new Error(result.error.message);
  }

  const serviceSlugById = new Map((services.data as { id: string; slug: string }[]).map((row) => [row.id, row.slug]));
  const spaceSlugById = new Map((spaceTypes.data as { id: string; slug: string }[]).map((row) => [row.id, row.slug]));
  const priceMap: PricingAdminData["spacePrices"] = {};
  for (const row of spacePrices.data as { service_id: string; space_type_id: string; unit_price: number | string; included_count: number }[]) {
    const serviceSlug = serviceSlugById.get(row.service_id);
    const spaceSlug = spaceSlugById.get(row.space_type_id);
    if (serviceSlug && spaceSlug) priceMap[`${serviceSlug}::${spaceSlug}`] = { unitPrice: Number(row.unit_price), includedCount: row.included_count };
  }

  return {
    services: (services.data as { slug: string; name: string; base_price: number | string; minimum_charge: number | string; requires_review: boolean }[])
      .map((row) => ({ slug: row.slug, name: row.name, basePrice: Number(row.base_price), minimumCharge: Number(row.minimum_charge), requiresReview: row.requires_review })),
    propertyTypes: (propertyTypes.data as { slug: string; name: string; base_multiplier: number | string; minimum_charge: number | string; requires_review: boolean }[])
      .map((row) => ({ slug: row.slug, name: row.name, baseMultiplier: Number(row.base_multiplier), minimumCharge: Number(row.minimum_charge), requiresReview: row.requires_review })),
    spaceTypes: (spaceTypes.data as { slug: string; name: string; requires_review: boolean }[])
      .map((row) => ({ slug: row.slug, name: row.name, requiresReview: row.requires_review })),
    serviceAreas: (serviceAreas.data as { slug: string; name: string; surcharge: number | string; requires_review: boolean }[])
      .map((row) => ({ slug: row.slug, name: row.name, surcharge: Number(row.surcharge), requiresReview: row.requires_review })),
    spacePrices: priceMap,
  };
}

/**
 * Applies price edits. Existing quotes are unaffected: their line items were frozen into
 * quote_items when they were created.
 */
export async function applyPricingUpdate(update: PricingUpdate) {
  const client = createServiceRoleClient();

  for (const service of update.services) {
    const result = await client.from("services")
      .update({ base_price: service.basePrice, minimum_charge: service.minimumCharge, requires_review: service.requiresReview, updated_at: new Date().toISOString() })
      .eq("slug", service.slug);
    if (result.error) throw new Error(result.error.message);
  }
  for (const type of update.propertyTypes) {
    const result = await client.from("property_types")
      .update({ base_multiplier: type.baseMultiplier, minimum_charge: type.minimumCharge, requires_review: type.requiresReview, updated_at: new Date().toISOString() })
      .eq("slug", type.slug);
    if (result.error) throw new Error(result.error.message);
  }
  for (const area of update.serviceAreas) {
    const result = await client.from("service_areas")
      .update({ surcharge: area.surcharge, requires_review: area.requiresReview, updated_at: new Date().toISOString() })
      .eq("slug", area.slug);
    if (result.error) throw new Error(result.error.message);
  }

  if (update.spacePrices.length) {
    const [services, spaceTypes] = await Promise.all([
      client.from("services").select("id,slug"),
      client.from("space_types").select("id,slug"),
    ]);
    if (services.error) throw new Error(services.error.message);
    if (spaceTypes.error) throw new Error(spaceTypes.error.message);
    const serviceIdBySlug = new Map((services.data as { id: string; slug: string }[]).map((row) => [row.slug, row.id]));
    const spaceIdBySlug = new Map((spaceTypes.data as { id: string; slug: string }[]).map((row) => [row.slug, row.id]));

    const rows = update.spacePrices.flatMap((price) => {
      const serviceId = serviceIdBySlug.get(price.serviceSlug);
      const spaceTypeId = spaceIdBySlug.get(price.spaceSlug);
      if (!serviceId || !spaceTypeId) return [];
      return [{ service_id: serviceId, space_type_id: spaceTypeId, unit_price: price.unitPrice, included_count: price.includedCount, is_active: true, updated_at: new Date().toISOString() }];
    });
    if (rows.length) {
      const result = await client.from("service_space_prices").upsert(rows, { onConflict: "service_id,space_type_id" });
      if (result.error) throw new Error(result.error.message);
    }
  }
}

export const bookingPriceSchema = z.object({
  bookingNumber: z.number().int().positive(),
  amount: money,
  note: z.string().trim().max(240).optional(),
});

export type BookingPriceUpdate = z.infer<typeof bookingPriceSchema>;

export class BookingPriceError extends Error {}

/**
 * Sets the agreed price on one booking. Used for scopes the calculator deliberately would
 * not price, and for correcting a total after a site visit. The difference is recorded as a
 * line item so the breakdown continues to add up.
 */
export async function setBookingPrice(update: BookingPriceUpdate) {
  const client = createServiceRoleClient();
  const { data, error } = await client.rpc("set_booking_price", { request: update });
  if (error) {
    if (error.code === "22023" || error.code === "23503") throw new BookingPriceError(error.message);
    throw new Error(error.message);
  }
  return data as { bookingNumber: number; previousTotal: number; total: number; delta: number; clearedReview: boolean };
}

export const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

export const bookingStatusSchema = z.object({
  bookingNumber: z.number().int().positive(),
  status: z.enum(BOOKING_STATUSES),
  note: z.string().trim().max(240).optional(),
});

export const rescheduleSchema = z.object({
  bookingNumber: z.number().int().positive(),
  scheduledStartAt: z.string().datetime({ offset: true }),
  crewId: z.uuid().optional(),
});

/** Only these moves make sense; the database enforces the same rules. */
export const NEXT_STATUSES: Record<string, readonly string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export async function setBookingStatus(update: z.infer<typeof bookingStatusSchema>) {
  const client = createServiceRoleClient();
  const { data, error } = await client.rpc("update_booking_status", { request: update });
  if (error) {
    if (error.code === "22023" || error.code === "23503") throw new BookingPriceError(error.message);
    throw new Error(error.message);
  }
  return data;
}

export async function rescheduleBooking(update: z.infer<typeof rescheduleSchema>) {
  const client = createServiceRoleClient();
  const { data, error } = await client.rpc("reschedule_booking", { request: update });
  if (error) {
    if (error.code === "23P01") throw new BookingPriceError("No crew is free at that time.");
    if (error.code === "22023" || error.code === "23503") throw new BookingPriceError(error.message);
    throw new Error(error.message);
  }
  return data;
}

export type BookingBreakdown = {
  reference: string;
  bookingNumber: number;
  customer: string | null;
  serviceName: string;
  propertyType: string | null;
  scheduledStartAt: string;
  status: string;
  crewName: string | null;
  currency: string;
  total: number;
  requiresReview: boolean;
  items: { kind: string; label: string; amount: number }[];
};

/** Recent bookings with the frozen line items that explain each total. */
export async function loadRecentBookingBreakdowns(limit = 8): Promise<BookingBreakdown[]> {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from("bookings")
    .select("booking_number,status,scheduled_start_at,currency,total,customers(full_name),services(name),crews(name),quotes(requires_review,property_types(name),quote_items(kind,label,amount,sort_order))")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 25));
  if (error) throw new Error(error.message);

  type Row = {
    booking_number: number; status: string; scheduled_start_at: string; currency: string; total: number | string;
    customers: { full_name: string | null } | null;
    services: { name: string } | null;
    crews: { name: string } | null;
    quotes: { requires_review: boolean; property_types: { name: string } | null; quote_items: { kind: string; label: string; amount: number | string; sort_order: number }[] } | null;
  };

  return (data as unknown as Row[]).map((row) => ({
    reference: `BOOM-${row.booking_number}`,
    bookingNumber: row.booking_number,
    customer: row.customers?.full_name ?? null,
    serviceName: row.services?.name ?? "Unknown service",
    propertyType: row.quotes?.property_types?.name ?? null,
    scheduledStartAt: row.scheduled_start_at,
    status: row.status,
    crewName: row.crews?.name ?? null,
    currency: row.currency,
    total: Number(row.total),
    requiresReview: row.quotes?.requires_review ?? false,
    items: (row.quotes?.quote_items ?? [])
      .slice()
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((item) => ({ kind: item.kind, label: item.label, amount: Number(item.amount) })),
  }));
}
