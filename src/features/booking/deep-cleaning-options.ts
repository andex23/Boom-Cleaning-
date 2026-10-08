export const DEEP_CLEANING_BUNDLE_SLUGS = new Set(["deep-cleaning-upholstery", "deep-cleaning-fumigation", "deep-cleaning-upholstery-fumigation"]);
export function isDeepCleaningPackage(slug: string) { return slug === "deep-cleaning" || DEEP_CLEANING_BUNDLE_SLUGS.has(slug); }
export function deepCleaningExtrasFromSlug(slug: string) { return { upholstery: slug.includes("upholstery"), fumigation: slug.includes("fumigation") }; }
export function deepCleaningSlugForExtras(upholstery: boolean, fumigation: boolean) { return `deep-cleaning${upholstery ? "-upholstery" : ""}${fumigation ? "-fumigation" : ""}`; }
