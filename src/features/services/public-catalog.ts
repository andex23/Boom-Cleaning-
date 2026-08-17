import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import { fallbackPresentation, servicePresentation, type ServiceIconName } from "@/data/service-presentation";

export type PublicServiceView = {
  id: string;
  slug: string;
  name: string;
  /** The "from" price shown before a scope is described; null when always quoted by a person. */
  priceFrom: number | null;
  requiresReview: boolean;
  summary: string;
  duration: string;
  category: "home" | "business" | "specialist";
  icon: ServiceIconName;
  tagline: string;
  image: string;
};

/**
 * The bookable catalogue, from the database. Presentation copy is merged in by slug, so a
 * service added by staff appears immediately with sensible defaults instead of vanishing
 * from the site until someone edits a TypeScript file.
 */
export async function listBookableServices(): Promise<PublicServiceView[]> {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from("services")
    .select("id,slug,name,description,base_price,requires_review")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);

  return (data as { id: string; slug: string; name: string; description: string | null; base_price: number | string; requires_review: boolean }[]).map((row) => {
    const presentation = servicePresentation[row.slug] ?? fallbackPresentation;
    const basePrice = Number(row.base_price);
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      priceFrom: row.requires_review || basePrice <= 0 ? null : basePrice,
      requiresReview: row.requires_review,
      summary: row.description ?? presentation.summary,
      duration: presentation.duration,
      category: presentation.category,
      icon: presentation.icon,
      tagline: presentation.tagline,
      image: presentation.image,
    };
  });
}
