# BOOM search setup

Canonical website: https://boomcleaning.site
Sitemap: https://boomcleaning.site/sitemap.xml
Crawler rules: https://boomcleaning.site/robots.txt
Social preview: https://boomcleaning.site/opengraph-image

Public page metadata is defined in `src/lib/seo.ts`. The sitemap uses the same page registry, so a new indexable page must be added there. Booking forms, payment returns, staff pages and APIs are excluded from the sitemap; booking forms and private pages use noindex. Do not block the quote page in robots.txt: crawlers need to read its noindex directive. Robots rules are not access controls; existing authentication still protects admin data.

Business structured data uses published contact details and the Abuja service area. No street address, map coordinates, ratings or reviews have been invented. Service structured data comes from the active catalogue. Do not add a Google LocalBusiness street address until the owner provides a genuine business location. Starting prices should not be presented as fixed-price offers for every property.

## Owner steps outside the website

1. Add the domain `boomcleaning.site` to Google Search Console using the owner's Google account. Copy Google's actual verification TXT record to Namecheap and verify it. Never invent a verification value.
2. Submit `https://boomcleaning.site/sitemap.xml` in Search Console. Inspect the homepage, services and pricing URLs and request indexing if needed.
3. Claim or update the Google Business Profile for BOOM. Use the real name, phone number, website, hours and service areas. If customers are not received at the business address, configure it as a service-area business and follow Google's address visibility rules.
4. Check Search Console's indexing, search queries and mobile performance after Google has crawled the site. Publication does not guarantee indexing, rankings or rich results.

Search Console submission and Business Profile ownership are separate from the website deployment and require the owner's account. They have not been completed by this code change.
