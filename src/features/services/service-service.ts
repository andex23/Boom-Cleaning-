import type { ServiceRepository } from "@/features/services/service-repository";
export class ServiceService { constructor(private readonly repository: ServiceRepository) {} listPublicServices() { return this.repository.listActive(); } getService(slug: string) { return this.repository.findBySlug(slug); } }
