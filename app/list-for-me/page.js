import Link from "next/link";
import ListForMeForm from "./ListForMeForm";

export const metadata = {
  title: "We'll list it for you",
  description: "Got things to sell but not sure about photos or prices? Tell us what you've got and we'll list it on Going Going Gone for you. Free, and local to Market Bosworth.",
};

const STEPS = [
  { t: "Tell us what you've got", d: "Fill in the short form below. A rough idea is fine: \"a dresser and some garden tools\" is plenty." },
  { t: "We'll be in touch", d: "We'll ring or email to arrange a good time, then pop round to take the photos and agree a starting price with you." },
  { t: "We list it and look after it", d: "Your items go up on Going Going Gone and we answer buyers' questions while the auction runs." },
  { t: "You hand it over", d: "When it sells, we put the buyer in touch with you to arrange payment and collection. The money is yours." },
];

export default function ListForMePage() {
  return (
    <div className="wrap narrow">
      <h1 className="page-title">We&apos;ll list it for you</h1>
      <p className="page-lead">
        Got things to sell but not sure about photos, prices or the internet? Clearing a loft, a garage or a loved one&apos;s home? Tell us what you&apos;ve got and we&apos;ll do the rest. It&apos;s free.
      </p>

      <ol className="help-steps">
        {STEPS.map((s, i) => (
          <li key={s.t}>
            <span className="help-step-n" aria-hidden="true">{i + 1}</span>
            <div><strong>{s.t}</strong><p>{s.d}</p></div>
          </li>
        ))}
      </ol>

      <h2 className="block-title" id="ask" style={{ marginTop: 34 }}>Ask for help</h2>
      <ListForMeForm />

      <p className="hint" style={{ marginTop: 16 }}>
        We only use your details to get in touch about this, and delete them once we&apos;re finished. See our <Link href="/privacy">privacy notice</Link>.
        Happy to do it yourself? <Link href="/sell">List something now</Link>, it takes about two minutes.
      </p>
    </div>
  );
}
