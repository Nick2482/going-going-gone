"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "gg-install-dismissed";
const WAIT_DAYS = 30;

function dismissedRecently() {
  try {
    const t = Number(localStorage.getItem(KEY) || 0);
    return t && Date.now() - t < WAIT_DAYS * 864e5;
  } catch {
    return false;
  }
}

// A small banner on phones suggesting adding the site to the home screen.
// Android: uses the phone's own "Install" prompt. iPhone: explains the Share button.
// Never shown inside the installed app, on computers, or for 30 days after "Not now".
export default function InstallPrompt() {
  const [mode, setMode] = useState(null); // null | "android" | "ios"
  const [promptEvent, setPromptEvent] = useState(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (standalone || dismissedRecently()) return;
    const path = window.location.pathname;
    if (path.startsWith("/get-the-app") || path.startsWith("/login") || path.startsWith("/admin")) return;

    const onPrompt = (e) => {
      e.preventDefault();
      setPromptEvent(e);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const ua = window.navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|FBAN|FBAV|Instagram/.test(ua);
    let t;
    if (isIOS && isSafari) t = setTimeout(() => setMode("ios"), 6000);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); clearTimeout(t); };
  }, []);

  function dismiss() {
    try { localStorage.setItem(KEY, String(Date.now())); } catch {}
    setMode(null);
  }

  async function install() {
    if (!promptEvent) return;
    promptEvent.prompt();
    try { await promptEvent.userChoice; } catch {}
    setPromptEvent(null);
    dismiss();
  }

  if (!mode) return null;

  return (
    <div className="install" role="dialog" aria-label="Add Going Going Gone to your home screen">
      <img src="/icon-192.png" alt="" width="44" height="44" className="install-icon" />
      <div className="install-text">
        <strong>Add Going Going Gone to your phone</strong>
        {mode === "ios" ? (
          <span>Tap <ShareGlyph /> <b>Share</b> below, then <b>Add to Home Screen</b>.</span>
        ) : (
          <span>Opens like an app, straight from your home screen.</span>
        )}
      </div>
      <div className="install-actions">
        {mode === "android" ? <button type="button" className="btn btn-brass btn-sm" onClick={install}>Install</button>
          : <Link href="/get-the-app" className="btn btn-light btn-sm" onClick={dismiss}>How?</Link>}
        <button type="button" className="install-close" onClick={dismiss}>Not now</button>
      </div>
    </div>
  );
}

function ShareGlyph() {
  return (
    <svg width="14" height="16" viewBox="0 0 14 18" aria-hidden="true" style={{ verticalAlign: "-2px" }}>
      <path d="M7 1v11M3.5 4.5 7 1l3.5 3.5M2 8H1v9h12V8h-1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
