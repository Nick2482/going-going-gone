import Link from "next/link";
import { Big_Shoulders_Display, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import { createClient, getUserId } from "@/lib/supabase/server";
import "./globals.css";

const display = Big_Shoulders_Display({ subsets: ["latin"], weight: ["700", "800", "900"], variable: "--font-display" });
const body = Public_Sans({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-mono" });

export const metadata = {
  title: { default: "Going Going Gone", template: "%s · Going Going Gone" },
  description: "Local online auctions. List what you're selling, bid on what you want.",
};

export default async function RootLayout({ children }) {
  const supabase = await createClient();
  const userId = await getUserId(supabase);

  return (
    <html lang="en-GB" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <header className="site-head">
          <div className="wrap">
            <Link href="/" className="logo" aria-label="Going Going Gone, home">
              <span>Going</span><span>Going</span><span>Gone</span>
            </Link>
            <nav className="nav">
              <Link href="/sell" className="btn btn-primary">+ Sell something</Link>
              {userId ? <Link href="/account">My account</Link> : <Link href="/login">Sign in</Link>}
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-foot">
          <div className="wrap">
            <span>Going Going Gone. Local auctions, run by locals.</span>
            <nav>
              <Link href="/how-it-works">How it works</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
