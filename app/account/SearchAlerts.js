"use client";
import { useState } from "react";
import Link from "next/link";
import { BellIcon } from "@/components/Icons";
import { createClient } from "@/lib/supabase/client";
import { gbp } from "@/lib/format";

export function alertLabel(a) {
  const parts = [a.query ? `“${a.query}”` : null, a.category || null, a.charity_only ? "charity lots" : null].filter(Boolean);
  return parts.join(" in ") + (a.max_price_pence ? ` up to ${gbp(a.max_price_pence)}` : "");
}

function alertHref(a) {
  const qs = new URLSearchParams();
  if (a.query) qs.set("q", a.query);
  if (a.category) qs.set("cat", a.category);
  if (a.charity_only) qs.set("charity", "1");
  return `/?${qs.toString()}#lots`;
}

export default function SearchAlerts({ initial, alertsOn }) {
  const supabase = createClient();
  const [alerts, setAlerts] = useState(initial);
  const [error, setError] = useState("");

  async function remove(id) {
    setError("");
    const { error: err } = await supabase.from("saved_searches").delete().eq("id", id);
    if (err) return setError("That didn't work. Please try again.");
    setAlerts((xs) => xs.filter((a) => a.id !== id));
  }

  return (
    <section className="section" id="alerts">
      <h2 className="section-title">Search alerts</h2>
      {!alertsOn && alerts.length ? (
        <p className="notice" style={{ marginBottom: 12 }}>Your email alerts are switched off above, so these won&apos;t be sent until you switch them back on.</p>
      ) : null}
      {alerts.length ? (
        <ul className="alert-list">
          {alerts.map((a) => (
            <li key={a.id} className="alert-item">
              <BellIcon size={17} />
              <Link href={alertHref(a)} className="alert-what">{alertLabel(a)}</Link>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(a.id)}>Remove</button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty">Search for something or pick a category, then tap <strong>Email me new matches</strong>. We&apos;ll email you when a matching lot is listed.</div>
      )}
      {error ? <p className="error" role="alert">{error}</p> : null}
    </section>
  );
}
