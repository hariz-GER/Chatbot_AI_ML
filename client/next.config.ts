import type { NextConfig } from "next";
import path from "path";

const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const repoName = 'Chatbot_AI_ML';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },

  ...(isGitHubPages
    ? {
      output: 'export' as const,
      basePath: `/${repoName}`,
      assetPrefix: `/${repoName}/`,
      trailingSlash: true,
    }
    : {
      // Enable standalone output for Docker deployment
      output: 'standalone' as const,
    }),

  // Optimize images
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
  },

  // Production optimizations
  compress: true,
  poweredByHeader: false,

  ...(isGitHubPages
    ? {}
    : {
      // Security headers
      async headers() {
        return [
          {
            source: '/:path*',
            headers: [
              {
                key: 'X-DNS-Prefetch-Control',
                value: 'on'
              },
              {
                key: 'X-Frame-Options',
                value: 'SAMEORIGIN'
              },
              {
                key: 'X-Content-Type-Options',
                value: 'nosniff'
              },
              {
                key: 'Referrer-Policy',
                value: 'strict-origin-when-cross-origin'
              }
            ],
          },
        ];
      },
    }),

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  },
};

export default nextConfig;
