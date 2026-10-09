"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DURATIONS, gbp, toPence } from "@/lib/format";

// Shown to the seller when a lot ended without selling.
// Puts it up again in one go: same title, description, category, photos and cause.
export default function RelistLot({ lot, photos, reserve, userId }) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState((lot.start_price_pence / 100).toFixed(2));
  const [res, setRes] = useState(reserve ? (reserve / 100).toFixed(2) : "");
  const [buyNow, setBuyNow] = useState(lot.buy_now_pence ? (lot.buy_now_pence / 100).toFixed(2) : "");
  const [days, setDays] = useState("7");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  // Opened straight from the "didn't sell" email (…/lot/id#relist).
  useEffect(() => {
    if (window.location.hash === "#relist") {
      setOpen(true);
      document.getElementById("relist")?.scrollIntoView({ block: "center" });
    }
  }, []);

  const hadBids = lot.bid_count > 0;
  const tip = hadBids
    ? `Bidding reached ${gbp(lot.current_price_pence)}, so a reserve at or below that would have sold.`
    : "No bids this time. A lower starting price with no reserve often gets the bidding going.";

  async function relist(e) {
    e.preventDefault();
    setError("");
    const pence = toPence(start);
    const reservePence = res.trim() ? toPence(res) : null;
    const buyNowPence = buyNow.trim() ? toPence(buyNow) : null;
    if (!Number.isFinite(pence) || pence < 1) return setError("Set a starting bid, for example 5.00.");
    if (reservePence !== null && (!Number.isFinite(reservePence) || reservePence <= pence)) {
      return setError(`The reserve must be higher than the starting bid of ${gbp(pence)}, or left empty.`);
    }
    if (buyNowPence !== null && (!Number.isFinite(buyNowPence) || buyNowPence <= pence)) {
      return setError(`The Buy it now price must be higher than the starting bid of ${gbp(pence)}, or left empty.`);
    }
    if (buyNowPence !== null && reservePence !== null && reservePence > buyNowPence) {
      return setError("The reserve can't be higher than the Buy it now price.");
    }

    setBusy("Listing it again…");
    const base = {
      title: lot.title,
      description: lot.description || "",
      category: lot.category,
      location: lot.location || null,
      start_price_pence: pence,
      ...(buyNowPence !== null ? { buy_now_pence: buyNowPence } : {}),
      ends_at: new Date(Date.now() + Number(days) * 86400e3).toISOString(),
    };
    const withCause = lot.charity_id ? { ...base, charity_id: lot.charity_id, charity_percent: lot.charity_percent } : base;
    let { data: fresh, error: lotErr } = await supabase.from("lots").insert(withCause).select("id").single();
    let causeDropped = false;
    if (lotErr && lot.charity_id && /cause/i.test(lotErr.message || "")) {
      // The cause has since been taken off the list: relist without it.
      ({ data: fresh, error: lotErr } = await supabase.from("lots").insert(base).select("id").single());
      causeDropped = !lotErr;
    }
    if (lotErr) {
      setBusy("");
      const msg = lotErr.message || "";
      return setError(/up to 20 lots|suspended/i.test(msg) ? msg : "It didn't relist. Check your connection and try again.");
    }

    let reserveFailed = false;
    if (reservePence !== null) {
      const { error: resErr } = await supabase.from("lot_reserves").insert({ lot_id: fresh.id, reserve_pence: reservePence });
      reserveFailed = Boolean(resErr);
    }

    // Copy the photos into the new lot's own folder, so each lot keeps its own.
    setBusy("Copying photos…");
    let cover = null;
    let first = null;
    for (let i = 0; i < photos.length; i++) {
      const to = `${userId}/${fresh.id}/${crypto.randomUUID()}.jpg`;
      const { error: cpErr } = await supabase.storage.from("lot-photos").copy(photos[i].path, to);
      if (cpErr) continue;
      const { error: rowErr } = await supabase.from("lot_photos").insert({ lot_id: fresh.id, path: to, position: i });
      if (rowErr) { await supabase.storage.from("lot-photos").remove([to]); continue; }
      if (!first) first = to;
      if (photos[i].path === lot.cover_path) cover = to;
    }
    cover = cover || first;
    if (cover) await supabase.from("lots").update({ cover_path: cover }).eq("id", fresh.id);

    // Bring the video along too, if there was one.
    if (lot.video_path) {
      setBusy("Copying the video…");
      const ext = lot.video_path.endsWith(".webm") ? "webm" : "mp4";
      const to = `${userId}/${fresh.id}/video-${crypto.randomUUID()}.${ext}`;
      const { error: vErr } = await supabase.storage.from("lot-photos").copy(lot.video_path, to);
      if (!vErr) {
        const { error: vRow } = await supabase.from("lots").update({ video_path: to }).eq("id", fresh.id);
        if (vRow) await supabase.storage.from("lot-photos").remove([to]);
      }
    }

    const qs = ["new=1", reserveFailed ? "reserve=failed" : "", causeDropped ? "cause=dropped" : ""].filter(Boolean).join("&");
    router.push(`/lot/${fresh.id}?${qs}`);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="relist" id="relist">
        <p className="hint" style={{ margin: 0 }}>{tip}</p>
        <button type="button" className="btn btn-brass btn-block" onClick={() => setOpen(true)}>Relist this item</button>
      </div>
    );
  }

  return (
    <form className="relist relist-open" id="relist" onSubmit={relist} noValidate>
      <div className="relist-title">Relist “{lot.title}”</div>
      <p className="hint" style={{ margin: 0 }}>Same title, description, photos{lot.video_path ? ", video" : ""}{lot.charity_id ? ", and the same local cause" : ""}. {tip}</p>
      <div className="relist-grid">
        <div className="field">
          <label htmlFor="rl-start">Starting bid</label>
          <div className="money"><span>£</span><input id="rl-start" inputMode="decimal" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        </div>
        <div className="field">
          <label htmlFor="rl-days">Auction length</label>
          <select id="rl-days" className="input" value={days} onChange={(e) => setDays(e.target.value)}>
            {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="rl-res">Reserve <span className="hint">(optional)</span></label>
          <div className="money"><span>£</span><input id="rl-res" inputMode="decimal" placeholder="None" value={res} onChange={(e) => setRes(e.target.value)} /></div>
        </div>
        <div className="field">
          <label htmlFor="rl-bin">Buy it now <span className="hint">(optional)</span></label>
          <div className="money"><span>£</span><input id="rl-bin" inputMode="decimal" placeholder="None" value={buyNow} onChange={(e) => setBuyNow(e.target.value)} /></div>
        </div>
      </div>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <div className="row">
        <button type="submit" className="btn btn-brass" disabled={Boolean(busy)}>{busy || "Relist now"}</button>
        <button type="button" className="btn btn-ghost" disabled={Boolean(busy)} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
