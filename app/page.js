import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, LOT_CARD_FIELDS } from "@/lib/format";
import LotCard from "@/components/LotCard";
import SortSelect from "@/components/SortSelect";
import { ClockIcon, HomeIcon, TagIcon } from "@/components/Icons";
import EndingSoon from "@/components/EndingSoon";
import ActivityTicker from "@/components/ActivityTicker";
import { BID_FIELDS, NEW_LOT_FIELDS, bidEvent, listingEvent, mergeEvents } from "@/lib/activity";

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
    .select(LOT_CARD_FIELDS, { count: "exact" })
    .eq("status", "live")
    .gt("ends_at", nowIso)
    .order(sort.column, { ascending: sort.ascending })
    .order("lot_no", { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (cat) live = live.eq("category", cat);
  if (q) live = live.ilike("title", `%${q.replace(/[%_\\]/g, "\\$&")}%`);

  const gone = supabase
    .from("lots")
    .select(LOT_CARD_FIELDS)
    .eq("status", "live")
    .lte("ends_at", nowIso)
    .gt("bid_count", 0)
    .neq("reserve_status", "not_met")
    .order("ends_at", { ascending: false })
    .limit(8);

  const filtered = Boolean(cat || q);
  const showHero = !filtered && page === 1;

  // Homepage extras: the next lots to close, and recent activity for the live ticker.
  const ending = showHero
    ? supabase.from("lots").select(LOT_CARD_FIELDS).eq("status", "live").gt("ends_at", nowIso)
        .order("ends_at", { ascending: true }).limit(8)
    : Promise.resolve({ data: [] });
  const recentBids = showHero
    ? supabase.from("bids").select(BID_FIELDS).order("created_at", { ascending: false }).limit(10)
    : Promise.resolve({ data: [] });
  const recentLots = showHero
    ? supabase.from("lots").select(NEW_LOT_FIELDS).eq("status", "live").order("created_at", { ascending: false }).limit(6)
    : Promise.resolve({ data: [] });

  const [{ data: lots, count, error }, { data: sold }, { data: endingLots }, { data: bidRows }, { data: newLots }] =
    await Promise.all([live, gone, ending, recentBids, recentLots]);
  const total = count ?? 0;
  const events = mergeEvents((bidRows ?? []).map(bidEvent), (newLots ?? []).map(listingEvent));
  // Only show the strip when there are enough lots for it to be worth it.
  const endingSoon = (endingLots ?? []).length >= 3 ? endingLots.slice(0, 6) : [];

  return (
    <>
      {showHero ? (
        <section className="hero">
          <div className="hero-photo" aria-hidden="true" />
          <div className="wrap">
            <div>
              <h1 aria-label="Going Going Gone"><span>Going</span><span>Going</span><span>Gone</span></h1>
              <p className="hero-sub">Local auctions for Market Bosworth and the villages around. Sell what you don&apos;t need, bid on what you do, and collect from just down the road.</p>
              <div className="row">
                <a href="#lots" className="btn btn-light btn-lg">Browse lots</a>
                <Link href="/sell" className="btn btn-outline-light btn-lg">Sell something</Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {showHero ? (
        <section className="perks-strip" aria-label="Why Going Going Gone">
          <ul className="wrap perks">
            <li className="perk-aqua"><TagIcon /><div><strong>Free to list, free to bid</strong><span>No fees for buyers or sellers.</span></div></li>
            <li className="perk-white"><ClockIcon /><div><strong>Listed in two minutes</strong><span>Add photos, set a starting price, done. Sign in with just your email.</span></div></li>
            <li className="perk-red"><HomeIcon /><div><strong>Collect locally</strong><span>Buyers and sellers are neighbours, so there&apos;s no postage.</span></div></li>
          </ul>
        </section>
      ) : null}

      {showHero ? <ActivityTicker initial={events} /> : null}

      {showHero && endingSoon.length ? (
        <div className="wrap"><EndingSoon lots={endingSoon} /></div>
      ) : null}

      <div className="wrap" id="lots">
        <div className="toolbar">
          <h2>
            {q ? `Results for “${q}”` : cat || "Open lots"}
            <span className="count">{total} {total === 1 ? "lot" : "lots"}</span>
          </h2>
          <Suspense fallback={null}>
            <SortSelect options={Object.fromEntries(Object.entries(SORTS).map(([k, s]) => [k, s.label]))} value={sortKey} />
          </Suspense>
        </div>

        <div className="chips-scroll" style={{ marginBottom: 20 }}>
          <nav className="chips" aria-label="Categories">
            <Link className="chip" href={hrefWith(params, { cat: "", page: "" })} aria-current={!cat}>All</Link>
            {CATEGORIES.map((c) => (
              <Link key={c} className="chip" href={hrefWith(params, { cat: c, page: "" })} aria-current={cat === c}>{c}</Link>
            ))}
          </nav>
        </div>

        {q ? (
          <p className="filter-note">Showing lots matching “{q}”. <Link href={hrefWith(params, { q: "", page: "" })}>Clear search</Link></p>
        ) : null}

        {error ? <p className="error" style={{ marginBottom: 16 }}>Lots couldn&apos;t load right now. Refresh the page to try again.</p> : null}

        <div className="grid">
          {lots?.length ? lots.map((lot) => <LotCard key={lot.id} lot={lot} />) : (
            <div className="empty">
              <strong>{filtered ? "No lots found" : "No lots open yet"}</strong>
              {filtered ? "Try another search or category." : <>Be the first. <Link href="/sell">Sell something</Link>.</>}
            </div>
          )}
        </div>

        {total > PAGE_SIZE ? (
          <div className="pager">
            {page > 1 ? <Link className="btn btn-ghost" href={hrefWith(params, { page: String(page - 1) })}>Previous</Link> : null}
            <span className="hint">Page {page} of {Math.ceil(total / PAGE_SIZE)}</span>
            {page * PAGE_SIZE < total ? <Link className="btn btn-ghost" href={hrefWith(params, { page: String(page + 1) })}>Next</Link> : null}
          </div>
        ) : null}

        {sold?.length && !filtered ? (
          <section className="section">
            <h2 className="section-title">Recently sold</h2>
            <div className="grid">{sold.map((lot) => <LotCard key={lot.id} lot={lot} />)}</div>
          </section>
        ) : null}
      </div>
    </>
  );
}
