export type ServiceIconName = "sparkle" | "home" | "move" | "building" | "window" | "sofa" | "pest" | "event";

export type ServicePresentation = {
  /** Short headline copy for the home page card. */
  tagline: string;
  /** Home page card artwork. */
  image: string;
  summary: string;
  duration: string;
  category: "home" | "business" | "specialist";
  icon: ServiceIconName;
};

/**
 * Marketing copy only, keyed by the service slug in the database. Names, prices, durations
 * and whether a service can be quoted instantly all come from `services` — nothing here
 * affects what a customer is charged.
 */
export const servicePresentation: Record<string, ServicePresentation> = {
  "deep-cleaning": { tagline: "Homes reset with considered room-by-room care.", image: "/images/services/post-construction.webp", summary: "A complete reset for homes that need considered attention.", duration: "4–7 hours", category: "home", icon: "sparkle" },
  "move-in-apartment-cleaning": { tagline: "A fresh, ready space before the first box arrives.", image: "/images/services/move-in.webp", summary: "Leave a place beautifully ready for its next chapter.", duration: "4–8 hours", category: "home", icon: "move" },
  "post-renovation-cleaning": { tagline: "Fine dust and finishing work handled properly.", image: "/images/services/move-in.webp", summary: "A considered reset after improvements, installation and finishing work.", duration: "Custom", category: "specialist", icon: "home" },
  "post-construction-cleaning": { tagline: "Fine dust, debris and finishing work handled properly.", image: "/images/services/deep-cleaning.webp", summary: "Fine-detail cleanup that brings a finished space into focus.", duration: "Custom", category: "specialist", icon: "sparkle" },
  "deep-cleaning-upholstery": { tagline: "A full home reset, with the sofas and mattresses done too.", image: "/images/services/upholstery.webp", summary: "Deep cleaning throughout, plus specialist care for your soft furnishings.", duration: "5–8 hours", category: "home", icon: "sofa" },
  "deep-cleaning-fumigation": { tagline: "A full home reset, finished with a pest treatment.", image: "/images/services/fumigation.webp", summary: "Deep cleaning throughout, followed by a practical fumigation.", duration: "5–8 hours", category: "home", icon: "pest" },
  "deep-cleaning-upholstery-fumigation": { tagline: "Everything: the deep clean, the upholstery and the fumigation.", image: "/images/services/deep-cleaning.webp", summary: "Our most complete package — deep cleaning, soft furnishings and pest treatment in one visit.", duration: "6–9 hours", category: "home", icon: "sparkle" },
  "office-cleaning": { tagline: "Flexible care for productive Abuja workspaces.", image: "/images/services/office-cleaning.webp", summary: "Calm, consistent workplace cleaning outside your busy hours.", duration: "Custom", category: "business", icon: "building" },
  "upholstery-cleaning": { tagline: "Sofas, mattresses and soft furnishings revived.", image: "/images/services/upholstery.webp", summary: "Refresh sofas, chairs and soft furnishings with specialist care.", duration: "2–4 hours", category: "specialist", icon: "sofa" },
  "laundry": { tagline: "Garments and linen collected, cared for and returned.", image: "/images/services/deep-cleaning.webp", summary: "Collection-ready care for garments, bedding and household linen.", duration: "By load", category: "home", icon: "window" },
  "fumigation": { tagline: "Practical pest control for homes and businesses.", image: "/images/services/fumigation.webp", summary: "Discreet, practical pest treatment for a more comfortable space.", duration: "Custom", category: "specialist", icon: "pest" },
};

export const fallbackPresentation: ServicePresentation = { tagline: "A considered clean for your space.", image: "/images/services/deep-cleaning.webp", summary: "A BOOM cleaning service.", duration: "Custom", category: "home", icon: "sparkle" };
