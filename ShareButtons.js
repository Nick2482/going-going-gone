"use client";
import { useEffect, useState } from "react";

// Share a lot. On phones this opens the phone's own share menu (WhatsApp, Facebook,
// Messages...). On computers it shows Facebook, WhatsApp and Copy link buttons.
export default function ShareButtons({ path, title, text }) {
  const [url, setUrl] = useState("");
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);

  // Worked out after the page loads, so the server and browser render the same thing first.
  useEffect(() => {
    setUrl(window.location.origin + path);
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches);
  }, [path]);

  async function nativeShare() {
    try { await navigator.share({ title, text, url }); } catch { /* closed the share menu */ }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link:", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!url) return null;
  const message = `${text} ${url}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span className="hint">Share this lot</span>
      <div className="row" style={{ gap: 8 }}>
        {canShare ? (
          <button type="button" className="btn btn-ghost" onClick={nativeShare}>
            <ShareIcon /> Share
          </button>
        ) : (
          <>
            <a className="btn btn-ghost" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">
              <FacebookIcon /> Facebook
            </a>
            <a className="btn btn-ghost" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon /> WhatsApp
            </a>
          </>
        )}
        <button type="button" className="btn btn-ghost" onClick={copy} aria-live="polite">
          <LinkIcon /> {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}

const line = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };

function ShareIcon() {
  return <svg {...line}><path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>;
}
function LinkIcon() {
  return <svg {...line}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>;
}
function FacebookIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4h-3V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z" /></svg>;
}
function WhatsAppIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#25D366" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Z" /><path fill="#fff" d="M17.3 14.6c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.8-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6l.4-.5.3-.5v-.5l-.9-2.1c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 5 4.3 2.4.9 2.9.7 3.4.7.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.5-.3Z" /></svg>;
}
