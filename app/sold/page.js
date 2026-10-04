import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, LOT_CARD_FIELDS, gbp } from "@/lib/format";
import LotCard from "@/components/LotCard";

export const metadata = {
  title: "Sold prices",
  description: "What things have actually sold for on Going Going Gone, the local auction site for Market Bosworth. Handy for pricing your own items.",
};

const PAGE_SIZE = 24;

function hrefWith(params, changes) {
  const next = { ...params, ...changes };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v && !(k === "page" && v === "1")) qs.set(k, v);
  const s = qs.toString();
  return s ? `/sold?${s}` : "/sold";
}

// Sold = ended, had bids, met any reserve, not withdrawn.
const soldQuery = (supabase, fields, opts) => supabase.from("lots").select(fields, opts)
  .eq("status", "live").lte("ends_at", new Date().toISOString())
  .gt("bid_count", 0).not("high_bidder_id", "is", null).neq("reserve_status", "not_met");

export default async function SoldPage({ searchParams }) {
  const sp = await searchParams;
  const cat = CATEGORIES.includes(sp.cat) ? sp.cat : "";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const params = { cat, q };
  const supabase = await createClient();

  let list = soldQuery(supabase, LOT_CARD_FIELDS, { count: "exact" })
    .order("ends_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  let prices = soldQuery(supabase, "current_price_pence").limit(1000);
  if (cat) { list = list.eq("category", cat); prices = prices.eq("category", cat); }
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    list = list.ilike("title", like); prices = prices.ilike("title", like);
  }
  const [{ data: lots, count }, { data: priceRows }] = await Promise.all([list, prices]);
  const total = count ?? 0;
  const amounts = (priceRows ?? []).map((r) => r.current_price_pence).sort((a, b) => a - b);
  const sum = amounts.reduce((t, p) => t + p, 0);
  const median = amounts.length ? amounts[Math.floor((amounts.length - 1) / 2)] : 0;

  return (
    <div className="wrap" style={{ paddingBlock: 32 }}>
      <h1 className="page-title">Sold prices</h1>
      <p className="page-lead">What things have actually sold for here. Thinking of selling something? Search for similar items to see what they went for.</p>

      <form className="sold-search" action="/sold" method="get" role="search">
        <label htmlFor="sold-q" className="visually-hidden">Search sold items</label>
        <input id="sold-q" className="input" name="q" defaultValue={q} placeholder="e.g. bike, armchair, Lego" />
        {cat ? <input type="hidden" name="cat" value={cat} /> : null}
        <button className="btn btn-primary" type="submit">Search</button>
        {q ? <Link className="btn btn-ghost" href={hrefWith(params, { q: "", page: "" })}>Clear</Link> : null}
      </form>

      <div className="chips-scroll" style={{ margin: "16px 0 20px" }}>
        <nav className="chips" aria-label="Categories">
          <Link className="chip" href={hrefWith(params, { cat: "", page: "" })} aria-current={!cat}>All</Link>
          {CATEGORIES.map((c) => <Link key={c} className="chip" href={hrefWith(params, { cat: c, page: "" })} aria-current={cat === c}>{c}</Link>)}
        </nav>
      </div>

      {amounts.length ? (
        <dl className="sold-stats">
          <div><dt>Sold</dt><dd className="num">{amounts.length}{amounts.length >= 1000 ? "+" : ""}</dd></div>
          <div><dt>Typical price</dt><dd className="num">{gbp(median)}</dd></div>
          <div><dt>Range</dt><dd className="num">{gbp(amounts[0])} – {gbp(amounts[amounts.length - 1])}</dd></div>
          <div><dt>Total</dt><dd className="num">{gbp(sum)}</dd></div>
        </dl>
      ) : null}

      <div className="grid">
        {lots?.length ? lots.map((l) => <LotCard key={l.id} lot={l} />)
          : <div className="empty">{q || cat ? "Nothing like that has sold yet. Be the first: " : "Nothing has sold yet. "}<Link href="/sell">list something</Link>.</div>}
      </div>

      {total > PAGE_SIZE ? (
        <div className="pager">
          {page > 1 ? <Link className="btn btn-ghost" href={hrefWith(params, { page: String(page - 1) })}>Previous</Link> : null}
          <span className="hint">Page {page} of {Math.ceil(total / PAGE_SIZE)}</span>
          {page * PAGE_SIZE < total ? <Link className="btn btn-ghost" href={hrefWith(params, { page: String(page + 1) })}>Next</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
