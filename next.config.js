/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: { unoptimized: true },
  serverExternalPackages: ['pdf-parse', 'mammoth', 'pdfjs-dist'],
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'pdfjs-dist'],
  },
};

module.exports = nextConfig;
