import Link from "next/link";
import { createClient, getUserId } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/format";
import WantedForm from "./WantedForm";
import WantedCard from "./WantedCard";

export const metadata = {
  title: "Wanted",
  description: "Looking for something in Market Bosworth? Post a free wanted ad and neighbours who have one can get in touch.",
};

const FIELDS = "id, user_id, title, details, category, budget_pence, status, created_at, expires_at, poster:profiles(display_name, area)";

export default async function WantedPage({ searchParams }) {
  const sp = await searchParams;
  const cat = CATEGORIES.includes(sp.cat) ? sp.cat : "";
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  const nowIso = new Date().toISOString();

  let q = supabase.from("wanted_ads").select(FIELDS).eq("status", "open").gt("expires_at", nowIso).order("created_at", { ascending: false }).limit(200);
  if (cat) q = q.eq("category", cat);
  const [{ data: ads }, { data: mine }] = await Promise.all([
    q,
    userId
      ? supabase.from("wanted_ads").select(FIELDS).eq("user_id", userId).neq("status", "removed").order("created_at", { ascending: false }).limit(20)
      : Promise.resolve({ data: [] }),
  ]);
  const others = (ads ?? []).filter((a) => a.user_id !== userId);
  const usedCats = [...new Set((ads ?? []).map((a) => a.category))];

  return (
    <div className="wrap" style={{ paddingBlock: 32 }}>
      <h1 className="page-title">Wanted</h1>
      <p className="page-lead">
        Looking for something? Post a free wanted ad and neighbours who have one can get in touch. Got something someone&apos;s after? Tap <strong>I have one</strong>.
      </p>

      <div className="wanted-top">
        {userId ? <WantedForm /> : (
          <div className="wanted-signin">
            <strong>Post a wanted ad</strong>
            <span><Link href="/login?next=/wanted">Sign in</Link> to say what you&apos;re looking for. It&apos;s free, and your email address isn&apos;t shown.</span>
          </div>
        )}
      </div>

      {mine?.length ? (
        <section className="section" id="mine">
          <h2 className="section-title">Your wanted ads</h2>
          <ul className="wanted-list">
            {mine.map((a) => <WantedCard key={a.id} ad={a} mine userId={userId} />)}
          </ul>
        </section>
      ) : null}

      <section className="section" id="ads">
        <h2 className="section-title">People are looking for</h2>
        {usedCats.length > 1 || cat ? (
          <div className="chips-scroll" style={{ marginBottom: 16 }}>
            <nav className="chips" aria-label="Categories">
              <Link className="chip" href="/wanted#ads" aria-current={!cat}>All</Link>
              {CATEGORIES.filter((c) => usedCats.includes(c) || c === cat).map((c) => (
                <Link key={c} className="chip" href={`/wanted?cat=${encodeURIComponent(c)}#ads`} aria-current={cat === c}>{c}</Link>
              ))}
            </nav>
          </div>
        ) : null}
        {others.length ? (
          <ul className="wanted-list">
            {others.map((a) => <WantedCard key={a.id} ad={a} userId={userId} />)}
          </ul>
        ) : (
          <div className="empty">
            <strong>Nothing wanted yet</strong>
            {cat ? "No wanted ads in this category right now." : "Be the first to post what you're looking for."}
          </div>
        )}
      </section>

      <p className="hint" style={{ marginTop: 24, maxWidth: "70ch" }}>
        Wanted ads run for 30 days. Replies are emailed to the person who posted, and their email address is only shared if they reply. Meet somewhere public, check the item before paying, and never pay by bank transfer to someone you haven&apos;t met.
      </p>
    </div>
  );
}
