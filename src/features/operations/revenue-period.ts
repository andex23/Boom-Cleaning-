export type RevenueUnit = "week" | "month";
export type RevenuePeriod = { unit: RevenueUnit; start: string; end: string; label: string };
const iso = (date: Date) => date.toISOString().slice(0,10);
export function lagosToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
}
export function revenuePeriod(unit: RevenueUnit, value: string): RevenuePeriod {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Choose a valid date.");
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || iso(date) !== value || date.getUTCFullYear()<2000 || date.getUTCFullYear()>2100) throw new Error("Choose a valid date.");
  const start = new Date(date);
  if (unit === "week") start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7));
  else start.setUTCDate(1);
  const end = new Date(start);
  if (unit === "week") end.setUTCDate(end.getUTCDate()+7);
  else end.setUTCMonth(end.getUTCMonth()+1);
  const last = new Date(end);last.setUTCDate(last.getUTCDate()-1);
  const fmt = (d:Date) => d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
  return {unit,start:iso(start),end:iso(end),label:unit === "month" ? start.toLocaleDateString("en-GB",{month:"long",year:"numeric",timeZone:"UTC"}) : `${fmt(start)} – ${fmt(last)}`};
}
export function shiftRevenuePeriod(period: RevenuePeriod, direction: number) {
  const date = new Date(`${period.start}T00:00:00Z`);
  if (period.unit === "week") date.setUTCDate(date.getUTCDate()+7*direction);
  else date.setUTCMonth(date.getUTCMonth()+direction);
  return iso(date);
}
export type RevenueSummary = {total:number;count:number;daily:{date:string;value:number;count:number}[]};
