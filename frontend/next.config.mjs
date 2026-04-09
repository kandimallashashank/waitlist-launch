/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pilot site: fragrance CDN URLs vary; avoid per-host allowlist churn.
  images: { unoptimized: true },
  experimental: {
    // Next 14: keep native ONNX / sharp deps out of the server bundle (quiz embeddings).
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
