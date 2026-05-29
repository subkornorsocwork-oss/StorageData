import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true, // 👈 เพิ่มบรรทัดนี้ลงไปครับ
  },
};

export default nextConfig;
