export const metadata = { title: "Terms of use" };

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@example.com";

export default function Terms() {
  return (
    <div className="wrap prose">
      <h1 className="page-title">Terms of use</h1>
            <p className="hint">Last updated: 29 September 2026</p>

      <h2>1. About Going Going Gone</h2>
            <p>Going Going Gone is a local listings site, run from Market Bosworth, Leicestershire, where people sell items to each other by auction. We are not a party to any sale. The contract for each sale is between the seller and the winning bidder. You can contact Customer Service at <span className="mono">{CONTACT}</span>.</p>

      <h2>2. Your account</h2>
      <p>You must be 18 or over to use the site. Keep access to your email secure, because it is how you sign in. You are responsible for everything done from your account.</p>

      <h2>3. Selling</h2>
      <ul>
        <li>Only list items you own and have the right to sell.</li>
        <li>Describe items honestly, including faults, and use your own photos.</li>
        <li>If your auction ends with a bid, you agree to sell to the highest bidder at that price.</li>
        <li>If you sell regularly to make a profit, you may be a trader under consumer law, and buyers will have extra rights. You are responsible for any tax on your sales.</li>
      </ul>

      <h2>4. Bidding</h2>
      <ul>
        <li>A bid is a commitment to buy if you win.</li>
        <li>Bids can&apos;t be withdrawn. If you made a genuine mistake, contact us straight away.</li>
        <li>Don&apos;t bid on your own items or ask others to push prices up.</li>
      </ul>

      <h2 id="not-allowed">5. Items that aren&apos;t allowed</h2>
      <ul>
        <li>Weapons, including knives, replica firearms and ammunition</li>
        <li>Drugs, medicines, alcohol and tobacco or vaping products</li>
        <li>Stolen, counterfeit or fake-branded goods</li>
        <li>Live animals</li>
        <li>Adult content</li>
        <li>Recalled or unsafe products, and electrical items that aren&apos;t safe to use</li>
        <li>Personal data, accounts, tickets sold above face value, and anything else that&apos;s illegal to sell in the UK</li>
      </ul>

      <h2>6. Our role</h2>
      <p>We don&apos;t inspect items or handle payments, and we can&apos;t guarantee that a buyer will pay or a seller will hand over an item. We may remove listings or accounts that break these terms or that we reasonably think are harmful or fraudulent.</p>

      <h2>7. Reporting problems</h2>
      <p>Use <strong>Report this listing</strong> on any lot, or email <span className="mono">{CONTACT}</span>.</p>

      <h2>8. Changes</h2>
      <p>We may update these terms. We&apos;ll post the new version here, and continuing to use the site means you accept it.</p>
    </div>
  );
}
