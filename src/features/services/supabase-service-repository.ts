import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/types/domain";
import type { ServiceRepository } from "./service-repository";

type ServiceRow = { id: string; name: string; slug: string; description: string | null; pricing_model: Service["pricingModel"]; is_active: boolean; sort_order: number };
function toDomain(row: ServiceRow): Service { return { id: row.id, name: row.name, slug: row.slug, description: row.description, pricingModel: row.pricing_model, isActive: row.is_active, sortOrder: row.sort_order }; }

export class SupabaseServiceRepository implements ServiceRepository {
  async listActive(): Promise<Service[]> { const client = await createClient(); const { data, error } = await client.from("services").select("id,name,slug,description,pricing_model,is_active,sort_order").eq("is_active", true).order("sort_order"); if (error) throw error; return (data as ServiceRow[]).map(toDomain); }
  async findBySlug(slug: string): Promise<Service | null> { const client = await createClient(); const { data, error } = await client.from("services").select("id,name,slug,description,pricing_model,is_active,sort_order").eq("slug", slug).maybeSingle(); if (error) throw error; return data ? toDomain(data as ServiceRow) : null; }
}
