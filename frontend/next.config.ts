import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/:path*` : 'http://127.0.0.1:5005/api/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/socket.io/:path*` : 'http://127.0.0.1:5005/socket.io/:path*',
      },
    ];
  },
};

export default nextConfig;
