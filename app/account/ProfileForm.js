"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfileForm({ userId, initialName, initialArea, initialAlerts }) {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [area, setArea] = useState(initialArea);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [msg, setMsg] = useState({ kind: "", text: "" });
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    if (name.trim().length < 2) return setMsg({ kind: "error", text: "Your name needs at least 2 characters." });
    setBusy(true);
    const { error } = await supabase.from("profiles")
      .update({ display_name: name.trim(), area: area.trim() || null, email_alerts: alerts })
      .eq("id", userId);
    setBusy(false);
    if (error) return setMsg({ kind: "error", text: "Your details didn't save. Try again." });
    setMsg({ kind: "success", text: "Saved" });
    router.refresh();
  }

  return (
    <form className="panel" onSubmit={save} style={{ marginTop: 20, maxWidth: 680 }} noValidate>
      <div className="formgrid">
        <div className="field">
          <label htmlFor="pname">Name shown to others</label>
          <input id="pname" className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="parea">Your area</label>
          <input id="parea" className="input" maxLength={60} placeholder="e.g. Market Bosworth" value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <label className="full check" htmlFor="palerts">
          <input id="palerts" type="checkbox" checked={alerts} onChange={(e) => setAlerts(e.target.checked)} />
          <span>
            <strong>Email me about my auctions</strong>
            <span className="hint" style={{ display: "block" }}>When I&apos;m outbid, when I win, and when something I&apos;m selling gets a bid or ends.</span>
          </span>
        </label>
      </div>
      <div className="row">
        <button className="btn btn-primary" type="submit" disabled={busy}>Save details</button>
        {msg.text ? <span className={msg.kind}>{msg.text}</span> : null}
      </div>
      <p className="hint">Your email is only shared with the other person when you win or sell a lot, so you can arrange payment and collection.</p>
    </form>
  );
}
