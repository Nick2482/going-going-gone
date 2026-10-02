/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;

const nextConfig = {
  poweredByHeader: false,
  // Stop other sites showing this one inside a frame (clickjacking), and keep
  // full page addresses private when people click links to other sites.
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Permissions-Policy", value: "microphone=(), geolocation=()" },
      ],
    }];
  },
  images: {
    // Lets the site make small copies of lot photos (used for WhatsApp and Facebook link previews).
    remotePatterns: supabaseUrl
      ? [{ protocol: "https", hostname: supabaseUrl.hostname, pathname: "/storage/v1/object/public/lot-photos/**" }]
      : [],
    contentDispositionType: "inline",
  },
};

export default nextConfig;
