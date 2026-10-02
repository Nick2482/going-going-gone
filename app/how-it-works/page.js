import Link from "next/link";
export const metadata = { title: "How it works" };

export default function HowItWorks() {
  return (
    <div className="wrap prose">
      <h1 className="page-title">How it works</h1>

      <h2>Selling</h2>
      <p>Sign in with your email, tap <strong>Sell something</strong>, add photos and a description, and set a starting price and how long bidding runs (1 to 10 days). You can&apos;t bid on your own lot. If nobody has bid yet, you can withdraw the listing.</p>

      <h2>Bidding</h2>
      <p>Enter any amount at or above the minimum shown. Each bid must beat the current one by at least the bid step:</p>
      <ul>
        <li>Under £20: steps of 50p</li>
        <li>£20 to £99.99: steps of £1</li>
        <li>£100 to £499.99: steps of £5</li>
        <li>£500 to £999.99: steps of £10</li>
        <li>£1,000 to £4,999.99: steps of £25</li>
        <li>£5,000 and over: steps of £50</li>
      </ul>
      <p>A bid is a promise to buy if you win, so only bid what you&apos;re happy to pay.</p>

      <h2>Reserve prices</h2>
      <p>Sellers can set a <strong>reserve</strong>: the lowest price they&apos;ll accept. The amount is kept private. Bidders see <strong>Reserve not met</strong> until bidding reaches it, then <strong>Reserve met</strong>. If an auction ends below the reserve, the lot doesn&apos;t sell and nobody has to go through with it.</p>
      <p>Sellers can add a reserve when listing, or from the lot page before anyone bids. Once bidding has started, a reserve can only be lowered or removed.</p>

      <h2>Buy it now</h2>
      <p>Sellers can add a <strong>Buy it now</strong> price. Until someone places the first bid, anyone can buy the item outright at that price, which ends the auction straight away. Once bidding starts, Buy it now disappears and it&apos;s a normal auction.</p>

      <h2>Going once, going twice, gone</h2>
      <p>Lots show <strong>Going once</strong> in their final hour and <strong>Going twice</strong> in their final 10 minutes. Any bid in the last 2 minutes adds 2 minutes to the clock, so everyone gets a fair chance to respond.</p>

      <h2>After the hammer falls</h2>
      <p>The highest bidder wins, as long as any reserve has been met. The winner and the seller can then see each other&apos;s email on the lot page to arrange payment and collection. Going Going Gone doesn&apos;t handle payments.</p>

      <h2>Charity auctions</h2>
      <p>When listing, sellers can give 10%, 25%, 50% or all of the final price to one of the <Link href="/causes">local causes</Link> on our list. Those lots carry a charity badge. The seller pays the cause once they&apos;ve been paid, and the pledge can&apos;t be changed after listing.</p>

      <h2>Email alerts</h2>
      <p>We&apos;ll email you when you&apos;re outbid, when you win, when something you&apos;re selling gets its first bid, and when your auction ends. The winner and seller get each other&apos;s email address so they can arrange collection. You can switch alerts off in <strong>My account</strong>.</p>

      <h2 id="staying-safe">Staying safe</h2>
      <ul>
        <li>Meet somewhere public, or with someone else present.</li>
        <li>Check the item before you pay.</li>
        <li>Cash on collection is simplest. Never send a bank transfer to someone you haven&apos;t met for an item you haven&apos;t seen.</li>
        <li>Going Going Gone will never ask for your bank details or a password. Sign-in is always by an emailed link.</li>
        <li>Be wary of anyone who asks you to pay a deposit or delivery fee before you&apos;ve seen the item.</li>
        <li>If a listing looks wrong, tap <strong>Report this listing</strong>.</li>
      </ul>
    </div>
  );
}
