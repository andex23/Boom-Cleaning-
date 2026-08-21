import type { ServiceIconName } from "@/data/service-presentation";

export function ServiceIcon({ icon }: { icon: ServiceIconName }) {
  const common = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.65, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (icon === "home") return <svg {...common}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" /><path d="M9 21v-6h6v6" /></svg>;
  if (icon === "move") return <svg {...common}><path d="M4 8h16v13H4z" /><path d="M8 8V5h8v3M8 13h.01M12 13h.01M16 13h.01" /></svg>;
  if (icon === "building") return <svg {...common}><path d="M4 21V4h12v17M16 9h4v12M8 8h4M8 12h4M8 16h4M2 21h20" /></svg>;
  if (icon === "window") return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M12 3v18M4 12h16" /></svg>;
  if (icon === "sofa") return <svg {...common}><path d="M5 18v2M19 18v2M4 18h16v-7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v5ZM7 10V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" /></svg>;
  if (icon === "pest") return <svg {...common}><path d="M12 8v13M8 12H4M8 16H4M16 12h4M16 16h4M8 8 5 5M16 8l3-3M9 5l3 3 3-3" /><ellipse cx="12" cy="13" rx="4" ry="5" /></svg>;
  if (icon === "event") return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>;
  return <svg {...common}><path d="m12 3 .95 5.05L18 9l-5.05.95L12 15l-.95-5.05L6 9l5.05-.95L12 3Z" /><path d="m19 15 .4 2.1L21.5 18l-2.1.4L19 20.5l-.4-2.1-2.1-.4 2.1-.9.4-2.1Z" /></svg>;
}
