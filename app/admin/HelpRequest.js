"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LABELS = { new: "New", contacted: "In touch", done: "Listed", declined: "Not going ahead" };
const PILL = { new: "p-out", contacted: "p-open", done: "p-win", declined: "p-unsold" };

// One "We'll list it for you" request, with buttons to move it along and a private note.
export default function HelpRequest({ r }) {
  const supabase = createClient();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function update(status) {
    setBusy(status);
    setError("");
    const { error: err } = await supabase.rpc("admin_update_listing_help", { p_id: r.id, p_status: status, p_note: note });
    setBusy("");
    if (err) return setError(err.message || "That didn't save. Try again.");
    setNote("");
    router.refresh();
  }

  const tel = r.phone ? r.phone.replace(/[^0-9+]/g, "") : "";
  return (
    <li className="admin-item help-item">
      <div className="admin-item-main">
        <div className="row" style={{ gap: 8 }}>
          <strong>{r.name}</strong>
          {r.area ? <span className="hint">{r.area}</span> : null}
          <span className={`pill ${PILL[r.status]}`}>{LABELS[r.status]}</span>
        </div>
        <blockquote className="admin-quote" style={{ whiteSpace: "pre-wrap" }}>{r.items}</blockquote>
        <div className="row" style={{ gap: 14 }}>
          {r.phone ? <a href={`tel:${tel}`}><strong>{r.phone}</strong></a> : null}
          {r.email ? <a href={`mailto:${r.email}?subject=${encodeURIComponent("Going Going Gone: listing your items")}`}>{r.email}</a> : null}
          {r.best_time ? <span className="hint">Best time: {r.best_time}</span> : null}
        </div>
        <div className="hint">Asked {new Date(r.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
        {r.admin_note ? <p className="help-note"><strong>Note:</strong> {r.admin_note}</p> : null}
        <div className="row" style={{ gap: 8, marginTop: 6 }}>
          <input className="input" style={{ flex: 1, minWidth: 200 }} maxLength={500} placeholder="Add a private note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="row" style={{ gap: 8 }}>
          {["contacted", "done", "declined", "new"].filter((s) => s !== r.status).map((s) => (
            <button key={s} type="button" className={`btn btn-sm ${s === "done" ? "btn-brass" : "btn-ghost"}`} onClick={() => update(s)} disabled={Boolean(busy)}>
              {busy === s ? "…" : s === "new" ? "Mark as new" : `Mark: ${LABELS[s]}`}
            </button>
          ))}
          {note.trim() ? <button type="button" className="btn btn-sm btn-ghost" onClick={() => update(r.status)} disabled={Boolean(busy)}>Save note</button> : null}
        </div>
        {error ? <p className="error" role="alert">{error}</p> : null}
      </div>
    </li>
  );
}
