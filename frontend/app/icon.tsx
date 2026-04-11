import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 32, height: 32 };

export const contentType = "image/png";

/**
 * Tab / bookmark icon. Latin “S” renders reliably in ImageResponse (unlike many Unicode symbols).
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#B85A3A",
          color: "#FFFFFF",
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        S
      </div>
    ),
    { ...size },
  );
}
