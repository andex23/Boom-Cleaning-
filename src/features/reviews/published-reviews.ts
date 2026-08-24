import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";

export type PublishedReview = {
  id: string;
  rating: number;
  comment: string;
  /** First name plus an initial; customers never agreed to their full name on a website. */
  author: string;
  service: string | null;
};

/** Surname reduced to an initial, the way review sites normally do it. */
function shortenName(fullName: string | null) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A BOOM customer";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
}

/**
 * Only reviews a staff member has explicitly published. Nothing is invented and nothing
 * appears on the website until someone sets published_at, so an empty table simply means
 * the section does not render.
 */
export async function loadPublishedReviews(limit = 6): Promise<PublishedReview[]> {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from("reviews")
    .select("id,rating,comment,customers(full_name),bookings(services(name))")
    .not("published_at", "is", null)
    .not("comment", "is", null)
    .order("published_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 24));
  if (error) throw new Error(error.message);

  type Row = { id: string; rating: number; comment: string | null; customers: { full_name: string | null } | null; bookings: { services: { name: string } | null } | null };
  return (data as unknown as Row[])
    .filter((row) => row.comment?.trim())
    .map((row) => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment!.trim(),
      author: shortenName(row.customers?.full_name ?? null),
      service: row.bookings?.services?.name ?? null,
    }));
}
