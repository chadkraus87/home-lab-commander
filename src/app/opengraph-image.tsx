import { ImageResponse } from "next/og";

export const alt =
  "HomeLab Commander — your infrastructure, one command center";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "76px 84px",
        color: "#f5f8fb",
        background:
          "linear-gradient(135deg, #071019 0%, #0c1824 58%, #102c40 100%)",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            width: 64,
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 16,
            background: "#2386e8",
            fontSize: 34,
          }}
        >
          HLC
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 26,
            letterSpacing: 2,
          }}
        >
          <strong>HOMELAB</strong>
          <span style={{ color: "#79baff" }}>COMMANDER</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 70,
            lineHeight: 1.02,
            fontWeight: 800,
            maxWidth: 920,
          }}
        >
          <span>Your infrastructure.</span>
          <span>One command center.</span>
        </div>
        <div style={{ fontSize: 25, color: "#a8bdcc" }}>
          Local-first monitoring · safe discovery · incident workflows ·
          interactive hosted demo
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, fontSize: 18, color: "#8fd9b3" }}>
        <span>●</span>
        <span>Defensive by design</span>
        <span style={{ color: "#72899a" }}>·</span>
        <span style={{ color: "#79baff" }}>Open source</span>
      </div>
    </div>,
    size,
  );
}
