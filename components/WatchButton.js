"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// "Watch" a lot: saves it to My account and emails you an hour before it ends.
export default function WatchButton({ lotId, userId, initialWatching, initialCount, canWatch = true }) {
  const supabase = createClient();
  const [watching, setWatching] = useState(initialWatching);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const { error } = watching
      ? await supabase.from("watches").delete().eq("user_id", userId).eq("lot_id", lotId)
      : await supabase.from("watches").insert({ user_id: userId, lot_id: lotId });
    setBusy(false);
    if (error) return;
    setCount((c) => Math.max(0, c + (watching ? -1 : 1)));
    setWatching(!watching);
  }

  const label = count > 0 ? `${count} watching` : null;
  return (
    <div className="watch">
      {!canWatch ? null : userId ? (
        <button type="button" className={`watch-btn${watching ? " is-on" : ""}`} onClick={toggle} disabled={busy} aria-pressed={watching}>
          <StarIcon filled={watching} /> {watching ? "Watching" : "Watch"}
        </button>
      ) : (
        <Link className="watch-btn" href={`/login?next=/lot/${lotId}`}><StarIcon /> Watch</Link>
      )}
      {label ? <span className="watch-count">{label}</span> : null}
      {watching ? <span className="hint">We&apos;ll email you an hour before it ends.</span> : null}
    </div>
  );
}

function StarIcon({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z" />
    </svg>
  );
}
