export type PublicService = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  duration: string;
  priceFrom: number | null;
  category: "home" | "business" | "specialist";
  estimateMode: "instant" | "review";
  icon: "sparkle" | "home" | "move" | "building" | "window" | "sofa" | "pest" | "event";
};

export const publicServices: PublicService[] = [
  { id: "srv-deep", slug: "deep-cleaning", name: "Deep cleaning", summary: "A complete reset for homes that need considered attention.", duration: "4–7 hours", priceFrom: 45000, category: "home", estimateMode: "instant", icon: "sparkle" },
  { id: "srv-renovation", slug: "post-renovation-cleaning", name: "Post-renovation cleaning", summary: "A considered reset after improvements, installation and finishing work.", duration: "Custom", priceFrom: null, category: "specialist", estimateMode: "review", icon: "home" },
  { id: "srv-move", slug: "move-in-move-out", name: "Move-in / move-out", summary: "Leave a place beautifully ready for its next chapter.", duration: "4–8 hours", priceFrom: 50000, category: "home", estimateMode: "instant", icon: "move" },
  { id: "srv-office", slug: "office-cleaning", name: "Office care", summary: "Calm, consistent workplace cleaning outside your busy hours.", duration: "Custom", priceFrom: null, category: "business", estimateMode: "review", icon: "building" },
  { id: "srv-post", slug: "post-construction", name: "Post-construction", summary: "Fine-detail cleanup that brings a finished space into focus.", duration: "Custom", priceFrom: null, category: "specialist", estimateMode: "review", icon: "sparkle" },
  { id: "srv-laundry", slug: "laundry", name: "Laundry", summary: "Collection-ready care for garments, bedding and household linen.", duration: "By load", priceFrom: 15000, category: "home", estimateMode: "instant", icon: "window" },
  { id: "srv-upholstery", slug: "upholstery-care", name: "Upholstery care", summary: "Refresh sofas, chairs and soft furnishings with specialist care.", duration: "2–4 hours", priceFrom: 25000, category: "specialist", estimateMode: "instant", icon: "sofa" },
  { id: "srv-fumigation", slug: "fumigation", name: "Fumigation", summary: "Discreet, practical pest treatment for a more comfortable space.", duration: "Custom", priceFrom: null, category: "specialist", estimateMode: "review", icon: "pest" },
];

export const serviceBySlug = (slug?: string) => publicServices.find((service) => service.slug === slug);

export const formatNaira = (amount: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);

export function calculateDemoEstimate({ serviceSlug, bedrooms, propertyType, location }: { serviceSlug: string; bedrooms: number; propertyType: string; location: string }) {
  const service = serviceBySlug(serviceSlug);
  if (!service || service.estimateMode === "review" || !service.priceFrom) return null;
  const bedroomRate = service.slug === "laundry" || service.slug === "upholstery-care" ? 2500 : 7500;
  const propertyAdjustment = propertyType === "duplex" || propertyType === "detached" ? 12500 : propertyType === "apartment" ? 3000 : 0;
  const locationAdjustment = location === "central" ? 5000 : location === "outer" ? 10000 : 0;
  const amount = service.priceFrom + Math.max(0, bedrooms - 1) * bedroomRate + propertyAdjustment + locationAdjustment;
  return { amount, deposit: Math.ceil(amount * 0.3 / 500) * 500 };
}
