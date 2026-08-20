import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local builds stay compatible with `next start`; container builds opt in to
  // the minimal standalone server copied by the Docker runner stage.
  ...(process.env.HOMELAB_STANDALONE === "1"
    ? ({ output: "standalone" } as const)
    : {}),
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/*": ["./migrations/**/*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
