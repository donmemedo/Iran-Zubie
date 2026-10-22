import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Same defaults as src/lib/api.ts, so the CSP allows exactly the origins the app calls.
const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010").replace(/\/$/, "");
const wsOrigin = (process.env.NEXT_PUBLIC_WS_URL || apiOrigin.replace(/^http/, "ws")).replace(/\/$/, "");

// ponytail: 'unsafe-inline' scripts are needed for the theme bootstrap and Next's inline
// bootstrap data. A nonce-based script-src is the upgrade path, at the cost of rendering
// every page dynamically.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
  `connect-src 'self' ${apiOrigin} ${wsOrigin}${isDev ? " ws://localhost:3010 ws://127.0.0.1:3010" : ""}`,
  "font-src 'self' data:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
