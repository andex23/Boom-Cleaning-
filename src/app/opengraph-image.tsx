import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "BOOM Cleaning Services — professional home and office cleaning in Abuja";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function OpenGraphImage() {
  const logo = await readFile(path.join(process.cwd(), "public/images/boom-logo.png"));
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", background: "#08255f", color: "white", display: "flex", flexDirection: "column", padding: "65px 80px", justifyContent: "space-between" }}>
      <img src={`data:image/png;base64,${logo.toString("base64")}`} alt="BOOM" width={210} height={125} style={{ objectFit: "contain", objectPosition: "left" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 64, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}><span>A cleaner space.</span><span>A better day.</span></div>
        <div style={{ fontSize: 28, color: "#b5eaf5" }}>Professional home &amp; office cleaning in Abuja</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 23, borderTop: "1px solid #4a648c", paddingTop: 25 }}><span>boomcleaning.site</span><span style={{ color: "#55d5f3" }}>Clear prices. Book online.</span></div>
    </div>, size,
  );
}
