import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*` // Proxy to Backend
      }
    ];
  }
};

export default nextConfig;
