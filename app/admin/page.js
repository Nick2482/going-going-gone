import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getUserId } from "@/lib/supabase/server";
import { gbp, when, lotNumber } from "@/lib/format";
import { SCORE_LABEL } from "@/lib/ratings";
import AdminButton from "./AdminActions";
import CauseForm from "./CauseForm";
import Roundup from "./Roundup";

export const metadata = { title: "Admin", robots: { index: false } };

function lotState(l) {
  if (l.status === "removed") return { label: "Withdrawn", cls: "p-unsold" };
  if (new Date(l.ends_at).getTime() > Date.now()) return { label: "Running", cls: "p-open" };
  return l.bid_count > 0 ? { label: "Ended", cls: "p-gone" } : { label: "No bids", cls: "p-unsold" };
}

export default async function AdminPage({ searchParams }) {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) redirect("/login?next=/admin");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) notFound();

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";

  const nowIso = new Date().toISOString();
  const RU = "id, title, current_price_pence, bid_count, ends_at, charity_percent";
  const [{ data: stats }, { data: reports }, { data: members }, { data: lots }, { data: ratings }, { data: causes }, { data: ruEnding }, { data: ruFresh }, { data: questions }, { data: wanted }] = await Promise.all([
    supabase.rpc("admin_stats"),
    supabase.rpc("admin_open_reports"),
    supabase.rpc("admin_members", { p_search: q }),
    supabase.rpc("admin_recent_lots"),
    supabase.rpc("admin_recent_ratings"),
    supabase.rpc("charity_totals"),
    supabase.from("lots").select(RU).eq("status", "live").gt("ends_at", nowIso).lte("ends_at", new Date(Date.now() + 7 * 864e5).toISOString()).order("ends_at", { ascending: true }).limit(8),
    supabase.from("lots").select(RU).eq("status", "live").gt("ends_at", nowIso).order("created_at", { ascending: false }).limit(10),
    supabase.rpc("admin_recent_questions"),
    supabase.rpc("admin_recent_wanted"),
  ]);
  const s = stats || {};

  const tiles = [
    { n: s.members ?? 0, label: "Members", sub: `${s.new_members ?? 0} new this week` },
    { n: s.live_lots ?? 0, label: "Running lots", sub: `${s.total_lots ?? 0} listed in total` },
    { n: s.bids_week ?? 0, label: "Bids this week" },
    { n: s.sold ?? 0, label: "Sold", sub: `${gbp(s.sold_value ?? 0)} in total` },
    { n: s.open_reports ?? 0, label: "Open reports", alert: (s.open_reports ?? 0) > 0 },
  ];

  return (
    <div className="wrap admin" style={{ paddingBlock: 32 }}>
      <h1 className="page-title">Admin</h1>
      <p className="hint">Only admins can see this page.</p>

      <div className="admin-tiles">
        {tiles.map((t) => (
          <div key={t.label} className={`admin-tile${t.alert ? " admin-tile-alert" : ""}`}>
            <div className="admin-tile-n num">{t.n}</div>
            <div className="admin-tile-label">{t.label}</div>
            {t.sub ? <div className="hint">{t.sub}</div> : null}
          </div>
        ))}
      </div>

      <nav className="admin-jump" aria-label="Admin sections">
        <a href="#reports">Reports</a><a href="#members">Members</a><a href="#lots">Latest lots</a><a href="#feedback">Feedback</a><a href="#questions">Questions</a><a href="#wanted">Wanted ads</a><a href="#causes">Local causes</a><a href="#roundup">Facebook round-up</a>
      </nav>

      <section className="section" id="reports">
        <h2 className="section-title">Reports</h2>
        {reports?.length ? (
          <ul className="admin-list">
            {reports.map((r) => (
              <li key={r.id} className="admin-item">
                <div className="admin-item-main">
                  <div><strong>{r.lot_title}</strong> <span className="hint">Lot {lotNumber(r.lot_no)} · sold by {r.seller_name || "unknown"}</span></div>
                  <blockquote className="admin-quote">{r.reason}</blockquote>
                  <div className="hint">Reported by {r.reporter_name || "someone"} · {when(r.created_at)}{r.lot_status === "removed" ? " · already withdrawn" : ""}</div>
                </div>
                <div className="row admin-actions">
                  {r.lot_status !== "removed" ? <Link className="btn btn-sm btn-ghost" href={`/lot/${r.lot_id}`} target="_blank">View lot</Link> : null}
                  {r.lot_status !== "removed" ? <AdminButton fn="admin_remove_lot" args={{ p_lot: r.lot_id }} label="Remove lot" tone="delete" confirm={`Remove "${r.lot_title}" from the site?`} /> : null}
                  <AdminButton fn="admin_resolve_report" args={{ p_report: r.id }} label="Dismiss" />
                </div>
              </li>
            ))}
          </ul>
        ) : <div className="empty">No open reports. All quiet.</div>}
      </section>

      <section className="section" id="members">
        <h2 className="section-title">Members</h2>
        <form className="row admin-search" action="/admin#members" method="get" role="search">
          <label htmlFor="admin-q" className="visually-hidden">Search members</label>
          <input id="admin-q" className="input" name="q" defaultValue={q} placeholder="Search by name, email or area" />
          <button className="btn btn-primary" type="submit">Search</button>
          {q ? <Link href="/admin#members" className="btn btn-ghost">Clear</Link> : null}
        </form>
        {members?.length ? (
          <ul className="admin-list">
            {members.map((m) => (
              <li key={m.id} className="admin-item">
                <div className="admin-item-main">
                  <div className="row" style={{ gap: 6 }}>
                    <strong>{m.display_name}</strong>
                    {m.admin ? <span className="pill p-gone">Admin</span> : null}
                    {m.verified ? <span className="pill badge-local">Local member</span> : null}
                    {m.blocked ? <span className="pill p-out">Blocked</span> : null}
                  </div>
                  <div className="mono admin-email">{m.email}</div>
                  <div className="hint">
                    {m.area ? `${m.area} · ` : ""}Joined {when(m.joined)} · {Number(m.lots)} lots · {Number(m.bids)} bids
                    {m.last_seen ? ` · last signed in ${when(m.last_seen)}` : ""}
                  </div>
                </div>
                <div className="row admin-actions">
                  <AdminButton fn="admin_set_verified" args={{ p_user: m.id, p_on: !m.verified }}
                    label={m.verified ? "Remove badge" : "Give Local member badge"} tone={m.verified ? "ghost" : "primary"} />
                  {m.admin ? null : (
                    <AdminButton fn="admin_set_blocked" args={{ p_user: m.id, p_on: !m.blocked }}
                      label={m.blocked ? "Unblock" : "Block"} tone={m.blocked ? "ghost" : "danger"}
                      confirm={m.blocked ? null : `Block ${m.display_name}? They won't be able to list, bid or report, and their running auctions will be withdrawn.`} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : <div className="empty">{q ? "No members match that search." : "No members yet."}</div>}
      </section>

      <section className="section" id="lots">
        <h2 className="section-title">Latest lots</h2>
        {lots?.length ? (
          <ul className="admin-list">
            {lots.map((l) => {
              const st = lotState(l);
              return (
                <li key={l.id} className="admin-item">
                  <div className="admin-item-main">
                    <div className="row" style={{ gap: 6 }}>
                      {l.status === "removed" ? <strong>{l.title}</strong> : <Link href={`/lot/${l.id}`}><strong>{l.title}</strong></Link>}
                      <span className={`pill ${st.cls}`}>{st.label}</span>
                      {Number(l.reports) ? <span className="pill p-out">{Number(l.reports)} report{Number(l.reports) === 1 ? "" : "s"}</span> : null}
                    </div>
                    <div className="hint">
                      Lot {lotNumber(l.lot_no)} · by {l.seller_name || "unknown"} · {gbp(l.current_price_pence)} · {l.bid_count} bid{l.bid_count === 1 ? "" : "s"} · listed {when(l.created_at)}
                    </div>
                  </div>
                  <div className="row admin-actions">
                    {l.status === "removed"
                      ? <AdminButton fn="admin_restore_lot" args={{ p_lot: l.id }} label="Put back" />
                      : <AdminButton fn="admin_remove_lot" args={{ p_lot: l.id }} label="Remove" tone="danger" confirm={`Remove "${l.title}" from the site?`} />}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : <div className="empty">No lots yet.</div>}
      </section>

      <section className="section" id="feedback">
        <h2 className="section-title">Latest feedback</h2>
        {ratings?.length ? (
          <ul className="admin-list">
            {ratings.map((r) => (
              <li key={r.id} className="admin-item">
                <div className="admin-item-main">
                  <div><strong className={`score-${r.score}`}>{SCORE_LABEL[r.score]}</strong>{r.comment ? <> · &ldquo;{r.comment}&rdquo;</> : null}</div>
                  <div className="hint">{r.rater_name || "Someone"} rated {r.ratee_name || "someone"} as the {r.ratee_role} · {r.lot_title} · {when(r.created_at)}</div>
                </div>
                <div className="row admin-actions">
                  <AdminButton fn="admin_remove_rating" args={{ p_rating: r.id }} label="Remove" tone="danger" confirm="Remove this rating? Only do this if it's abusive or clearly unfair." />
                </div>
              </li>
            ))}
          </ul>
        ) : <div className="empty">No feedback yet.</div>}
      </section>

      <section className="section" id="questions">
        <h2 className="section-title">Latest questions</h2>
        {questions?.length ? (
          <ul className="admin-list">
            {questions.map((q) => (
              <li key={q.id} className="admin-item">
                <div className="admin-item-main">
                  <div className="row" style={{ gap: 6 }}>
                    <strong>{q.question}</strong>
                    {q.hidden ? <span className="pill p-unsold">Removed</span> : q.answer ? null : <span className="pill p-open">Waiting</span>}
                  </div>
                  {q.answer ? <blockquote className="admin-quote">{q.answer}</blockquote> : null}
                  <div className="hint">{q.asker_name || "Someone"} asked {q.seller_name || "the seller"} · <Link href={`/lot/${q.lot_id}#questions`}>{q.lot_title}</Link> · {when(q.created_at)}</div>
                </div>
                {q.hidden ? null : (
                  <div className="row admin-actions">
                    <AdminButton fn="remove_question" args={{ p_question: q.id }} label="Remove" tone="danger" confirm="Remove this question and its answer from the lot?" />
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <div className="empty">No questions yet.</div>}
      </section>

      <section className="section" id="wanted">
        <h2 className="section-title">Wanted ads</h2>
        {wanted?.length ? (
          <ul className="admin-list">
            {wanted.map((w) => (
              <li key={w.id} className="admin-item">
                <div className="admin-item-main">
                  <div className="row" style={{ gap: 6 }}>
                    <strong>Wanted: {w.title}</strong>
                    {w.status === "removed" ? <span className="pill p-unsold">Removed</span>
                      : w.status === "found" ? <span className="pill p-win">Found</span>
                      : new Date(w.expires_at) <= new Date() ? <span className="pill p-unsold">Expired</span> : <span className="pill p-open">Open</span>}
                  </div>
                  {w.details ? <blockquote className="admin-quote">{w.details}</blockquote> : null}
                  <div className="hint">{w.poster_name || "Someone"} · {w.category}{w.budget_pence ? ` · up to ${gbp(w.budget_pence)}` : ""} · {Number(w.replies)} repl{Number(w.replies) === 1 ? "y" : "ies"} · {when(w.created_at)}</div>
                </div>
                {w.status === "removed" ? null : (
                  <div className="row admin-actions">
                    <AdminButton fn="set_wanted_status" args={{ p_ad: w.id, p_status: "removed" }} label="Remove" tone="danger" confirm="Remove this wanted ad from the site?" />
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <div className="empty">No wanted ads yet.</div>}
      </section>

      <section className="section" id="causes">
        <h2 className="section-title">Local causes</h2>
        <p className="hint" style={{ marginBottom: 12 }}>Sellers can only pledge to causes on this list. Hide a cause to stop new pledges; lots already pledged keep it.</p>
        <div style={{ marginBottom: 12 }}><CauseForm /></div>
        {causes?.length ? (
          <ul className="admin-list">
            {causes.map((c) => (
              <li key={c.id} className="admin-item">
                <div className="admin-item-main">
                  <div className="row" style={{ gap: 6 }}><strong>{c.name}</strong>{c.active ? null : <span className="pill p-unsold">Hidden</span>}</div>
                  <div className="hint">{gbp(Number(c.raised_pence))} raised · {Number(c.sold)} sold · {Number(c.running)} open now{c.website ? ` · ${c.website}` : ""}</div>
                </div>
                <div className="admin-actions"><CauseForm cause={c} /></div>
              </li>
            ))}
          </ul>
        ) : <div className="empty">No causes yet. Add the first one above.</div>}
      </section>

      <section className="section" id="roundup">
        <h2 className="section-title">Facebook round-up</h2>
        <Roundup ending={ruEnding ?? []} fresh={ruFresh ?? []} />
      </section>
    </div>
  );
}
