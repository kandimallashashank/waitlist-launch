import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 32, height: 32 };

export const contentType = "image/png";

/** Latin Poppins Bold (700) — TTF loads reliably in Satori / ImageResponse. */
const POPPINS_BOLD_TTF =
  "https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLCz7V1s.ttf";

/**
 * Tab icon (`/icon`, also served at `/favicon.ico` via rewrite). Monogram at 32×32
 * uses Poppins Bold to match the brand; full wordmark would be illegible.
 */
export default async function Icon() {
  const poppinsBold = await fetch(POPPINS_BOLD_TTF, {
    next: { revalidate: 60 * 60 * 24 * 30 },
  }).then((res) => {
    if (!res.ok) {
      throw new Error(`Failed to load Poppins: ${res.status}`);
    }
    return res.arrayBuffer();
  });

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
          color: "#FAF7F4",
          fontSize: 15,
          fontWeight: 700,
          fontFamily: "Poppins",
          letterSpacing: "-0.08em",
        }}
      >
        SR
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Poppins",
          data: poppinsBold,
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
}
