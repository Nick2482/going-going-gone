import Link from "next/link";
import { OWNER, CONTACT, ICO_REG } from "@/lib/site";

export const metadata = { title: "Privacy notice" };

export default function Privacy() {
  return (
    <div className="wrap prose">
      <h1 className="page-title">Privacy notice</h1>
      <p className="hint">Last updated: 2 October 2026</p>

      <h2>Who we are</h2>
      <p>Going Going Gone is run by {OWNER} from Market Bosworth, Leicestershire, who is responsible for (the &ldquo;controller&rdquo; of) the personal data described here.{ICO_REG ? <> Registered with the Information Commission, number <span className="mono">{ICO_REG}</span>.</> : null} For anything to do with your data, email <span className="mono">{CONTACT}</span>. More about who runs the site is on the <Link href="/about">About</Link> page.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Email address</strong>, to sign you in. It is shown only to the other person in a completed sale.</li>
        <li><strong>Display name and area</strong>, which other people see on your listings and bids.</li>
        <li><strong>Your listings, photos and bids</strong>, which are public.</li>
        <li><strong>Reports</strong> you send about listings.</li>
        <li>A sign-in cookie that keeps you logged in. We don&apos;t use advertising or tracking cookies, except on the <Link href="/flights">Cheap flights</Link> page, and only if you agree there: our flights partner Travelpayouts may then set cookies so that bookings are credited to us (the commission goes to local causes).</li>
        <li>A small note in your browser remembering if you tapped &ldquo;Not now&rdquo; on the &ldquo;Add to your phone&rdquo; banner, so we don&apos;t keep asking. It never leaves your device.</li>
        <li>We never ask for or store passwords, or card or bank details.</li>
      </ul>

      <h2>Why we use it</h2>
      <p>To run the site: signing you in, showing listings and bids, putting winners and sellers in touch, and keeping the site safe. Our lawful basis is performing our agreement with you (the terms of use) and our legitimate interest in preventing fraud.</p>

      <h2>Who else handles it</h2>
      <p>We use trusted providers to run the site: Supabase (database, sign-in and photo storage), Vercel (website hosting) and Resend (sign-in and alert emails). They only process your data to provide these services to us.</p>

      <h2>How long we keep it</h2>
      <p>While your account is open. You can delete your account at any time from <Link href="/account">My account</Link>. That deletes your sign-in, name, listings, photos and bids straight away. Everything is stored encrypted.</p>

      <h2>Your rights</h2>
      <p>You can ask to see, correct or delete your data, or object to how we use it. Email <span className="mono">{CONTACT}</span>. You can also complain to the Information Commission, the UK data protection regulator (ico.org.uk).</p>
    </div>
  );
}
