"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function keyBytes(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function environment() {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (ios && !standalone) return "ios-browser";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return "ok";
}

// Switch phone notifications on or off for this device.
// compact: a one-line nudge (lot page) that only shows when notifications are off.
export default function PushToggle({ compact = false }) {
  const supabase = createClient();
  const [state, setState] = useState("loading"); // loading | not-ready | off | on | blocked | ios-browser | unsupported
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [key, setKey] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      // The site's public notification key. None yet means the admin hasn't switched notifications on.
      const { data } = await supabase.rpc("get_push_public_key");
      if (!live) return;
      if (!data) return setState("not-ready");
      setKey(data);
      const env = environment();
      if (env !== "ok") return setState(env);
      if (Notification.permission === "denied") return setState("blocked");
      try {
        const reg = await navigator.serviceWorker.getRegistration("/");
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (live) setState(sub && Notification.permission === "granted" ? "on" : "off");
      } catch {
        if (live) setState("off");
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function turnOn() {
    setBusy(true);
    setMsg("");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "blocked" : "off"); return; }
      // Start fresh, in case this device signed up with an older key.
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
      const j = sub.toJSON();
      const { error } = await supabase.rpc("save_push_subscription", { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth });
      if (error) throw new Error(error.message);
      setState("on");
      setMsg(compact ? "Done! We'll buzz you if you're outbid." : "Notifications are on for this device.");
    } catch (err) {
      setMsg(/sign in/i.test(err?.message || "") ? "Please sign in first." : "That didn't work on this device. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setMsg("");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      setMsg("Notifications are off for this device.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg("");
    const { error } = await supabase.rpc("push_test");
    setBusy(false);
    setMsg(!error ? "Test sent. It should pop up in a few seconds." : /switched on|sign in/i.test(error.message || "") ? error.message : "The test didn't send. Please try again.");
  }

  if (compact) {
    if (state !== "off" && !(state === "on" && msg)) return null;
    return (
      <div className="push-nudge">
        <span aria-hidden="true">🔔</span>
        {state === "on" ? <span>{msg}</span> : (
          <>
            <span>Get a buzz on this device if you&apos;re outbid.</span>
            <button type="button" className="link-btn" onClick={turnOn} disabled={busy}>{busy ? "Turning on…" : "Turn on"}</button>
          </>
        )}
        {msg && state !== "on" ? <span className="error">{msg}</span> : null}
      </div>
    );
  }

  if (state === "loading" || state === "not-ready") return null;
  return (
    <section className="section" id="notifications">
      <h2 className="section-title">Phone notifications</h2>
      <div className="push-card">
        <p>Get a notification the moment you&apos;re outbid, win, sell, or someone asks or replies. It&apos;s set up separately on each phone or computer.</p>
        {state === "unsupported" ? (
          <p className="hint">This browser can&apos;t show notifications. Try Chrome, Edge or Firefox, or the app on your phone.</p>
        ) : state === "ios-browser" ? (
          <p className="hint">On iPhone and iPad, notifications work in the app. First <Link href="/get-the-app">add Going Going Gone to your home screen</Link>, open it from there, then come back to this page.</p>
        ) : state === "blocked" ? (
          <p className="hint">Notifications are blocked for this site. Allow them in your browser or phone settings (Settings &gt; Notifications), then reload this page.</p>
        ) : state === "on" ? (
          <div className="row">
            <span className="pill p-win">On for this device</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={test} disabled={busy}>Send me a test</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={turnOff} disabled={busy}>Turn off</button>
          </div>
        ) : (
          <div><button type="button" className="btn btn-brass" onClick={turnOn} disabled={busy}>{busy ? "Turning on…" : "Turn on notifications"}</button></div>
        )}
        {msg ? <p className="hint" role="status">{msg}</p> : null}
      </div>
    </section>
  );
}
