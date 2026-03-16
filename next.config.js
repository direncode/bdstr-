/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bandidoscafe.com",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
};
module.exports = nextConfig;
