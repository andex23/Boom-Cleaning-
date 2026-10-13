import type { MetadataRoute } from "next";
import { publicPages, SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return Object.keys(publicPages).map(path => ({ url: `${SITE_URL}${path === "/" ? "" : path}` }));
}
