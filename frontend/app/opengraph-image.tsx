import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt =
  "ScentRev — perfume samples and fragrance discovery waitlist for India";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Default link-preview image for the waitlist app (WhatsApp, iMessage, X, LinkedIn, etc.).
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(165deg, #faf7f4 0%, #ede6df 55%, #f5ebe3 100%)",
          padding: 56,
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", width: "100%", height: 6, gap: 0 }}>
          <div style={{ flex: 1, background: "#B85A3A" }} />
          <div style={{ flex: 1, background: "#D4A574" }} />
          <div style={{ flex: 1, background: "#8B9E7E" }} />
        </div>
        <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                background: "#1A1A1A",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              SR
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#1A1A1A",
                  letterSpacing: "-0.02em",
                }}
              >
                ScentRev
              </span>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#B85A3A", marginTop: 4 }}>
                India waitlist
              </span>
            </div>
          </div>
          <p
            style={{
              marginTop: 36,
              fontSize: 28,
              lineHeight: 1.35,
              color: "#4a3f38",
              maxWidth: 900,
              fontWeight: 500,
            }}
          >
            Authentic micro-samples, full bottles, and a launch discount — try scents that suit
            Indian weather before you buy.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 20,
            color: "#6b6560",
          }}
        >
          <span style={{ fontWeight: 600, color: "#1A1A1A" }}>scentrev.com</span>
          <span>Join the waitlist</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
