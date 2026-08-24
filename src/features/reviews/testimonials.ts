import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";

export type Testimonial = {
  id: string;
  quote: string;
  author: string;
  source: "WHATSAPP" | "INSTAGRAM" | "GOOGLE" | "EMAIL" | "OTHER";
};

const SOURCE_LABELS: Record<Testimonial["source"], string> = {
  WHATSAPP: "via WhatsApp",
  INSTAGRAM: "via Instagram",
  GOOGLE: "via Google",
  EMAIL: "via email",
  OTHER: "",
};

export const testimonialSourceLabel = (source: Testimonial["source"]) => SOURCE_LABELS[source] ?? "";

/**
 * Only what a staff member has published. An empty table simply means the section does not
 * render — nothing here is invented.
 */
export async function loadTestimonials(limit = 12): Promise<Testimonial[]> {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from("testimonials")
    .select("id,quote,author_label,source")
    .not("published_at", "is", null)
    .order("sort_order")
    .limit(Math.min(Math.max(limit, 1), 40));

  // Social proof is optional content. If the table is missing or the query fails, the page
  // renders without the section rather than failing outright.
  if (error) {
    console.error("Testimonials unavailable", { code: error.code });
    return [];
  }

  return (data as { id: string; quote: string; author_label: string; source: Testimonial["source"] }[])
    .map((row) => ({ id: row.id, quote: row.quote, author: row.author_label, source: row.source }));
}
