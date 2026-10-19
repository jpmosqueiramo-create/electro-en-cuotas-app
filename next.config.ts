import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: '/completar-datos/:path*', headers: [
      {key:'Cache-Control',value:'no-store'}, {key:'Referrer-Policy',value:'no-referrer'},
      {key:'X-Content-Type-Options',value:'nosniff'}, {key:'X-Robots-Tag',value:'noindex, nofollow, noarchive'},
    ] }];
  },
  images: {
    unoptimized: true
  }
};

export default nextConfig;
