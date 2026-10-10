"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { gbp, toPence } from "@/lib/format";

function cleanError(error, fallback) {
  const msg = error?.message || "";
  if (msg && !/violates|syntax|permission denied|JWT|fetch/i.test(msg)) return msg;
  return fallback;
}

// Bidding for someone who isn't signed in yet. They enter their bid first, then their
// email, then the 6-digit code from the email, and the bid is placed straight away,
// without ever leaving the lot page. Also handles Buy it now the same way.
// onDone({ kind: "bid" | "buy", data, pence, uid }) lets the lot page show the result.
export default function QuickBid({ lotId, minimum, canBuyNow, buyNowPence, initialBid = null, onDone }) {
  const supabase = createClient();
  const [step, setStep] = useState("amount"); // amount -> email -> code
  const [intent, setIntent] = useState("bid"); // bid or buy
  const [amount, setAmount] = useState(initialBid ? (initialBid / 100).toFixed(2) : "");
  const [pence, setPence] = useState(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    setInApp(window.matchMedia("(display-mode: standalone)").matches || Boolean(window.navigator.standalone));
  }, []);

  function startBid(e) {
    e.preventDefault();
    setError("");
    const p = toPence(amount);
    if (!Number.isFinite(p) || p <= 0) return setError(`Enter an amount in pounds, like ${(minimum / 100).toFixed(2)}.`);
    if (p < minimum) return setError(`Your bid needs to be at least ${gbp(minimum)}.`);
    setIntent("bid");
    setPence(p);
    setStep("email");
  }

  function startBuy() {
    setError("");
    setIntent("buy");
    setPence(buyNowPence);
    setStep("email");
  }

  async function sendCode(e) {
    e.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    setBusy(true);
    const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    // If they tap the link in the email instead, they come back here with their bid filled in, ready to confirm.
    const back = intent === "bid" ? `/lot/${lotId}?bid=${pence}#bid` : `/lot/${lotId}#bid`;
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${site}/auth/confirm?next=${encodeURIComponent(back)}`,
        data: name.trim() ? { display_name: name.trim() } : undefined,
      },
    });
    setBusy(false);
    if (err) {
      return setError(/rate|seconds/i.test(err.message) ? "Please wait a minute before asking for another code." : "We couldn't send the email. Check the address and try again.");
    }
    setStep("code");
  }

  async function confirmCode(e) {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code.trim())) return setError("Enter the 6-digit code from the email.");
    setBusy(true);
    const { data: auth, error: authErr } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    if (authErr || !auth?.user) {
      setBusy(false);
      return setError("That code didn't work. It may have expired, so ask for a new one.");
    }
    const uid = auth.user.id;
    const call = intent === "buy"
      ? supabase.rpc("buy_now", { p_lot: lotId })
      : supabase.rpc("place_bid", { p_lot: lotId, p_amount: pence });
    const { data, error: err } = await call;
    setBusy(false);
    // Signed in either way, so the lot page takes over from here and shows what happened.
    onDone({ kind: intent, data: err ? null : data, pence, uid, error: err ? cleanError(err, intent === "buy" ? "That didn't go through. Try again." : "Your bid didn't go through. Try again.") : "" });
  }

  if (step === "email") {
    return (
      <form className="stack quick-bid" style={{ gap: 12 }} onSubmit={sendCode} noValidate id="bid">
        <div className="panel-note">
          {intent === "buy"
            ? <>Nearly there. Enter your email to buy this for <strong className="num">{gbp(pence)}</strong>.</>
            : <>Nearly there. Enter your email to place your bid of <strong className="num">{gbp(pence)}</strong>.</>}
          {" "}We&apos;ll send you a 6-digit code. There&apos;s no password, and it only takes a moment.
        </div>
        <div className="field">
          <label htmlFor="qb-email">Your email</label>
          <input id="qb-email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="qb-name">Your name <span className="optional">(first time here? Shown to other bidders, e.g. Nick H)</span></label>
          <input id="qb-name" className="input" autoComplete="given-name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {error ? <p className="error" role="alert">{error}</p> : null}
        <div className="row">
          <button className="btn btn-brass btn-lg" type="submit" disabled={busy}>{busy ? "Sending…" : "Email me a code"}</button>
          <button className="link-btn" type="button" onClick={() => { setStep("amount"); setError(""); }}>{intent === "buy" ? "Back" : "Change my bid"}</button>
        </div>
        <p className="hint">By continuing you agree to the <a href="/terms">terms</a> and <a href="/privacy">privacy notice</a>.</p>
      </form>
    );
  }

  if (step === "code") {
    return (
      <form className="stack quick-bid" style={{ gap: 12 }} onSubmit={confirmCode} noValidate id="bid">
        <div className="panel-note">
          We&apos;ve emailed a 6-digit code to <strong>{email.trim()}</strong>. Type it here and
          {intent === "buy" ? <> we&apos;ll complete your purchase for <strong className="num">{gbp(pence)}</strong>.</> : <> we&apos;ll place your bid of <strong className="num">{gbp(pence)}</strong>.</>}
          {inApp ? null : <> (Or tap the link in the email.)</>}
        </div>
        <div className="field">
          <label htmlFor="qb-code">6-digit code</label>
          <input id="qb-code" className="input mono" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} style={{ fontSize: 22, letterSpacing: "0.2em", maxWidth: 200 }} />
        </div>
        {error ? <p className="error" role="alert">{error}</p> : null}
        <div className="row">
          <button className="btn btn-brass btn-lg" type="submit" disabled={busy}>
            {busy ? "Just a moment…" : intent === "buy" ? `Buy it for ${gbp(pence)}` : `Place my ${gbp(pence)} bid`}
          </button>
          <button className="link-btn" type="button" onClick={() => { setStep("email"); setCode(""); setError(""); }}>Use a different email</button>
        </div>
        <p className="hint">Nothing arrived after a minute or two? Check your spam folder.</p>
      </form>
    );
  }

  return (
    <form className="stack" style={{ gap: 10 }} onSubmit={startBid} noValidate id="bid">
      {canBuyNow ? (
        <>
          <button className="btn btn-primary btn-lg btn-block" type="button" onClick={startBuy}>Buy it now for {gbp(buyNowPence)}</button>
          <p className="hint" style={{ textAlign: "center" }}>or place a bid. Buy it now disappears after the first bid.</p>
        </>
      ) : null}
      <div className="bidform">
        <div className="field">
          <label htmlFor="qb-bid">Your maximum bid</label>
          <div className="money">
            <span>£</span>
            <input id="qb-bid" inputMode="decimal" autoComplete="off" placeholder={(minimum / 100).toFixed(2)} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-brass btn-lg" type="submit">Place bid</button>
      </div>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <p className="hint">
        Enter the most you&apos;d pay: <strong className="num">{gbp(minimum)}</strong> or more. We&apos;ll bid for you automatically, only as much as needed to keep you in the lead. Nobody else sees your maximum.
      </p>
      <p className="hint">New here? No problem. All you need is an email address, and you won&apos;t leave this page.</p>
    </form>
  );
}
