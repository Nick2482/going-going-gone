"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-next";

export default function LoginForm({ next }) {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [inApp, setInApp] = useState(false);
  // On the home-screen app, email links open in the browser instead, so the code is the way in.
  useEffect(() => {
    setInApp(window.matchMedia("(display-mode: standalone)").matches || Boolean(window.navigator.standalone));
  }, []);

  async function send(e) {
    e.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    setBusy(true);
    const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${site}/auth/confirm?next=${encodeURIComponent(next)}`,
        data: name.trim() ? { display_name: name.trim() } : undefined,
      },
    });
    setBusy(false);
    if (err) {
      return setError(/rate|seconds/i.test(err.message) ? "Please wait a minute before asking for another email." : "We couldn't send the email. Check the address and try again.");
    }
    setSent(true);
  }

  async function verify(e) {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code.trim())) return setError("Enter the 6-digit code from the email.");
    setBusy(true);
    const { error: err } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (err) return setError("That code didn't work. It may have expired, so ask for a new email.");
    router.push(safeNext(next));
    router.refresh();
  }

  if (sent) {
    return (
      <form className="stack" onSubmit={verify} noValidate>
        <div className="notice">
          Check your inbox for <strong>{email}</strong>.{" "}
          {inApp ? <>Type the <strong>6-digit code</strong> from the email here. (Tapping the link would open your web browser instead of the app.)</>
            : <>Tap the link in the email, or type the 6-digit code here.</>}
        </div>
        <div className="field">
          <label htmlFor="code">6-digit code</label>
          <input id="code" className="input mono" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} style={{ fontSize: 22, letterSpacing: "0.2em", maxWidth: 200 }} />
        </div>
        {error ? <p className="error" role="alert">{error}</p> : null}
        <div className="row">
          <button className="btn btn-brass" type="submit" disabled={busy}>Sign in</button>
          <button className="link-btn" type="button" onClick={() => { setSent(false); setCode(""); setError(""); }}>Use a different email</button>
        </div>
        <p className="hint">Nothing arrived after a few minutes? Check your spam folder.</p>
      </form>
    );
  }

  return (
    <form className="stack" onSubmit={send} noValidate>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="name">Your name <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>(new accounts only)</span></label>
        <input id="name" className="input" autoComplete="given-name" maxLength={40} placeholder="Shown to other bidders, e.g. Nick H" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <div><button className="btn btn-brass" type="submit" disabled={busy}>{busy ? "Sending…" : "Email me a sign-in link"}</button></div>
      <p className="hint">By signing in you agree to the <a href="/terms">terms</a> and <a href="/privacy">privacy notice</a>.</p>
    </form>
  );
}
