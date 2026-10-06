import Link from "next/link";
import { OWNER, CONTACT, GROUP_NAME, GROUP_URL, GROUP_MEMBERS, ICO_REG, ICO_URL } from "@/lib/site";

export const metadata = {
  title: "About",
  description: `Going Going Gone is run by ${OWNER} from Market Bosworth, who also runs the ${GROUP_NAME} group on Facebook.`,
};

export default function About() {
  return (
    <div className="wrap prose">
      <h1 className="page-title">About</h1>

      <div className="about-intro">
        <div className="about-badge" aria-hidden="true">{OWNER.split(" ").map((w) => w[0]).join("")}</div>
        <div>
          <p className="about-lead">Hello, I&apos;m {OWNER.split(" ")[0]}.</p>
          <p>I live in Market Bosworth and I run <a href={GROUP_URL} target="_blank" rel="noopener noreferrer">{GROUP_NAME}</a>, the local buying and selling group on Facebook, with around {GROUP_MEMBERS} members.</p>
        </div>
      </div>

      <h2>Why I built Going Going Gone</h2>
      <p>The group shows how much people round here like buying and selling locally. Going Going Gone adds proper auctions: everyone can see the bids, the best offer wins, and the seller doesn&apos;t have to juggle messages. It&apos;s free to list and free to bid, and everything is collected close to home.</p>

      <h2>How it works, honestly</h2>
      <ul>
        <li><strong>It never handles money.</strong> The site never asks for or stores card or bank details. Buyer and seller arrange payment between themselves, usually cash on collection.</li>
        <li><strong>It holds very little about you:</strong> your email address (to sign in, so there&apos;s no password to steal), the name you choose to show, and your area if you add it.</li>
        <li><strong>Your email stays private.</strong> It&apos;s only shown to the other person once an item has sold, so you can arrange collection.</li>
        <li><strong>It&apos;s on secure, established hosting.</strong> The data is held with Supabase and the site is hosted by Vercel. Everything is encrypted, both in storage and on its way to you.</li>
        <li><strong>The law applies here too.</strong> I&apos;m responsible for your data under UK data protection law, just as a big company would be.{ICO_REG ? <> Registered with the Information Commissioner&apos;s Office (ICO), registration number <a className="mono" href={ICO_URL} target="_blank" rel="noopener noreferrer">{ICO_REG}</a>: you can check it on the ICO&apos;s public register.</> : null}</li>
        <li><strong>You&apos;re in control.</strong> You can delete your account, and everything linked to it, at any time from <Link href="/account">My account</Link>.</li>
      </ul>

      <h2>Staying safe</h2>
      <p>The same common sense as any local selling applies. See <Link href="/how-it-works#staying-safe">our safety tips</Link>.</p>

      <h2>Get in touch</h2>
      <p>Email me at <span className="mono">{CONTACT}</span>, or message me through <a href={GROUP_URL} target="_blank" rel="noopener noreferrer">{GROUP_NAME}</a> on Facebook. You can read the <Link href="/privacy">privacy notice</Link> and <Link href="/terms">terms of use</Link> too.</p>
    </div>
  );
}
