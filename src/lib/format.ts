const nairaFormatter = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export const formatNaira = (amount: number) => nairaFormatter.format(amount);

/** Signed amounts read better on a quote breakdown than a bare negative sign. */
export const formatNairaDelta = (amount: number) => `${amount < 0 ? "−" : "+"}${nairaFormatter.format(Math.abs(amount))}`;

/** Renders a 24-hour slot time as local 12-hour text, without a hardcoded lookup table. */
export function formatSlotTime(time: string) {
  if (!/^\d{2}:\d{2}$/.test(time)) return time || "Not selected";
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours < 12 ? "AM" : "PM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}
