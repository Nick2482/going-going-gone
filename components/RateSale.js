"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SCORE_LABEL } from "@/lib/ratings";

// Shown to the buyer and seller once a lot has sold: rate the other person once.
export default function RateSale({ lotId, userId, otherName, otherRole }) {
  const supabase = createClient();
  const [mine, setMine] = useState(undefined); // undefined = loading, null = not rated yet
  const [score, setScore] = useState(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("ratings").select("score, comment").eq("lot_id", lotId).eq("rater_id", userId).maybeSingle()
      .then(({ data }) => setMine(data ?? null));
  }, [supabase, lotId, userId]);

  async function submit(e) {
    e.preventDefault();
    if (score === null) return setError("Choose positive, neutral or negative.");
    setBusy(true);
    setError("");
    const { data, error: err } = await supabase.rpc("leave_rating", { p_lot: lotId, p_score: score, p_comment: comment });
    setBusy(false);
    if (err) return setError(err.message || "Your rating didn't save. Try again.");
    setMine({ score: data.score, comment: data.comment });
  }

  if (mine === undefined) return null;
  if (mine) {
    return (
      <div className="rate-done">
        You rated {otherName} <strong className={`score score-${mine.score}`}>{SCORE_LABEL[mine.score]}</strong>
        {mine.comment ? <> · &ldquo;{mine.comment}&rdquo;</> : null}. Thank you!
      </div>
    );
  }

  return (
    <form className="rate" onSubmit={submit} noValidate>
      <div className="rate-title">How did it go with {otherName}?</div>
      <p className="hint">Rate the {otherRole} once you&apos;ve collected and paid. Your rating appears on their profile and can&apos;t be changed.</p>
      <div className="rate-choices" role="radiogroup" aria-label="Your rating">
        {[1, 0, -1].map((v) => (
          <button key={v} type="button" role="radio" aria-checked={score === v}
            className={`rate-choice rate-${v}${score === v ? " is-on" : ""}`} onClick={() => setScore(v)}>
            {SCORE_LABEL[v]}
          </button>
        ))}
      </div>
      <label className="visually-hidden" htmlFor={`rate-c-${lotId}`}>Comment (optional)</label>
      <input id={`rate-c-${lotId}`} className="input" maxLength={280} placeholder="Add a short comment (optional)"
        value={comment} onChange={(e) => setComment(e.target.value)} />
      {error ? <p className="error" role="alert">{error}</p> : null}
      <div><button className="btn btn-brass" type="submit" disabled={busy}>{busy ? "Saving…" : "Leave rating"}</button></div>
    </form>
  );
}
