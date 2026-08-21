import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import { listBookableServices, type PublicServiceView } from "@/features/services/public-catalog";

export type BedroomPriceTier = { bedrooms: number; price: number };
export type SpacePriceTier = { quantity: number; price: number };
export type PublicSpacePrice = {
  slug: string;
  name: string;
  description: string | null;
  unitPrice: number | null;
  priceTiers: SpacePriceTier[];
  requiresReview: boolean;
};

export type PublicPricingCard = PublicServiceView & {
  bedroomTiers: BedroomPriceTier[];
  spacePrices: PublicSpacePrice[];
};

type BedroomRow = { service_id: string; bedrooms: number; price: number | string };
type SpaceTypeRow = { id: string; slug: string; name: string; description: string | null; requires_review: boolean };
type SpacePriceRow = { service_id: string; space_type_id: string; unit_price: number | string };
type SpaceTierRow = { service_id: string; space_type_id: string; quantity: number; price: number | string };

/**
 * Public pricing is read from the same tables used by calculate_quote. Keeping this as one
 * server-side catalogue query prevents a decorative pricing page from drifting away from
 * what the booking flow will actually charge.
 */
export async function listPublicPricing(): Promise<PublicPricingCard[]> {
  const client = createServiceRoleClient();
  const [services, bedroomResult, typeResult, priceResult, tierResult] = await Promise.all([
    listBookableServices(),
    client.from("service_bedroom_tiers").select("service_id,bedrooms,price").order("bedrooms"),
    client.from("space_types").select("id,slug,name,description,requires_review").eq("is_active", true).order("sort_order"),
    client.from("service_space_prices").select("service_id,space_type_id,unit_price").eq("is_active", true),
    client.from("service_space_tiers").select("service_id,space_type_id,quantity,price").order("quantity"),
  ]);

  for (const result of [bedroomResult, typeResult, priceResult, tierResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const bedroomByService = new Map<string, BedroomPriceTier[]>();
  for (const row of bedroomResult.data as BedroomRow[]) {
    const rows = bedroomByService.get(row.service_id) ?? [];
    rows.push({ bedrooms: row.bedrooms, price: Number(row.price) });
    bedroomByService.set(row.service_id, rows);
  }

  const typeById = new Map((typeResult.data as SpaceTypeRow[]).map((row) => [row.id, row]));
  const tierByServiceAndType = new Map<string, SpacePriceTier[]>();
  for (const row of tierResult.data as SpaceTierRow[]) {
    const key = `${row.service_id}:${row.space_type_id}`;
    const rows = tierByServiceAndType.get(key) ?? [];
    rows.push({ quantity: row.quantity, price: Number(row.price) });
    tierByServiceAndType.set(key, rows);
  }

  const spacesByService = new Map<string, PublicSpacePrice[]>();
  for (const row of priceResult.data as SpacePriceRow[]) {
    const space = typeById.get(row.space_type_id);
    if (!space) continue;
    const rows = spacesByService.get(row.service_id) ?? [];
    rows.push({
      slug: space.slug,
      name: space.name,
      description: space.description,
      unitPrice: Number(row.unit_price),
      priceTiers: tierByServiceAndType.get(`${row.service_id}:${row.space_type_id}`) ?? [],
      requiresReview: space.requires_review,
    });
    spacesByService.set(row.service_id, rows);
  }

  // A quantity tier may deliberately replace a unit price (fumigation BQ is the live
  // example), so include it even when service_space_prices has no active row.
  for (const [key, priceTiers] of tierByServiceAndType) {
    const [serviceId, spaceTypeId] = key.split(":");
    const space = typeById.get(spaceTypeId);
    if (!space) continue;
    const rows = spacesByService.get(serviceId) ?? [];
    if (!rows.some((row) => row.slug === space.slug)) {
      rows.push({ slug: space.slug, name: space.name, description: space.description, unitPrice: null, priceTiers, requiresReview: space.requires_review });
      spacesByService.set(serviceId, rows);
    }
  }

  return services.map((service) => ({
    ...service,
    bedroomTiers: bedroomByService.get(service.id) ?? [],
    spacePrices: spacesByService.get(service.id) ?? [],
  }));
}
