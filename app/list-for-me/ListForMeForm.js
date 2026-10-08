"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function friendly(err, fallback) {
  const msg = err?.message || "";
  if (msg && !/violates|syntax|permission denied|JWT|fetch/i.test(msg)) return msg;
  return fallback;
}

// The request form. Works without an account.
export default function ListForMeForm() {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [area, setArea] = useState("");
  const [items, setItems] = useState("");
  const [bestTime, setBestTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Please tell us your name.");
    if (!phone.trim() && !email.trim()) return setError("Please give us a phone number or an email address so we can get in touch.");
    if (items.trim().length < 5) return setError("Tell us a little about what you'd like to sell.");
    setBusy(true);
    const { error: err } = await supabase.rpc("request_listing_help", {
      p_name: name, p_phone: phone, p_email: email, p_area: area, p_items: items, p_best_time: bestTime,
    });
    setBusy(false);
    if (err) return setError(friendly(err, "Your request didn't send. Please check your connection and try again."));
    setSentTo(name.trim().split(" ")[0]);
  }

  if (sentTo) {
    return (
      <div className="form-card help-done" role="status">
        <strong>Thank you, {sentTo}.</strong>
        <p>We&apos;ve got your request and we&apos;ll be in touch soon to arrange a time. There&apos;s nothing else you need to do for now.</p>
      </div>
    );
  }

  return (
    <form className="form-card stack" style={{ gap: 18 }} onSubmit={submit} noValidate>
      <div className="formgrid">
        <div className="field">
          <label htmlFor="h-name">Your name</label>
          <input id="h-name" className="input" autoComplete="name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="h-area">Village or town</label>
          <input id="h-area" className="input" maxLength={60} placeholder="e.g. Market Bosworth" value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="h-phone">Phone number</label>
          <input id="h-phone" className="input" type="tel" autoComplete="tel" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="h-email">Email <span className="hint">(or just a phone number)</span></label>
          <input id="h-email" className="input" type="email" autoComplete="email" maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field full">
          <label htmlFor="h-items">What would you like to sell?</label>
          <textarea id="h-items" className="input" rows={4} maxLength={1000} placeholder="e.g. An oak dresser, a box of china and some garden tools from the shed." value={items} onChange={(e) => setItems(e.target.value)} />
        </div>
        <div className="field full">
          <label htmlFor="h-time">Best time to get in touch <span className="hint">(optional)</span></label>
          <input id="h-time" className="input" maxLength={120} placeholder="e.g. Weekday mornings" value={bestTime} onChange={(e) => setBestTime(e.target.value)} />
        </div>
      </div>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <div><button className="btn btn-brass" type="submit" disabled={busy}>{busy ? "Sending…" : "Send my request"}</button></div>
    </form>
  );
}
