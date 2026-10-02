"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Add a new local cause (no `cause`) or edit an existing one.
export default function CauseForm({ cause }) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(cause?.name || "");
  const [description, setDescription] = useState(cause?.description || "");
  const [website, setWebsite] = useState(cause?.website || "");
  const [active, setActive] = useState(cause ? cause.active : true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e) {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Give the cause a name.");
    setBusy(true);
    setError("");
    const { error: err } = await supabase.rpc("admin_save_charity", {
      p_id: cause?.id ?? null, p_name: name, p_description: description, p_website: website, p_active: active,
    });
    setBusy(false);
    if (err) return setError(/check constraint/.test(err.message) ? "Check the website address." : err.message);
    setOpen(false);
    if (!cause) { setName(""); setDescription(""); setWebsite(""); setActive(true); }
    router.refresh();
  }

  if (!open) {
    return <button type="button" className={`btn btn-sm ${cause ? "btn-ghost" : "btn-primary"}`} onClick={() => setOpen(true)}>{cause ? "Edit" : "Add a local cause"}</button>;
  }

  return (
    <form className="panel cause-form" onSubmit={save} noValidate>
      <div className="formgrid">
        <div className="field"><label htmlFor={`cn-${cause?.id || "new"}`}>Name</label>
          <input id={`cn-${cause?.id || "new"}`} className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Market Bosworth School PTA" /></div>
        <div className="field"><label htmlFor={`cw-${cause?.id || "new"}`}>Website or donation page <span className="optional">(optional)</span></label>
          <input id={`cw-${cause?.id || "new"}`} className="input" maxLength={300} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" /></div>
        <div className="field full"><label htmlFor={`cd-${cause?.id || "new"}`}>Short description <span className="optional">(optional)</span></label>
          <textarea id={`cd-${cause?.id || "new"}`} className="input" rows={2} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What the money goes towards" /></div>
        <label className="check full"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /><span>Show this cause to sellers</span></label>
      </div>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <div className="row">
        <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}
