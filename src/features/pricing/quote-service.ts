import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { pricingCatalogSchema, quoteResultSchema, type PricingCatalog, type QuoteRequest, type QuoteResult } from "@/lib/validation/pricing";

/** Raised when the caller named a service, property type or area that is not bookable. */
export class UnknownPricingSelectionError extends Error {}

/**
 * Prices a scope. The calculation lives in public.calculate_quote so that this preview and
 * the booking transaction cannot drift apart, and so no amount ever crosses the network
 * from the browser.
 */
export async function calculateQuote(client: SupabaseClient, request: QuoteRequest): Promise<QuoteResult> {
  const { data, error } = await client.rpc("calculate_quote", {
    request: { serviceSlug: request.serviceSlug, propertyTypeSlug: request.propertyTypeSlug, areaSlug: request.areaSlug, spaces: request.spaces },
  });
  if (error) {
    // 23503 is the function's signal for an unknown or inactive selection.
    if (error.code === "23503") throw new UnknownPricingSelectionError(error.message);
    throw new Error(error.message);
  }
  return quoteResultSchema.parse(data);
}

type PropertyTypeRow = { slug: string; name: string; description: string | null; requires_review: boolean };
type ServiceAreaRow = { slug: string; name: string; requires_review: boolean };
type SpaceTypeRow = { id: string; slug: string; name: string; description: string | null; max_count: number; requires_review: boolean };
type SpacePriceRow = { space_type_id: string; unit_price: number | string; included_count: number };

/**
 * Loads the options one service's property step should offer. Space types with no active
 * price for the service are still listed — selecting one routes the quote to review rather
 * than hiding a scope the customer genuinely has.
 */
export async function loadPricingCatalog(client: SupabaseClient, serviceSlug: string): Promise<PricingCatalog> {
  const service = await client.from("services").select("id").eq("slug", serviceSlug).eq("is_active", true).maybeSingle();
  if (service.error) throw new Error(service.error.message);
  if (!service.data) throw new UnknownPricingSelectionError("Unknown service");

  const [propertyTypes, spaceTypes, serviceAreas, spacePrices] = await Promise.all([
    client.from("property_types").select("slug,name,description,requires_review").eq("is_active", true).order("sort_order"),
    client.from("space_types").select("id,slug,name,description,max_count,requires_review").eq("is_active", true).order("sort_order"),
    client.from("service_areas").select("slug,name,requires_review").eq("is_active", true).order("sort_order"),
    client.from("service_space_prices").select("space_type_id,unit_price,included_count").eq("service_id", service.data.id).eq("is_active", true),
  ]);
  for (const result of [propertyTypes, spaceTypes, serviceAreas, spacePrices]) {
    if (result.error) throw new Error(result.error.message);
  }

  const priceBySpaceType = new Map((spacePrices.data as SpacePriceRow[]).map((row) => [row.space_type_id, row]));
  return pricingCatalogSchema.parse({
    propertyTypes: (propertyTypes.data as PropertyTypeRow[]).map((row) => ({ slug: row.slug, name: row.name, description: row.description, requiresReview: row.requires_review })),
    serviceAreas: (serviceAreas.data as ServiceAreaRow[]).map((row) => ({ slug: row.slug, name: row.name, requiresReview: row.requires_review })),
    spaceTypes: (spaceTypes.data as SpaceTypeRow[]).map((row) => {
      const price = priceBySpaceType.get(row.id);
      return {
        slug: row.slug, name: row.name, description: row.description, maxCount: row.max_count,
        // A space with no price for this service always needs a person to quote it.
        requiresReview: row.requires_review || !price,
        unitPrice: price ? Number(price.unit_price) : null,
        includedCount: price?.included_count ?? 0,
      };
    }),
  });
}
