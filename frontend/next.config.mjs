/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Allow any remote hostname (pilot: CDN URLs vary) but keep optimization ON
    // so Next.js serves WebP/AVIF and resizes for the LCP image.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    // Serve modern formats — biggest LCP win
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    serverComponentsExternalPackages: [
      "@xenova/transformers",
      "onnxruntime-node",
      "sharp",
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push(
        "@xenova/transformers",
        "onnxruntime-node",
      );
    }
    return config;
  },
};

export default nextConfig;
