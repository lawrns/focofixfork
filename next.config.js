/** @type {import('next').NextConfig} */
const nextConfig = {
  // Environment variables - ensure they're available at build time
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://czijxfbkihrauyjwcgfn.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6aWp4ZmJraWhyYXV5andjZ2ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNzU5ODMsImV4cCI6MjA2Nzc1MTk4M30.0MYAeaLn3L1LYiGNrsWPIvuZUVq-z7MUvaigybzCnQ0',
  },

  // Image optimization for mobile
  images: {
    unoptimized: false, // Enable optimization for better mobile performance
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  // Experimental features for better mobile performance
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Bundle analyzer (conditionally)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      if (process.env.NODE_ENV === 'production') {
        // Enable bundle analyzer for production builds
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: './analyze/client.html',
            openAnalyzer: false,
          })
        )
      }
      return config
    },
  }),

  // Headers for security, performance, and mobile optimization
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Mobile performance headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      },
      // Specific optimizations for static assets
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      // Optimize images for mobile
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=600'
          }
        ]
      }
    ]
  },

  // Optimize for mobile by reducing bundle size
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/{{member}}',
    },
    '@radix-ui/react-icons': {
      transform: '{{member}}',
    },
  },

  // Compression and optimization
  compress: true,

  // Enable SWC minification for better performance
  swcMinify: true,
}

module.exports = nextConfig
