/**
 * Console navigation only. Every figure the console shows — KPIs, revenue, schedule,
 * attention queue and enquiries — is loaded from the database via
 * `src/features/operations/overview.ts`. Nothing here describes the business.
 */
export type AdminArea =
  | "Overview"
  | "Bookings"
  | "Leads"
  | "Customers"
  | "Jobs"
  | "Services"
  | "Payments"
  | "Messages"
  | "Reports";

export const adminAreas: AdminArea[] = [
  "Overview",
  "Bookings",
  "Leads",
  "Customers",
  "Jobs",
  "Services",
  "Payments",
  "Messages",
  "Reports",
];
