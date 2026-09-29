export const metadata = { title: "Privacy notice" };

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@example.com";

export default function Privacy() {
  return (
    <div className="wrap prose">
      <h1 className="page-title">Privacy notice</h1>
            <p className="hint">Last updated: 29 September 2026</p><h2>Who we are</h2><p>Going Going Gone is run from Market Bosworth, Leicestershire. We are responsible for the personal data described here. For anything to do with your data, contact Customer Service at <span className="mono">{CONTACT}</span>.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Email address</strong>, to sign you in. It is shown only to the other person in a completed sale.</li>
        <li><strong>Display name and area</strong>, which other people see on your listings and bids.</li>
        <li><strong>Your listings, photos and bids</strong>, which are public.</li>
        <li><strong>Reports</strong> you send about listings.</li>
        <li>A sign-in cookie that keeps you logged in. We don&apos;t use advertising or tracking cookies.</li>
      </ul>

      <h2>Why we use it</h2>
      <p>To run the site: signing you in, showing listings and bids, putting winners and sellers in touch, and keeping the site safe. Our lawful basis is performing our agreement with you (the terms of use) and our legitimate interest in preventing fraud.</p>

      <h2>Who processes it</h2>
            <p>We use trusted providers to run the site: Supabase (database, sign-in and photo storage), Vercel (website hosting) and Resend (sign-in emails). They only process your data to provide these services to us.</p>

      <h2>How long we keep it</h2>
      <p>While your account is open. Completed sales and bid records may be kept for up to 2 years to help resolve disputes.</p>

      <h2>Your rights</h2>
      <p>You can ask to see, correct or delete your data, or object to how we use it. Email <span className="mono">{CONTACT}</span>. You can also complain to the Information Commissioner&apos;s Office (ico.org.uk).</p>
    </div>
  );
}
