/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    /* The qualities the site actually asks for. Next 16 requires them to be
       declared; without this every image logs a warning. */
    qualities: [75, 80, 85, 88],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920, 2560, 3840],
    imageSizes: [96, 160, 240, 320, 420, 560],
    remotePatterns: [
      // parish photography can also be served from a CDN / media host
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.stocksnap.io' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
  /**
   * Photographs are referred to as /uploads/whatever.jpg wherever they are
   * actually kept. On a machine with its own disk that is a real folder. On a
   * host without one they live in the bucket, and this quietly fetches them
   * from there — so seventeen content files never have to learn which.
   */
  async rewrites() {
    const bucket = process.env.SUPABASE_URL?.trim().replace(/\/$/, '')
    const onDisk = process.env.STORAGE?.trim().toLowerCase() === 'disk'
    if (!bucket || onDisk) return []
    return [
      {
        source: '/uploads/:file*',
        destination: `${bucket}/storage/v1/object/public/uploads/:file*`,
      },
    ]
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/images/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
}

export default nextConfig
