"use client";
import { useState } from "react";

const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));

// Makes the notification keys right here in your browser, so they never travel anywhere
// except where you paste them (Vercel and Supabase).
export default function PushSetup({ status }) {
  const [keys, setKeys] = useState(null);
  const [copied, setCopied] = useState("");
  const ready = status.publicKey && status.privateKey && status.siteSecret && status.dbSecret;

  async function generate() {
    const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
    const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
    const pub = new Uint8Array([4, ...fromB64url(jwk.x), ...fromB64url(jwk.y)]);
    setKeys({ publicKey: b64url(pub), privateKey: jwk.d, secret: b64url(crypto.getRandomValues(new Uint8Array(32))) });
  }

  async function copy(label, text) {
    try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(""), 2000); } catch {}
  }

  const sql = keys ? `do $$
begin
  if exists (select 1 from vault.secrets where name = 'push_secret') then
    perform vault.update_secret((select id from vault.secrets where name = 'push_secret'), '${keys.secret}');
  else
    perform vault.create_secret('${keys.secret}', 'push_secret');
  end if;
end $$;` : "";

  const Item = ({ label, value }) => (
    <div>
      <div className="row" style={{ gap: 8, marginBottom: 4 }}>
        <strong className="mono">{label}</strong>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(label, value)}>{copied === label ? "Copied ✓" : "Copy"}</button>
      </div>
      <code>{value}</code>
    </div>
  );

  return (
    <div className="push-setup">
      <div className="row" style={{ gap: 6 }}>
        <span className={`pill ${status.publicKey && status.privateKey ? "p-win" : "p-unsold"}`}>Vercel keys {status.publicKey && status.privateKey ? "✓" : "missing"}</span>
        <span className={`pill ${status.siteSecret ? "p-win" : "p-unsold"}`}>Vercel password {status.siteSecret ? "✓" : "missing"}</span>
        <span className={`pill ${status.dbSecret ? "p-win" : "p-unsold"}`}>Supabase password {status.dbSecret ? "✓" : "missing"}</span>
        <span className="hint">{status.people} {status.people === 1 ? "person has" : "people have"} notifications on ({status.devices} device{status.devices === 1 ? "" : "s"})</span>
      </div>
      {ready ? <p className="hint">Everything is set up. Members can switch notifications on in My account.</p> : null}
      {!keys ? (
        <div><button type="button" className={`btn ${ready ? "btn-ghost" : "btn-brass"}`} onClick={generate}>{ready ? "Make new keys (only if you need to start again)" : "Make my notification keys"}</button></div>
      ) : (
        <ol>
          <li>
            In <strong>Vercel → Settings → Environment Variables</strong>, add these three (type each name exactly, paste each value). Make the second and third <strong>Secret</strong>, all for <strong>Production</strong>:
            <div className="push-setup" style={{ marginTop: 8 }}>
              <Item label="NEXT_PUBLIC_VAPID_PUBLIC_KEY" value={keys.publicKey} />
              <Item label="VAPID_PRIVATE_KEY" value={keys.privateKey} />
              <Item label="PUSH_SECRET" value={keys.secret} />
            </div>
          </li>
          <li>
            In <strong>Supabase → SQL Editor → New query</strong>, paste this and press <strong>Run</strong>:
            <div className="row" style={{ gap: 8, margin: "8px 0 4px" }}><button type="button" className="btn btn-ghost btn-sm" onClick={() => copy("sql", sql)}>{copied === "sql" ? "Copied ✓" : "Copy SQL"}</button></div>
            <pre>{sql}</pre>
          </li>
          <li>In Vercel, <strong>Deployments → ⋯ on the top one → Redeploy</strong>. Then come back here: all three ticks should be green.</li>
          <li>Keep this page open until you&apos;ve done all three. These keys aren&apos;t saved anywhere else, and you shouldn&apos;t send them to anyone.</li>
        </ol>
      )}
    </div>
  );
}
