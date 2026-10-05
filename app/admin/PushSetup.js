"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));

// One button: makes the site's notification keys in this browser and stores them
// safely in Supabase Vault. Nothing to copy, nothing to paste.
export default function PushSetup({ status }) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const on = status.keysSaved;

  async function switchOn() {
    if (on && !window.confirm("Make new keys? Everyone who has notifications on will need to turn them on again. Only do this if something's gone wrong.")) return;
    setBusy(true);
    setError("");
    try {
      const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
      const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
      const publicKey = b64url(new Uint8Array([4, ...fromB64url(jwk.x), ...fromB64url(jwk.y)]));
      const { error: err } = await supabase.rpc("admin_enable_push", { p_public: publicKey, p_private: jwk.d });
      if (err) throw new Error(err.message);
      router.refresh();
    } catch (err) {
      setError(err?.message?.includes("function") ? "Run the latest SQL update in Supabase first, then try again." : err?.message || "That didn't work. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="push-setup">
      {on ? (
        <>
          <div className="row" style={{ gap: 8 }}>
            <span className="pill p-win">On ✓</span>
            <span className="hint">{status.people} {status.people === 1 ? "person has" : "people have"} notifications on ({status.devices} device{status.devices === 1 ? "" : "s"}).</span>
          </div>
          <p className="hint">Members switch them on in My account. Try it yourself there, then press <strong>Send me a test</strong>.</p>
          <div><button type="button" className="btn btn-ghost btn-sm" onClick={switchOn} disabled={busy}>{busy ? "Working…" : "Make new keys (only if something's wrong)"}</button></div>
        </>
      ) : (
        <>
          <p>Phone notifications are ready to go. Press the button and they&apos;re switched on for the whole site. Members can then turn them on in My account.</p>
          <div><button type="button" className="btn btn-brass" onClick={switchOn} disabled={busy}>{busy ? "Switching on…" : "Switch on phone notifications"}</button></div>
        </>
      )}
      {error ? <p className="error" role="alert">{error}</p> : null}
    </div>
  );
}
