/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;

const nextConfig = {
  poweredByHeader: false,
  images: {
    // Lets the site make small copies of lot photos (used for WhatsApp and Facebook link previews).
    remotePatterns: supabaseUrl
      ? [{ protocol: "https", hostname: supabaseUrl.hostname, pathname: "/storage/v1/object/public/lot-photos/**" }]
      : [],
    contentDispositionType: "inline",
  },
};

export default nextConfig;
