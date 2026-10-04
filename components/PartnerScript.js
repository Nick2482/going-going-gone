"use client";
import { useEffect, useState } from "react";

// Travelpayouts' partner script, used only on the Cheap flights page and only
// after the visitor agrees, because it may set cookies to credit bookings.
// The choice is remembered in this browser.
const KEY = "gg-flights-partner";
const SRC = "https://emrldtp.cc/NTgxMzY1.js?t=581365";

function load() {
  if (document.querySelector(`script[src="${SRC}"]`)) return;
  const s = document.createElement("script");
  s.async = true;
  s.setAttribute("data-cmp-ab", "2");
  s.src = SRC;
  document.head.appendChild(s);
}

export default function PartnerScript() {
  const [choice, setChoice] = useState(null); // null = not loaded yet, "" = not asked
  useEffect(() => {
    let c = "";
    try { c = localStorage.getItem(KEY) || ""; } catch { /* storage blocked */ }
    setChoice(c);
    if (c === "yes") load();
  }, []);

  function decide(yes) {
    try { localStorage.setItem(KEY, yes ? "yes" : "no"); } catch { /* storage blocked */ }
    setChoice(yes ? "yes" : "no");
    if (yes) load();
  }

  if (choice !== "") return null;
  return (
    <div className="partner-ask" role="region" aria-label="Cookie choice for flight deals">
      <p>
        <strong>Help local causes?</strong> Our flights partner, Travelpayouts, uses cookies on this page so that if you book,
        the commission is credited to us and passed to local causes. It isn&apos;t used anywhere else on Going Going Gone.
      </p>
      <div className="row">
        <button type="button" className="btn btn-brass btn-sm" onClick={() => decide(true)}>Allow on this page</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => decide(false)}>No thanks</button>
      </div>
    </div>
  );
}
