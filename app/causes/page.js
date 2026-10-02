import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LOT_CARD_FIELDS, gbp } from "@/lib/format";
import LotCard from "@/components/LotCard";
import { HeartIcon } from "@/components/Icons";

export const metadata = {
  title: "Local causes",
  description: "Charity auctions on Going Going Gone: how much local people have raised for local causes.",
};

export default async function CausesPage() {
  const supabase = await createClient();
  const [{ data: causes }, { data: lots }] = await Promise.all([
    supabase.rpc("charity_totals"),
    supabase.from("lots").select(LOT_CARD_FIELDS).eq("status", "live").gt("ends_at", new Date().toISOString())
      .not("charity_id", "is", null).order("ends_at", { ascending: true }).limit(24),
  ]);
  const list = (causes ?? []).filter((c) => c.active || Number(c.raised_pence) > 0);
  const total = list.reduce((t, c) => t + Number(c.raised_pence || 0), 0);

  return (
    <div className="wrap" style={{ paddingBlock: 32 }}>
      <h1 className="page-title">Local causes</h1>
      <p className="page-lead">
        Sellers can give some or all of the final price of a lot to a local cause. Look for the <span className="pill charity-pill"><HeartIcon size={11} /> charity</span> badge,
        and every bid helps the village.
      </p>

      <div className="causes-total">
        <HeartIcon size={30} />
        <div>
          <div className="causes-total-n num">{gbp(total)}</div>
          <div>raised for local causes so far</div>
        </div>
      </div>

      {list.length ? (
        <ul className="causes">
          {list.map((c) => (
            <li key={c.id} className="cause">
              <div className="cause-main">
                <h2 className="cause-name">{c.name}</h2>
                {c.description ? <p>{c.description}</p> : null}
                {c.website ? <a href={c.website} target="_blank" rel="noopener noreferrer">Visit their website</a> : null}
              </div>
              <dl className="cause-stats">
                <div><dt>Raised</dt><dd className="num">{gbp(Number(c.raised_pence))}</dd></div>
                <div><dt>Lots sold</dt><dd>{Number(c.sold)}</dd></div>
                <div><dt>Open now</dt><dd>{Number(c.running)}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      ) : <div className="empty">Local causes will be listed here soon.</div>}

      <section className="section">
        <h2 className="section-title">Charity lots open now</h2>
        <div className="grid">
          {lots?.length ? lots.map((l) => <LotCard key={l.id} lot={l} />)
            : <div className="empty">No charity lots right now. <Link href="/sell">Sell something for a good cause</Link>.</div>}
        </div>
      </section>

      <p className="hint" style={{ marginTop: 32, maxWidth: "70ch" }}>
        Sellers pay the cause themselves once they&apos;ve been paid; Going Going Gone never handles money. The amounts above are what sellers have pledged on lots that sold.
        If you run a local cause and would like to be listed, get in touch through the <Link href="/about">About</Link> page.
      </p>
    </div>
  );
}
