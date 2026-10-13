import type { Metadata } from "next";

export const SITE_URL = "https://boomcleaning.site";
export const BUSINESS_ID = `${SITE_URL}/#organization`;
export const publicPages = {
  "/": { title: "Cleaning Services in Abuja | BOOM Cleaning Services", description: "Professional home and office cleaning in Abuja. Book deep cleaning, upholstery cleaning, fumigation and post-construction cleaning with clear online prices." },
  "/services": { title: "Home & Office Cleaning Services in Abuja | BOOM", description: "Explore BOOM's cleaning services in Abuja, including deep cleaning, upholstery, fumigation, office and post-construction cleaning. See prices and book online." },
  "/pricing": { title: "Cleaning Prices in Abuja | BOOM Cleaning Services", description: "Compare BOOM's published cleaning prices in Abuja. See rates for deep cleaning, upholstery, fumigation and post-construction cleaning, then price your space." },
  "/about": { title: "About BOOM Cleaning Services | Abuja Cleaning Company", description: "Meet BOOM's uniformed cleaning team in Abuja. Learn how we prepare for home, office and post-construction cleaning with equipment matched to every job." },
  "/faq": { title: "Cleaning & Booking FAQs | BOOM Cleaning Services Abuja", description: "Find answers about cleaning prices, Abuja service coverage, equipment, preparation and booking with BOOM Cleaning Services." },
  "/terms": { title: "Booking Terms & Conditions | BOOM Cleaning Services", description: "Read BOOM Cleaning Services' booking terms, payment confirmation process, appointment preparation and contact details for changes or payment enquiries." },
} as const;

export function pageMetadata(path: keyof typeof publicPages): Metadata {
  const { title, description } = publicPages[path];
  return {
    title, description,
    alternates: { canonical: `${SITE_URL}${path === "/" ? "" : path}` },
    openGraph: { title, description, url: `${SITE_URL}${path === "/" ? "" : path}`, siteName: "BOOM Cleaning Services", locale: "en_NG", type: "website", images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "BOOM Cleaning Services — professional cleaning in Abuja" }] },
    twitter: { card: "summary_large_image", title, description, images: [`${SITE_URL}/opengraph-image`] },
  };
}

// Escape markup delimiters even when content comes from the managed service catalogue.
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export const businessStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization", "@id": BUSINESS_ID, name: "BOOM Cleaning Services",
      url: SITE_URL, logo: `${SITE_URL}/images/boom-logo-dark.png`,
      description: publicPages["/"].description,
      telephone: "+2349029799205", email: "boomcleaninfo@gmail.com",
      areaServed: { "@type": "City", name: "Abuja", containedInPlace: { "@type": "Country", name: "Nigeria" } },
      sameAs: ["https://www.instagram.com/boom_cleaning_services/"],
      contactPoint: { "@type": "ContactPoint", telephone: "+2349029799205", contactType: "customer service", availableLanguage: "English" },
    },
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "BOOM Cleaning Services", url: SITE_URL, inLanguage: "en-NG", publisher: { "@id": BUSINESS_ID } },
  ],
};
