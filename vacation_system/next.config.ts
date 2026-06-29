import type { NextConfig } from "next";

const allowedOrigins = (process.env.ALLOWED_FRAME_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .join(" ");

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["nodemailer"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${allowedOrigins}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
