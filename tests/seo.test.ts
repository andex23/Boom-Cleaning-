import { describe, expect, it } from "vitest";
import { businessStructuredData, pageMetadata, publicPages, serializeJsonLd, SITE_URL } from "@/lib/seo";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

describe("public search metadata", () => {
  it("gives every indexable page its own canonical URL and matching sharing metadata", () => {
    const titles = new Set();
    for (const path of Object.keys(publicPages) as (keyof typeof publicPages)[]) {
      const metadata = pageMetadata(path);
      expect(metadata.alternates?.canonical).toBe(`${SITE_URL}${path === "/" ? "" : path}`);
      expect(metadata.openGraph).toMatchObject({ title: metadata.title, description: metadata.description });
      expect(metadata.twitter).toMatchObject({ card: "summary_large_image", title: metadata.title });
      titles.add(metadata.title);
    }
    expect(titles.size).toBe(Object.keys(publicPages).length);
  });
  it("lists only public canonical pages and keeps operational routes out", () => {
    expect(sitemap().map(entry => entry.url)).toEqual(Object.keys(publicPages).map(path => `${SITE_URL}${path === "/" ? "" : path}`));
    for (const entry of sitemap()) expect(entry.url).not.toMatch(/admin|api|payments|quote|\?/);
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(robots().rules).toMatchObject({ disallow: ["/api/", "/admin", "/payments/"] });
  });
  it("uses real business contact details without invented reviews or a street address", () => {
    const business = businessStructuredData["@graph"][0];
    expect(business).toMatchObject({ name: "BOOM Cleaning Services", telephone: "+2349029799205", email: "boomcleaninfo@gmail.com" });
    expect(business).not.toHaveProperty("aggregateRating");
    expect(business).not.toHaveProperty("address");
  });
  it("prevents managed catalogue text from closing a JSON-LD script", () => {
    const value = { description: '</script><script>alert("x")</script>' };
    const serialized = serializeJsonLd(value);
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual(value);
  });
});
