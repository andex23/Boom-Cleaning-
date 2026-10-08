export const adminAreas = ["Overview", "Inbox", "Bookings", "Customers", "Payments", "Analytics", "Services", "Integrations"] as const;
export type AdminArea = (typeof adminAreas)[number];
