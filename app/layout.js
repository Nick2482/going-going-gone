import Link from "next/link";
import { Big_Shoulders, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import { createClient, getUserId } from "@/lib/supabase/server";
import { BrandMark, BrandWord } from "@/components/Logo";
import { SearchIcon } from "@/components/Icons";
import { GROUP_URL } from "@/lib/site";
import "./globals.css";

// Variable font: the "opsz" axis gives the tall display cut automatically at headline sizes.
const display = Big_Shoulders({ subsets: ["latin"], axes: ["opsz"], variable: "--font-display" });
const body = Public_Sans({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-mono" });

export const metadata = {
  title: { default: "Going Going Gone · Local auctions in Market Bosworth", template: "%s · Going Going Gone" },
  description: "Local online auctions for Market Bosworth and the villages around. Free to list, free to bid, collect locally.",
};

export const viewport = { themeColor: "#09212c" };

export default async function RootLayout({ children }) {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  const isAdmin = userId ? (await supabase.rpc("is_admin")).data === true : false;

  return (
    <html lang="en-GB" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <header className="site-head">
          <div className="wrap">
            <Link href="/" className="brand" aria-label="Going Going Gone, home">
              <BrandMark />
              <BrandWord />
            </Link>
            <form className="head-search" action="/" method="get" role="search">
              <SearchIcon />
              <label htmlFor="site-q" className="visually-hidden">Search lots</label>
              <input id="site-q" name="q" placeholder="Search lots" autoComplete="off" />
            </form>
            <nav className="nav" aria-label="Main">
              <Link href="/how-it-works" className="nav-link nav-hide-sm">How it works</Link>
              <a href={GROUP_URL} target="_blank" rel="noopener noreferrer" className="nav-link nav-hide-sm">Facebook group</a>
              {isAdmin ? <Link href="/admin" className="nav-link">Admin</Link> : null}
              {userId
                ? <Link href="/account" className="nav-link">My account</Link>
                : <Link href="/login" className="nav-link">Sign in</Link>}
              <Link href="/sell" className="btn btn-brass">Sell</Link>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="site-foot">
          <div className="wrap">
            <div className="foot-brand">
              <Link href="/" className="brand" aria-label="Going Going Gone, home">
                <BrandMark />
                <BrandWord />
              </Link>
              <p>Local auctions for Market Bosworth and the villages around. Free to list, free to bid, and everything&apos;s collected close to home.</p>
            </div>
            <div>
              <h3>Use the site</h3>
              <ul>
                <li><Link href="/">Browse lots</Link></li>
                <li><Link href="/sell">Sell something</Link></li>
                <li><Link href="/sold">Sold prices</Link></li>
                <li><a href={GROUP_URL} target="_blank" rel="noopener noreferrer">Join our Facebook group</a></li>
                <li><Link href={userId ? "/account" : "/login"}>{userId ? "My account" : "Sign in"}</Link></li>
              </ul>
            </div>
            <div>
              <h3>Help</h3>
              <ul>
                <li><Link href="/about">About us</Link></li>
                <li><Link href="/causes">Local causes</Link></li>
                <li><Link href="/how-it-works">How it works</Link></li>
                <li><Link href="/terms">Terms of use</Link></li>
                <li><Link href="/privacy">Privacy notice</Link></li>
              </ul>
            </div>
          </div>
          <div className="foot-base">
            <div className="wrap">© {new Date().getFullYear()} Going Going Gone · Run by Nick Hutton, Market Bosworth, Leicestershire</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
