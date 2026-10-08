export const adminRoutes = {
  Overview: "/admin", Inbox: "/admin/inbox", Bookings: "/admin/bookings",
  Customers: "/admin/customers", Payments: "/admin/payments", Analytics: "/admin/analytics",
  Services: "/admin/services", Integrations: "/admin/integrations",
} as const;
export type AdminArea = keyof typeof adminRoutes;
export const adminAreas = Object.keys(adminRoutes) as AdminArea[];
export function adminAreaForPath(path: string): AdminArea | null {
  return adminAreas.find(area => adminRoutes[area] === path.replace(/\/$/,"")) ?? null;
}
