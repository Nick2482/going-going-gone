import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LOT_CARD_FIELDS } from "@/lib/format";
import { ratingLine, SCORE_LABEL } from "@/lib/ratings";
import LotCard from "@/components/LotCard";

const isId = (id) => /^[0-9a-f-]{36}$/i.test(id);

async function loadProfile(supabase, id) {
  if (!isId(id)) return null;
  const { data } = await supabase.from("profiles").select("id, display_name, area, verified, created_at").eq("id", id).maybeSingle();
  return data;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const p = await loadProfile(supabase, id);
  return { title: p ? `${p.display_name}'s profile` : "Member not found" };
}

const since = (iso) => new Date(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Europe/London" });
const day = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });

export default async function MemberPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await loadProfile(supabase, id);
  if (!profile) notFound();

  const [{ data: summary }, { data: ratings }, { data: lots }] = await Promise.all([
    supabase.rpc("member_summary", { p_user: id }),
    supabase.from("ratings")
      .select("id, score, comment, created_at, ratee_role, rater:profiles!ratings_rater_id_fkey(id, display_name), lot:lots(id, title)")
      .eq("ratee_id", id).order("created_at", { ascending: false }).limit(50),
    supabase.from("lots").select(LOT_CARD_FIELDS)
      .eq("seller_id", id).eq("status", "live").gt("ends_at", new Date().toISOString())
      .order("ends_at", { ascending: true }).limit(24),
  ]);
  const s = summary || {};

  return (
    <div className="wrap" style={{ paddingBlock: 32 }}>
      <section className="member-card">
        <div className="member-avatar" aria-hidden="true">{profile.display_name.slice(0, 1).toUpperCase()}</div>
        <div className="member-main">
          <h1 className="member-name">{profile.display_name}</h1>
          <div className="row" style={{ gap: 8 }}>
            {profile.verified ? <span className="pill badge-local" style={{ marginLeft: 0 }}>✓ Local member</span> : null}
            <span className="hint">{profile.area ? `${profile.area} · ` : ""}Member since {since(profile.created_at)}</span>
          </div>
          <div className="member-rating">{ratingLine(s)}</div>
        </div>
        <dl className="member-stats">
          <div><dt>Positive</dt><dd className="score-1">{Number(s.positive || 0)}</dd></div>
          <div><dt>Neutral</dt><dd>{Number(s.neutral || 0)}</dd></div>
          <div><dt>Negative</dt><dd className="score--1">{Number(s.negative || 0)}</dd></div>
          <div><dt>Sold</dt><dd>{Number(s.sold || 0)}</dd></div>
          <div><dt>Bought</dt><dd>{Number(s.bought || 0)}</dd></div>
        </dl>
      </section>

      <section className="section">
        <h2 className="section-title">Feedback</h2>
        {ratings?.length ? (
          <ul className="feedback-list">
            {ratings.map((r) => (
              <li key={r.id} className="feedback">
                <span className={`score-dot score-bg-${r.score}`} aria-hidden="true" />
                <div>
                  <div><strong className={`score-${r.score}`}>{SCORE_LABEL[r.score]}</strong>{r.comment ? <> · &ldquo;{r.comment}&rdquo;</> : null}</div>
                  <div className="hint">
                    From {r.rater ? <Link href={`/member/${r.rater.id}`}>{r.rater.display_name}</Link> : "a former member"}
                    {" "}as {r.ratee_role === "seller" ? "a buyer" : "a seller"}
                    {r.lot ? <> · <Link href={`/lot/${r.lot.id}`}>{r.lot.title}</Link></> : null}
                    {" · "}{day(r.created_at)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : <div className="empty">No feedback yet. Ratings appear here after {profile.display_name} buys or sells something.</div>}
      </section>

      <section className="section">
        <h2 className="section-title">For sale now</h2>
        <div className="grid">
          {lots?.length ? lots.map((l) => <LotCard key={l.id} lot={l} />) : <div className="empty">Nothing for sale right now.</div>}
        </div>
      </section>
    </div>
  );
}
