"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { gbp, increment, lotNumber, MAX_PHOTOS, nextMinimum, photoUrl, toPence, when } from "@/lib/format";
import { compressPhoto, uploadLotPhotos } from "@/lib/photos";
import { StagePill, TimeLeft } from "@/components/Clock";

function cleanError(error, fallback) {
  const msg = error?.message || "";
  // Messages raised by our own database functions are written for people; pass them on.
  if (msg && !/violates|syntax|permission denied|JWT|fetch/i.test(msg)) return msg;
  return fallback;
}

export default function LotLive({ initialLot, initialPhotos, initialBids, userId }) {
  const supabase = createClient();
  const router = useRouter();
  const [lot, setLot] = useState(initialLot);
  const [photos, setPhotos] = useState(initialPhotos);
  const [bids, setBids] = useState(initialBids);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const [amount, setAmount] = useState("");
  const [bidMsg, setBidMsg] = useState({ kind: "", text: "" });
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [photoErr, setPhotoErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [contact, setContact] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportMsg, setReportMsg] = useState("");
  const names = useRef(Object.fromEntries(initialBids.map((b) => [b.bidder_id, b.bidder?.display_name])));

  const ended = new Date(lot.ends_at).getTime() <= now;
  const isSeller = userId && userId === lot.seller_id;
  const isWinner = ended && userId && lot.high_bidder_id === userId;
  const leading = !ended && userId && lot.high_bidder_id === userId;
  const minimum = nextMinimum(lot);
  const iBid = userId && bids.some((b) => b.bidder_id === userId);

  // Clock for the "ended" switch-over.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const refreshBids = useCallback(async () => {
    const { data } = await supabase
      .from("bids")
      .select("id, amount_pence, created_at, bidder_id, bidder:profiles(display_name)")
      .eq("lot_id", lot.id)
      .order("amount_pence", { ascending: false })
      .limit(100);
    if (data) {
      data.forEach((b) => { names.current[b.bidder_id] = b.bidder?.display_name; });
      setBids(data);
    }
  }, [supabase, lot.id]);

  // Live updates: new bids and price / end-time changes appear without refreshing.
  useEffect(() => {
    const channel = supabase
      .channel(`lot-${lot.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "lots", filter: `id=eq.${lot.id}` },
        (payload) => setLot((prev) => ({ ...prev, ...payload.new })))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bids", filter: `lot_id=eq.${lot.id}` },
        () => refreshBids())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, lot.id, refreshBids]);

  // Once the auction ends, the seller and winner can see each other's contact details.
  useEffect(() => {
    if (!ended || !userId || !lot.high_bidder_id || !(isSeller || isWinner) || contact) return;
    supabase.rpc("sale_contact", { p_lot: lot.id }).then(({ data }) => { if (data?.[0]) setContact(data[0]); });
  }, [ended, userId, isSeller, isWinner, lot.id, lot.high_bidder_id, contact, supabase]);

  async function placeBid(e) {
    e.preventDefault();
    setBidMsg({ kind: "", text: "" });
    const pence = toPence(amount);
    if (!Number.isFinite(pence) || pence <= 0) return setBidMsg({ kind: "error", text: `Enter an amount in pounds, like ${(minimum / 100).toFixed(2)}.` });
    if (pence < minimum) return setBidMsg({ kind: "error", text: `Your bid needs to be at least ${gbp(minimum)}.` });
    setBusy(true);
    const { data, error } = await supabase.rpc("place_bid", { p_lot: lot.id, p_amount: pence });
    setBusy(false);
    if (error) return setBidMsg({ kind: "error", text: cleanError(error, "Your bid didn't go through. Try again.") });
    if (data) setLot((prev) => ({ ...prev, ...data }));
    setAmount("");
    setBidMsg({ kind: "success", text: `Bid of ${gbp(pence)} placed. You're the highest bidder.` });
    refreshBids();
  }

  async function endNow() {
    setBusy(true);
    const { error } = await supabase.rpc("end_lot_now", { p_lot: lot.id });
    setBusy(false);
    setConfirm(null);
    if (error) return setBidMsg({ kind: "error", text: cleanError(error, "Couldn't end the auction.") });
    setLot((prev) => ({ ...prev, ends_at: new Date().toISOString() }));
    router.refresh();
  }

  async function removeLot() {
    setBusy(true);
    const { error } = await supabase.rpc("remove_lot", { p_lot: lot.id });
    setBusy(false);
    if (error) { setConfirm(null); return setBidMsg({ kind: "error", text: cleanError(error, "Couldn't remove the listing.") }); }
    router.push("/account");
    router.refresh();
  }

  async function addPhotos(e) {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    setPhotoErr("");
    const room = MAX_PHOTOS - photos.length;
    const errs = [];
    if (files.length > room) errs.push(`Only ${MAX_PHOTOS} photos per lot, so some were left out.`);
    setUploading(true);
    try {
      const blobs = [];
      for (const f of files.slice(0, room)) {
        try { blobs.push(await compressPhoto(f)); } catch (err) { errs.push(err.message); }
      }
      const start = photos.length ? Math.max(...photos.map((p) => p.position)) + 1 : 0;
      const paths = await uploadLotPhotos(supabase, { userId, lotId: lot.id, blobs, startPosition: start });
      if (paths.length && !lot.cover_path) {
        await supabase.from("lots").update({ cover_path: paths[0] }).eq("id", lot.id);
        setLot((prev) => ({ ...prev, cover_path: paths[0] }));
      }
    } catch (err) {
      errs.push(err.message);
    }
    const { data } = await supabase.from("lot_photos").select("id, path, position").eq("lot_id", lot.id).order("position").order("created_at");
    if (data) setPhotos(data);
    setUploading(false);
    setPhotoErr(errs.join(" "));
  }

  async function removePhoto(k) {
    const p = photos[k];
    if (!p) return;
    const { error } = await supabase.from("lot_photos").delete().eq("id", p.id);
    if (error) return setPhotoErr("Couldn't remove that photo.");
    await supabase.storage.from("lot-photos").remove([p.path]);
    const rest = photos.filter((_, j) => j !== k);
    setPhotos(rest);
    setPhotoIdx(0);
    if (lot.cover_path === p.path) {
      const cover = rest[0]?.path ?? null;
      await supabase.from("lots").update({ cover_path: cover }).eq("id", lot.id);
      setLot((prev) => ({ ...prev, cover_path: cover }));
    }
  }

  async function sendReport(e) {
    e.preventDefault();
    if (reportText.trim().length < 3) return setReportMsg("Tell us briefly what's wrong.");
    const { error } = await supabase.from("reports").insert({ lot_id: lot.id, reason: reportText.trim() });
    if (error && error.code !== "23505") return setReportMsg("Your report didn't send. Try again.");
    setReportMsg("Thanks. We'll take a look.");
    setReportText("");
  }

  const current = photos[Math.min(photoIdx, Math.max(0, photos.length - 1))];
  const mainSrc = current ? photoUrl(current.path) : photoUrl(lot.cover_path);
  const canEditPhotos = isSeller && !ended && lot.status === "live";
  const priceLabel = ended ? (lot.bid_count ? "Hammer price" : "Started at") : (lot.bid_count ? "Current bid" : "Starting bid");
  const bidderName = (id) => (id === userId ? "You" : names.current[id] || "A bidder");

  return (
    <div className="lot-page">
      <div className="gallery">
        {mainSrc
          ? <img className="g-main" src={mainSrc} alt={`Photo of ${lot.title}`} />
          : <div className="lot-noimg" style={{ borderRadius: 10, border: "1px solid var(--line)" }} aria-hidden="true">{lot.category.slice(0, 1)}</div>}
        {(photos.length > 1 || canEditPhotos) ? (
          <div className="g-strip">
            {photos.map((p, k) => (
              <span key={p.id} className="g-thumb" aria-current={k === photoIdx}>
                <button type="button" onClick={() => setPhotoIdx(k)} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%", height: "100%" }} aria-label={`Show photo ${k + 1}`}>
                  <img src={photoUrl(p.path)} alt="" />
                </button>
                {canEditPhotos ? <button type="button" className="g-del" onClick={() => removePhoto(k)} aria-label={`Remove photo ${k + 1}`}>×</button> : null}
              </span>
            ))}
            {canEditPhotos && photos.length < MAX_PHOTOS ? (
              <label className="addph">
                {uploading ? "Adding…" : <>+ Add<br />photo</>}
                <input type="file" accept="image/*" multiple onChange={addPhotos} disabled={uploading} />
              </label>
            ) : null}
          </div>
        ) : null}
        {photoErr ? <p className="error">{photoErr}</p> : null}
      </div>

      <div className="stack">
        <div className="row" style={{ gap: 8 }}>
          <span className="lotno">LOT {lotNumber(lot.lot_no)} · {lot.category}</span>
        </div>
        <h1 className="lot-h1">{lot.title}</h1>
        <div className="row" style={{ gap: 8 }}>
          {lot.status === "removed" ? <span className="pill p-unsold">Withdrawn</span> : <StagePill endsAt={lot.ends_at} bidCount={lot.bid_count} />}
          {leading ? <span className="pill p-win">Highest bidder</span> : null}
          {!ended && iBid && !leading ? <span className="pill p-out">Outbid</span> : null}
          <TimeLeft endsAt={lot.ends_at} className="time mono" />
        </div>

        <div className="stats">
          <div><div className="label">{priceLabel}</div><div className="v">{gbp(lot.current_price_pence)}</div></div>
          <div><div className="label">Bids</div><div className="v">{lot.bid_count}</div></div>
          <div>
            <div className="label">Seller</div>
            <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {isSeller ? "You" : initialLot.seller?.display_name || "A seller"}
            </div>
          </div>
        </div>

        {/* What you can do */}
        {lot.status === "removed" ? (
          <div className="panel"><p>You withdrew this listing. Only you can see it.</p></div>
        ) : ended ? (
          <div className="panel panel-brass">
            {lot.bid_count ? (
              <>
                <p className="stamp" style={{ fontWeight: 700, fontSize: 18 }}>
                  Sold to {bidderName(lot.high_bidder_id)} for <span className="mono">{gbp(lot.current_price_pence)}</span>
                </p>
                {isWinner ? <p>You won this lot. Contact the seller to arrange payment and collection.</p> : null}
                {isSeller ? <p>Your item sold. Contact the buyer to arrange payment and collection.</p> : null}
                {contact ? (
                  <p>
                    {contact.role === "seller" ? "Seller" : "Buyer"}: <strong>{contact.display_name}</strong>
                    {" · "}<a href={`mailto:${contact.email}?subject=${encodeURIComponent("Going Going Gone: " + lot.title)}`}>{contact.email}</a>
                  </p>
                ) : null}
                {(isWinner || isSeller) ? <p className="hint">Meet somewhere public, check the item before paying, and never pay by bank transfer to someone you haven&apos;t met.</p> : null}
              </>
            ) : <p>This lot closed without any bids.</p>}
          </div>
        ) : isSeller ? (
          <div className="panel">
            <p>This is your listing, so you can&apos;t bid on it.</p>
            {confirm === "end" ? (
              <div className="confirm">
                <span>End the auction now? {lot.bid_count ? "The current highest bidder wins." : "It will close unsold."}</span>
                <button className="btn btn-danger" type="button" onClick={endNow} disabled={busy}>End now</button>
                <button className="btn btn-ghost" type="button" onClick={() => setConfirm(null)}>Keep it running</button>
              </div>
            ) : confirm === "remove" ? (
              <div className="confirm">
                <span>Withdraw this listing?</span>
                <button className="btn btn-danger" type="button" onClick={removeLot} disabled={busy}>Withdraw</button>
                <button className="btn btn-ghost" type="button" onClick={() => setConfirm(null)}>Keep it</button>
              </div>
            ) : (
              <div className="row">
                <button className="btn btn-ghost" type="button" onClick={() => setConfirm("end")}>End auction early</button>
                {lot.bid_count === 0 ? <button className="btn btn-danger" type="button" onClick={() => setConfirm("remove")}>Withdraw listing</button> : null}
              </div>
            )}
            {bidMsg.text ? <p className={bidMsg.kind}>{bidMsg.text}</p> : null}
          </div>
        ) : !userId ? (
          <div className="panel">
            <p>Sign in to bid. It takes a minute and all you need is an email address.</p>
            <div><Link className="btn btn-brass" href={`/login?next=/lot/${lot.id}`}>Sign in to bid</Link></div>
          </div>
        ) : (
          <form className="panel" onSubmit={placeBid} noValidate>
            <div className="bidform">
              <div className="field">
                <label htmlFor="bid">Your bid</label>
                <div className="money">
                  <span>£</span>
                  <input id="bid" inputMode="decimal" autoComplete="off" placeholder={(minimum / 100).toFixed(2)}
                    value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
              </div>
              <button className="btn btn-brass" type="submit" disabled={busy}>{leading ? "Raise my bid" : "Place bid"}</button>
            </div>
            <p className="hint">
              Enter <span className="mono">{gbp(minimum)}</span> or more.
              {lot.bid_count ? <> Bids go up in steps of {gbp(increment(lot.current_price_pence))}.</> : null}
              {" "}A bid in the last 2 minutes adds 2 minutes to the clock.
            </p>
            {bidMsg.text ? <p className={bidMsg.kind}>{bidMsg.text}</p> : null}
          </form>
        )}

        {lot.location ? <p><span className="label">Collection from</span><br />{lot.location}</p> : null}
        {lot.description ? <div><div className="label" style={{ marginBottom: 6 }}>Description</div><p className="desc">{lot.description}</p></div> : null}

        <div>
          <div className="label" style={{ marginBottom: 8 }}>Bid history</div>
          {bids.length ? (
            <div className="hist">
              {bids.map((b, k) => (
                <div key={b.id} className={`hist-row${k === 0 ? " top" : ""}`}>
                  <span className="who">{bidderName(b.bidder_id)}</span>
                  <span className="when">{when(b.created_at)}</span>
                  <span className="mono" style={{ fontWeight: 600 }}>{gbp(b.amount_pence)}</span>
                </div>
              ))}
            </div>
          ) : <p className="hint">No bids yet. Starting bid is <span className="mono">{gbp(lot.start_price_pence)}</span>.</p>}
        </div>

        {userId && !isSeller && lot.status === "live" ? (
          <div>
            {reportOpen ? (
              <form className="stack" style={{ gap: 8 }} onSubmit={sendReport}>
                <label className="label" htmlFor="report">What&apos;s wrong with this listing?</label>
                <textarea id="report" className="input" style={{ minHeight: 80 }} maxLength={1000} value={reportText} onChange={(e) => setReportText(e.target.value)} />
                <div className="row">
                  <button className="btn btn-ghost" type="submit">Send report</button>
                  <button className="link-btn" type="button" onClick={() => { setReportOpen(false); setReportMsg(""); }}>Cancel</button>
                </div>
                {reportMsg ? <p className="hint">{reportMsg}</p> : null}
              </form>
            ) : <button className="link-btn" type="button" onClick={() => setReportOpen(true)}>Report this listing</button>}
          </div>
        ) : null}
      </div>
    </div>
  );
}
