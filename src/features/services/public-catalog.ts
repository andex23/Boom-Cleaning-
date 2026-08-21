import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import { formatNaira } from "@/lib/format";
import { fallbackPresentation, servicePresentation, type ServiceIconName } from "@/data/service-presentation";

export type PublicServiceView = {
  id: string;
  slug: string;
  name: string;
  /** The "from" price shown before a scope is described; null when always quoted by a person. */
  priceFrom: number | null;
  requiresReview: boolean;
  /**
   * One phrase for the price, decided once here so the carousel, the catalogue and the
   * booking flow cannot describe the same service three different ways.
   */
  priceLabel: string;
  summary: string;
  duration: string;
  category: "home" | "business" | "specialist";
  icon: ServiceIconName;
  tagline: string;
  image: string;
};

/**
 * The cheapest published price for each service that sells from a bedroom table.
 *
 * These services carry base_price 0 because no single number describes them — the price
 * comes from `service_bedroom_tiers`. Reading only base_price made the whole deep-cleaning
 * range advertise itself as "quoted for you" even though every tier is published.
 */
async function lowestTierPrices(client: ReturnType<typeof createServiceRoleClient>): Promise<Map<string, number>> {
  const { data, error } = await client.from("service_bedroom_tiers").select("service_id,price");
  if (error) {
    // A missing tier table must not take the site down; services fall back to base_price.
    console.error("Bedroom tier prices unavailable", { code: error.code });
    return new Map();
  }
  const lowest = new Map<string, number>();
  for (const row of data as { service_id: string; price: number | string }[]) {
    const price = Number(row.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const current = lowest.get(row.service_id);
    if (current === undefined || price < current) lowest.set(row.service_id, price);
  }
  return lowest;
}

/**
 * The bookable catalogue, from the database. Presentation copy is merged in by slug, so a
 * service added by staff appears immediately with sensible defaults instead of vanishing
 * from the site until someone edits a TypeScript file.
 */
export async function listBookableServices(): Promise<PublicServiceView[]> {
  const client = createServiceRoleClient();
  const [{ data, error }, tierPrices] = await Promise.all([
    client
      .from("services")
      .select("id,slug,name,description,base_price,requires_review")
      .eq("is_active", true)
      .order("sort_order"),
    lowestTierPrices(client),
  ]);
  if (error) throw new Error(error.message);

  return (data as { id: string; slug: string; name: string; description: string | null; base_price: number | string; requires_review: boolean }[]).map((row) => {
    const presentation = servicePresentation[row.slug] ?? fallbackPresentation;
    const basePrice = Number(row.base_price);
    const published = tierPrices.get(row.id) ?? (basePrice > 0 ? basePrice : null);
    const priceFrom = row.requires_review ? null : published;
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      priceFrom,
      requiresReview: row.requires_review,
      // A service with no published price that still prices itself automatically charges
      // per room, so say that rather than implying someone has to get back to you.
      priceLabel: priceFrom !== null ? `From ${formatNaira(priceFrom)}` : row.requires_review ? "Quoted for you" : "Priced per room",
      summary: row.description ?? presentation.summary,
      duration: presentation.duration,
      category: presentation.category,
      icon: presentation.icon,
      tagline: presentation.tagline,
      image: presentation.image,
    };
  });
}
