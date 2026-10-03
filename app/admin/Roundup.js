"use client";
import { useMemo, useState } from "react";
import { GROUP_NAME, GROUP_URL, SITE_URL } from "@/lib/site";

const money = (p) => "£" + (p % 100 ? (p / 100).toFixed(2) : String(p / 100));
const endDay = (iso) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" });

function line(l) {
  const heart = l.charity_percent ? " ❤️" : "";
  const price = l.bid_count ? `${money(l.current_price_pence)} (${l.bid_count} bid${l.bid_count === 1 ? "" : "s"})` : `starts at ${money(l.current_price_pence)}`;
  return `• ${l.title}${heart}: ${price}, ends ${endDay(l.ends_at)}\n  ${SITE_URL}/lot/${l.id}`;
}

// Writes a ready-to-paste weekly post for the Facebook group.
export default function Roundup({ ending, fresh }) {
  const [copied, setCopied] = useState(false);
  const initial = useMemo(() => {
    const endingIds = new Set(ending.map((l) => l.id));
    const newOnes = fresh.filter((l) => !endingIds.has(l.id)).slice(0, 5);
    const parts = [
      "🔨 This week on Going Going Gone",
      "Local auctions for Market Bosworth and the villages around. Free to list, free to bid, collect locally.",
    ];
    if (ending.length) parts.push("⏰ Ending soon\n" + ending.map(line).join("\n"));
    if (newOnes.length) parts.push("🆕 Just listed\n" + newOnes.map(line).join("\n"));
    if ([...ending, ...newOnes].some((l) => l.charity_percent)) parts.push("❤️ = charity lot: some or all of the money goes to a local cause.");
    parts.push(`👉 See everything and start bidding: ${SITE_URL}\nGot something to sell? List it in two minutes: ${SITE_URL}/sell`);
    return parts.join("\n\n");
  }, [ending, fresh]);
  const [text, setText] = useState(initial);

  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 4000); }
    catch { window.prompt("Copy this post:", text); }
  }

  if (!ending.length && !fresh.length) return <div className="empty">No running lots yet, so there&apos;s nothing to round up.</div>;

  return (
    <div className="panel roundup">
      <p className="hint">A ready-made post for {GROUP_NAME}. Edit it if you like, copy it, then paste it into a new post in the group (pin it so it stays at the top).</p>
      <label htmlFor="roundup" className="visually-hidden">Weekly round-up post</label>
      <textarea id="roundup" className="input mono roundup-text" rows={14} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={copy}>{copied ? "Copied!" : "Copy post"}</button>
        <a className="btn btn-fb" href={GROUP_URL} target="_blank" rel="noopener noreferrer">Open the group</a>
        <button type="button" className="btn btn-ghost" onClick={() => setText(initial)}>Start again</button>
      </div>
    </div>
  );
}
