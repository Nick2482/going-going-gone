import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/format";
import LotCard from "@/components/LotCard";

const PAGE_SIZE = 48;
const SORTS = {
  ending: { label: "Ending soonest", column: "ends_at", ascending: true },
  new: { label: "Newly listed", column: "created_at", ascending: false },
  low: { label: "Price: low to high", column: "current_price_pence", ascending: true },
  high: { label: "Price: high to low", column: "current_price_pence", ascending: false },
  bids: { label: "Most bids", column: "bid_count", ascending: false },
};

function hrefWith(params, changes) {
  const next = { ...params, ...changes };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v && !(k === "sort" && v === "ending") && !(k === "page" && v === "1")) qs.set(k, v);
  const s = qs.toString();
  return s ? `/?${s}` : "/";
}

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const cat = CATEGORIES.includes(sp.cat) ? sp.cat : "";
  const sortKey = SORTS[sp.sort] ? sp.sort : "ending";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const params = { cat, sort: sortKey, q };

  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const sort = SORTS[sortKey];

  let live = supabase
    .from("lots")
    .select("id, lot_no, title, category, location, current_price_pence, bid_count, ends_at, cover_path", { count: "exact" })
    .eq("status", "live")
    .gt("ends_at", nowIso)
    .order(sort.column, { ascending: sort.ascending })
    .order("lot_no", { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (cat) live = live.eq("category", cat);
  if (q) live = live.ilike("title", `%${q.replace(/[%_\\]/g, "\\$&")}%`);

  const gone = supabase
    .from("lots")
    .select("id, lot_no, title, category, location, current_price_pence, bid_count, ends_at, cover_path")
    .eq("status", "live")
    .lte("ends_at", nowIso)
    .gt("bid_count", 0)
    .order("ends_at", { ascending: false })
    .limit(8);

  const [{ data: lots, count, error }, { data: sold }] = await Promise.all([live, gone]);
  const total = count ?? 0;
  const filtered = Boolean(cat || q);

  return (
    <div className="wrap">
      {!filtered && page === 1 ? (
        <section className="hero">
          <h1 aria-label="Going Going Gone"><span>Going</span><span>Going</span><span>Gone</span></h1>
          <p>Local auctions for local people. List what you&apos;re selling, bid on what you want, and collect from just down the road.</p>
        </section>
      ) : null}

      <div className="toolbar">
        <nav className="chips" aria-label="Categories">
          <Link className="chip" href={hrefWith(params, { cat: "", page: "" })} aria-current={!cat}>All</Link>
          {CATEGORIES.map((c) => (
            <Link key={c} className="chip" href={hrefWith(params, { cat: c, page: "" })} aria-current={cat === c}>{c}</Link>
          ))}
        </nav>
      </div>

      <form className="search" action="/" method="get" style={{ marginBottom: 20 }}>
        {cat ? <input type="hidden" name="cat" value={cat} /> : null}
        <label htmlFor="q" className="visually-hidden">Search lots</label>
        <input id="q" name="q" className="input" placeholder="Search lots, e.g. bike, clock, sofa" defaultValue={q} />
        <label htmlFor="sort" className="visually-hidden">Sort</label>
        <select id="sort" name="sort" className="input" defaultValue={sortKey} style={{ width: "auto" }}>
          {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
        <button className="btn btn-ghost" type="submit">Search</button>
      </form>

      {error ? <p className="error">Lots couldn&apos;t load right now. Refresh the page to try again.</p> : null}

      <div className="grid">
        {lots?.length ? lots.map((lot) => <LotCard key={lot.id} lot={lot} />) : (
          <div className="empty">
            <strong>{filtered ? "No lots found" : "No lots open yet"}</strong>
            {filtered ? "Try another search or category." : <>Be the first. <Link href="/sell">Sell something</Link>.</>}
          </div>
        )}
      </div>

      {total > PAGE_SIZE ? (
        <div className="row" style={{ justifyContent: "center", marginTop: 24 }}>
          {page > 1 ? <Link className="btn btn-ghost" href={hrefWith(params, { page: String(page - 1) })}>Previous</Link> : null}
          <span className="hint">Page {page} of {Math.ceil(total / PAGE_SIZE)}</span>
          {page * PAGE_SIZE < total ? <Link className="btn btn-ghost" href={hrefWith(params, { page: String(page + 1) })}>Next</Link> : null}
        </div>
      ) : null}

      {sold?.length && !filtered ? (
        <section className="section">
          <h2 className="section-title">Recently gone</h2>
          <div className="grid">{sold.map((lot) => <LotCard key={lot.id} lot={lot} />)}</div>
        </section>
      ) : null}
    </div>
  );
}
