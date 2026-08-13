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

export type BookingStatus = "Confirmed" | "In progress" | "Awaiting payment";

export interface ScheduleItem {
  id: string;
  time: string;
  customer: string;
  initials: string;
  service: string;
  address: string;
  team: string;
  status: BookingStatus;
}

export interface AttentionItem {
  id: string;
  kind: "Payment" | "Reply" | "Assignment";
  title: string;
  detail: string;
  action: string;
}

export interface Enquiry {
  id: string;
  customer: string;
  initials: string;
  service: string;
  source: string;
  received: string;
  value: string;
}

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

export const operationsSummary = {
  operator: "Amaka",
  date: "Thursday, 13 August",
  city: "Abuja, Nigeria",
  greeting: "Good morning, Amaka.",
  headline: "Here’s how BOOM is moving today.",
  lastUpdated: "Updated 8:42 AM",
};

export const kpis = [
  { label: "Today’s bookings", value: "8", note: "2 more than last Thursday", trend: "+33%", tone: "green" },
  { label: "Today’s revenue", value: "₦418k", note: "₦61k still to collect", trend: "+18%", tone: "amber" },
  { label: "New enquiries", value: "12", note: "5 need a reply today", trend: "+4", tone: "blue" },
  { label: "Jobs in progress", value: "3", note: "All crews checked in", trend: "On track", tone: "green" },
] as const;

export const weeklyRevenue = [
  { day: "Mon", value: 190, label: "₦190k" },
  { day: "Tue", value: 285, label: "₦285k" },
  { day: "Wed", value: 234, label: "₦234k" },
  { day: "Thu", value: 418, label: "₦418k" },
  { day: "Fri", value: 365, label: "₦365k" },
  { day: "Sat", value: 490, label: "₦490k" },
  { day: "Sun", value: 320, label: "₦320k" },
] as const;

export const todaySchedule: ScheduleItem[] = [
  { id: "BK-2084", time: "09:00", customer: "Nneka Okoye", initials: "NO", service: "Deep home cleaning", address: "Maitama, Abuja", team: "Team Ada", status: "In progress" },
  { id: "BK-2085", time: "10:30", customer: "Tunde Balogun", initials: "TB", service: "Office cleaning", address: "Wuse II, Abuja", team: "Team David", status: "Confirmed" },
  { id: "BK-2086", time: "12:00", customer: "Hauwa Bello", initials: "HB", service: "Move-in cleaning", address: "Jabi, Abuja", team: "Team Ada", status: "Confirmed" },
  { id: "BK-2087", time: "14:30", customer: "Chidi Nwosu", initials: "CN", service: "Sofa & upholstery", address: "Gwarinpa, Abuja", team: "Team David", status: "Awaiting payment" },
];

export const attentionItems: AttentionItem[] = [
  { id: "AT-1", kind: "Payment", title: "₦45,000 payment is pending", detail: "Chidi Nwosu · BK-2087", action: "Send reminder" },
  { id: "AT-2", kind: "Reply", title: "Three new leads need a reply", detail: "Oldest received 42 minutes ago", action: "Open leads" },
  { id: "AT-3", kind: "Assignment", title: "Assign a team for Saturday", detail: "Post-construction clean · Katampe", action: "Assign team" },
];

export const recentEnquiries: Enquiry[] = [
  { id: "LD-122", customer: "Zainab Ibrahim", initials: "ZI", service: "Post-construction cleaning", source: "Instagram", received: "12 min ago", value: "₦85k–₦120k" },
  { id: "LD-121", customer: "Emeka Obi", initials: "EO", service: "Recurring home cleaning", source: "WhatsApp", received: "28 min ago", value: "₦35k / visit" },
  { id: "LD-120", customer: "Thea Living", initials: "TL", service: "Office cleaning", source: "Website", received: "1 hr ago", value: "₦160k–₦210k" },
  { id: "LD-119", customer: "Aisha Sani", initials: "AS", service: "Deep home cleaning", source: "Instagram", received: "2 hrs ago", value: "₦55k–₦70k" },
];
