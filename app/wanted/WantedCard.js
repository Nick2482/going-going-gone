"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { gbp, when } from "@/lib/format";

function friendly(err, fallback) {
  const msg = err?.message || "";
  if (msg && !/violates|syntax|permission denied|JWT|fetch/i.test(msg)) return msg;
  return fallback;
}

export default function WantedCard({ ad, mine = false, userId }) {
  const supabase = createClient();
  const router = useRouter();
  const [replying, setReplying] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const closed = ad.status !== "open" || new Date(ad.expires_at).getTime() <= Date.now();
  const name = ad.poster?.display_name || "A member";

  async function reply(e) {
    e.preventDefault();
    if (msg.trim().length < 5) return setError("Write a short message, for example what you have and the price.");
    setBusy(true);
    setError("");
    const { error: err } = await supabase.rpc("reply_wanted", { p_ad: ad.id, p_message: msg });
    setBusy(false);
    if (err) return setError(friendly(err, "Your reply didn't send. Please try again."));
    setSent(true);
    setReplying(false);
  }

  async function setStatus(status, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    const { error: err } = await supabase.rpc("set_wanted_status", { p_ad: ad.id, p_status: status });
    setBusy(false);
    if (err) return setError(friendly(err, "That didn't work. Please try again."));
    router.refresh();
  }

  return (
    <li className={`wanted-card${closed ? " is-closed" : ""}`}>
      <div className="wanted-head">
        <span className="wanted-tag">Wanted</span>
        <h3 className="wanted-title">{ad.title}</h3>
        {ad.budget_pence ? <span className="wanted-budget">up to <strong className="num">{gbp(ad.budget_pence)}</strong></span> : null}
      </div>
      {ad.details ? <p className="wanted-details">{ad.details}</p> : null}
      <div className="hint">
        {ad.category} · {mine ? "You" : name}{ad.poster?.area ? `, ${ad.poster.area}` : ""} · posted {when(ad.created_at)}
        {mine ? (ad.status === "found" ? " · marked as found" : closed ? " · expired" : ` · open until ${when(ad.expires_at)}`) : null}
      </div>

      {mine ? (
        <div className="row" style={{ gap: 8 }}>
          {ad.status === "open" && !closed
            ? <button type="button" className="btn btn-sm btn-brass" disabled={busy} onClick={() => setStatus("found")}>Mark as found</button>
            : <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => setStatus("open")}>Post again for 30 days</button>}
          <button type="button" className="btn btn-sm btn-ghost wanted-remove" disabled={busy}
            onClick={() => setStatus("removed", "Remove this wanted ad?")}>Remove</button>
        </div>
      ) : sent ? (
        <p className="wanted-sent" role="status">Sent! We&apos;ve emailed {name}. If they&apos;re interested they&apos;ll reply to your email address.</p>
      ) : replying ? (
        <form className="wanted-reply" onSubmit={reply} noValidate>
          <label htmlFor={`wr-${ad.id}`} className="visually-hidden">Your message</label>
          <textarea id={`wr-${ad.id}`} className="input" rows={3} maxLength={500} autoFocus
            placeholder="What have you got? Condition, price, where you are…" value={msg} onChange={(e) => setMsg(e.target.value)} style={{ minHeight: 76 }} />
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-sm btn-brass" type="submit" disabled={busy}>{busy ? "Sending…" : "Send"}</button>
            <button className="btn btn-sm btn-ghost" type="button" onClick={() => setReplying(false)}>Cancel</button>
          </div>
          <p className="hint">We&apos;ll email your message to {name}. They&apos;ll see your name and can reply to your email address.</p>
        </form>
      ) : userId ? (
        <div><button type="button" className="btn btn-sm btn-brass" onClick={() => setReplying(true)}>I have one</button></div>
      ) : (
        <div><Link className="btn btn-sm btn-ghost" href="/login?next=/wanted">Sign in to reply</Link></div>
      )}
      {error ? <p className="error" role="alert">{error}</p> : null}
    </li>
  );
}
