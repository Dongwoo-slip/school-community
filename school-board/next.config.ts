/** @type {import('next').NextConfig} */
const immutableAssetCache = "public, max-age=31536000, immutable";
const publicAssetCache = "public, max-age=604800, stale-while-revalidate=2592000";
const manifestCache = "public, max-age=3600, stale-while-revalidate=86400";

const nextConfig = {
  devIndicators: false,
  turbopack: {
    root: __dirname,
  },
  async headers() {
    const immutableAssets = [
      "/favicon.ico",
      "/favicon.svg",
      "/apple-touch-icon.png",
      "/icon-192.png",
      "/icon-512.png",
      "/cheongju-emblem-480.webp",
      "/imagebanner-1200.webp",
    ].map((source) => ({
      source,
      headers: [{ key: "Cache-Control", value: immutableAssetCache }],
    }));

    const publicAssets = [
      "/banner.jpg",
      "/cheongju-emblem.png",
      "/imagebanner.jpg",
      "/logo.png",
      "/logo-mark.png",
      "/logo-mark.svg",
      "/logo-wordmark.svg",
    ].map((source) => ({
      source,
      headers: [{ key: "Cache-Control", value: publicAssetCache }],
    }));

    return [
      ...immutableAssets,
      ...publicAssets,
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: manifestCache }],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
