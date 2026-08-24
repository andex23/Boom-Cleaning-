import type { Service } from "@/types/domain";
export interface ServiceRepository { listActive(): Promise<Service[]>; findBySlug(slug: string): Promise<Service | null>; }
