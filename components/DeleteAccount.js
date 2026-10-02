"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// "Delete my account": removes the person's photos, then their account and
// everything linked to it (listings, bids, profile). Refused while they are in
// the middle of a running auction.
export default function DeleteAccount({ userId }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function removePhotos() {
    const bucket = supabase.storage.from("lot-photos");
    const { data: folders } = await bucket.list(userId, { limit: 1000 });
    const paths = [];
    for (const f of folders ?? []) {
      if (f.id) { paths.push(`${userId}/${f.name}`); continue; }
      const { data: files } = await bucket.list(`${userId}/${f.name}`, { limit: 1000 });
      for (const file of files ?? []) paths.push(`${userId}/${f.name}/${file.name}`);
    }
    for (let i = 0; i < paths.length; i += 100) await bucket.remove(paths.slice(i, i + 100));
  }

  async function confirm(e) {
    e.preventDefault();
    if (typed.trim().toUpperCase() !== "DELETE") return setError("Type DELETE to confirm.");
    setBusy(true);
    setError("");
    try {
      const { data: check, error: checkErr } = await supabase.rpc("delete_my_account", { p_check_only: true });
      if (checkErr) throw checkErr;
      if (check) { setError(check); setBusy(false); return; }
      await removePhotos();
      const { data: msg, error: delErr } = await supabase.rpc("delete_my_account", { p_check_only: false });
      if (delErr) throw delErr;
      if (msg) { setError(msg); setBusy(false); return; }
      await supabase.auth.signOut();
      window.location.assign("/goodbye");
    } catch {
      setError("Something went wrong and your account wasn't deleted. Please try again, or email us and we'll do it for you.");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <section className="section danger-zone">
        <h2 className="section-title">Delete my account</h2>
        <p className="hint">Remove your account and everything linked to it: your details, listings, photos and bids.</p>
        <button type="button" className="btn btn-danger" onClick={() => setOpen(true)}>Delete my account</button>
      </section>
    );
  }

  return (
    <section className="section danger-zone">
      <h2 className="section-title">Delete my account</h2>
      <form className="panel danger-panel" onSubmit={confirm} noValidate>
        <p><strong>This can&apos;t be undone.</strong> Your sign-in, name, listings, photos and bids will be deleted straight away.</p>
        <p className="hint">If you&apos;ve just bought or sold something, arrange collection first. The other person won&apos;t be able to see your email once your account is gone. You can&apos;t delete your account while you have a running auction with bids, or while you&apos;re the highest bidder on one.</p>
        <div className="field" style={{ maxWidth: 320 }}>
          <label htmlFor="del-confirm">Type DELETE to confirm</label>
          <input id="del-confirm" className="input" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
        </div>
        {error ? <p className="error" role="alert">{error}</p> : null}
        <div className="row">
          <button type="submit" className="btn btn-delete" disabled={busy}>{busy ? "Deleting…" : "Delete my account for good"}</button>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => { setOpen(false); setTyped(""); setError(""); }}>Cancel</button>
        </div>
      </form>
    </section>
  );
}
