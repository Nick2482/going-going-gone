"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, toPence } from "@/lib/format";

function friendly(err, fallback) {
  const msg = err?.message || "";
  if (msg && !/violates|syntax|permission denied|JWT|fetch/i.test(msg)) return msg;
  return fallback;
}

export default function WantedForm() {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [category, setCategory] = useState("Other");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (title.trim().length < 3) return setError("Say what you're looking for, for example \"Child's bike\".");
    const b = budget.trim() ? toPence(budget) : null;
    if (b !== null && (!Number.isFinite(b) || b < 1)) return setError("Enter a budget like 30 or 30.00, or leave it empty.");
    setBusy(true);
    const { error: err } = await supabase.rpc("post_wanted", { p_title: title, p_details: details, p_category: category, p_budget: b });
    setBusy(false);
    if (err) return setError(friendly(err, "Your ad didn't save. Please try again."));
    setTitle(""); setDetails(""); setBudget(""); setCategory("Other");
    setOpen(false);
    setDone(true);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="wanted-cta">
        <div>
          <strong>Looking for something?</strong>
          <span>{done ? "Your wanted ad is up. We'll email you when someone replies." : "Post a free wanted ad. It runs for 30 days."}</span>
        </div>
        <button type="button" className="btn btn-brass" onClick={() => { setOpen(true); setDone(false); }}>Post a wanted ad</button>
      </div>
    );
  }

  return (
    <form className="form-card wanted-form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="w-title">What are you looking for?</label>
        <div className="wanted-prefix"><span>Wanted:</span>
          <input id="w-title" className="input" maxLength={80} placeholder="e.g. Child's bike, age 6" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="w-details">Details <span className="hint">(optional)</span></label>
        <textarea id="w-details" className="input" rows={3} maxLength={500} placeholder="Size, colour, condition, when you need it…" value={details} onChange={(e) => setDetails(e.target.value)} style={{ minHeight: 80 }} />
      </div>
      <div className="wanted-row">
        <div className="field">
          <label htmlFor="w-cat">Category</label>
          <select id="w-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="w-budget">Budget <span className="hint">(optional)</span></label>
          <div className="money"><span>£</span><input id="w-budget" inputMode="decimal" placeholder="Up to" value={budget} onChange={(e) => setBudget(e.target.value)} /></div>
        </div>
      </div>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <div className="row">
        <button className="btn btn-brass" type="submit" disabled={busy}>{busy ? "Posting…" : "Post wanted ad"}</button>
        <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      <p className="hint">Your name is shown, but not your email address. Replies come to you by email.</p>
    </form>
  );
}
