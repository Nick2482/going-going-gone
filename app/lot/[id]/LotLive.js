"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { gbp, increment, lotNumber, MAX_PHOTOS, nextMinimum, photoUrl, RESERVE_LABEL, toPence, when } from "@/lib/format";
import { compressPhoto, uploadLotPhotos } from "@/lib/photos";
import { StagePill, TimeLeft } from "@/components/Clock";
import { PhotoIcon, PinIcon } from "@/components/Icons";
import ShareButtons from "@/components/ShareButtons";

function cleanError(error, fallback) {
  const msg = error?.message || "";
  // Messages raised by our own database functions are written for people; pass them on.
  if (msg && !/violates|syntax|permission denied|JWT|fetch/i.test(msg)) return msg;
  return fallback;
}

export default function LotLive({ initialLot, initialPhotos, initialBids, initialReserve, userId }) {
  const supabase = createClient();
  const router = useRouter();
  const [lot, setLot] = useState(initialLot);
  const [photos, setPhotos] = useState(initialPhotos);
  const [bids, setBids] = useState(initialBids);
  const [reserve, setReserve] = useState(initialReserve);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const [amount, setAmount] = useState("");
  const [bidMsg, setBidMsg] = useState({ kind: "", text: "" });
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [photoErr, setPhotoErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [contact, setContact] = useState(null);
  const [reserveEdit, setReserveEdit] = useState(false);
  const [reserveText, setReserveText] = useState(initialReserve ? (initialReserve / 100).toFixed(2) : "");
  const [reserveMsg, setReserveMsg] = useState({ kind: "", text: "" });
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportMsg, setReportMsg] = useState("");
  const names = useRef(Object.fromEntries(initialBids.map((b) => [b.bidder_id, b.bidder?.display_name])));

  const ended = new Date(lot.ends_at).getTime() <= now;
  const reserveNotMet = lot.reserve_status === "not_met";
  const sold = ended && lot.bid_count > 0 && !reserveNotMet;
  const isSeller = userId && userId === lot.seller_id;
  const isWinner = sold && userId && lot.high_bidder_id === userId;
  const leading = !ended && userId && lot.high_bidder_id === userId;
  const minimum = nextMinimum(lot);
  const iBid = userId && bids.some((b) => b.bidder_id === userId);
  // Buy it now is only offered until the first bid.
  const canBuyNow = !ended && lot.status === "live" && lot.buy_now_pence && lot.bid_count === 0;

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

  // Live updates: new bids and price / end-time / reserve changes appear without refreshing.
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

  // Once a lot sells, the seller and winner can see each other's contact details.
  useEffect(() => {
    if (!sold || !userId || !(isSeller || isWinner) || contact) return;
    supabase.rpc("sale_contact", { p_lot: lot.id }).then(({ data }) => { if (data?.[0]) setContact(data[0]); });
  }, [sold, userId, isSeller, isWinner, lot.id, contact, supabase]);

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
    const stillBelow = data?.reserve_status === "not_met";
    setBidMsg({ kind: "success", text: stillBelow
      ? `Bid of ${gbp(pence)} placed. You're the highest bidder, but the reserve hasn't been met yet.`
      : `Bid of ${gbp(pence)} placed. You're the highest bidder.` });
    refreshBids();
  }

  async function buyItNow() {
    setBidMsg({ kind: "", text: "" });
    setBusy(true);
    const { data, error } = await supabase.rpc("buy_now", { p_lot: lot.id });
    setBusy(false);
    setConfirm(null);
    if (error) {
      setBidMsg({ kind: "error", text: cleanError(error, "That didn't go through. Try again.") });
      router.refresh();
      return;
    }
    if (data) setLot((prev) => ({ ...prev, ...data }));
    setNow(Date.now());
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

  async function saveReserve(e) {
    e.preventDefault();
    setReserveMsg({ kind: "", text: "" });
    const pence = toPence(reserveText);
    if (!Number.isFinite(pence) || pence <= 0) return setReserveMsg({ kind: "error", text: "Enter the reserve in pounds, like 50.00." });
    if (pence <= lot.start_price_pence) return setReserveMsg({ kind: "error", text: `The reserve must be higher than the starting bid of ${gbp(lot.start_price_pence)}.` });
    if (lot.bid_count > 0 && reserve && pence > reserve) return setReserveMsg({ kind: "error", text: "Once bidding has started, you can only lower the reserve." });
    setBusy(true);
    const { error } = reserve
      ? await supabase.from("lot_reserves").update({ reserve_pence: pence }).eq("lot_id", lot.id)
      : await supabase.from("lot_reserves").insert({ lot_id: lot.id, reserve_pence: pence });
    setBusy(false);
    if (error) return setReserveMsg({ kind: "error", text: cleanError(error, "The reserve didn't save. Try again.") });
    setReserve(pence);
    setReserveEdit(false);
    setReserveMsg({ kind: "success", text: "Reserve saved." });
    const { data } = await supabase.from("lots").select("reserve_status").eq("id", lot.id).single();
    if (data) setLot((prev) => ({ ...prev, ...data }));
  }

  async function removeReserve() {
    setBusy(true);
    const { error } = await supabase.from("lot_reserves").delete().eq("lot_id", lot.id);
    setBusy(false);
    if (error) return setReserveMsg({ kind: "error", text: cleanError(error, "Couldn't remove the reserve.") });
    setReserve(null);
    setReserveText("");
    setReserveEdit(false);
    setLot((prev) => ({ ...prev, reserve_status: "none" }));
    setReserveMsg({ kind: "success", text: "Reserve removed. The highest bid will win." });
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
  const priceLabel = ended
    ? (lot.bought_now ? "Bought for" : lot.bid_count ? "Final bid" : "Starting bid")
    : (lot.bid_count ? "Current bid" : "Starting bid");
  const bidderName = (id) => (id === userId ? "You" : names.current[id] || "A bidder");
  const sellerName = isSeller ? "You" : initialLot.seller?.display_name || "A seller";

  // ---------- The main action panel ----------
  let action;
  if (lot.status === "removed") {
    action = <p>You withdrew this listing. Only you can see it.</p>;
  } else if (ended) {
    action = sold ? (
      <>
        <p className="stamp" style={{ fontWeight: 700, fontSize: 18 }}>
          {lot.bought_now ? "Bought with Buy it now by " : "Sold to "}{bidderName(lot.high_bidder_id)} for <span className="num">{gbp(lot.current_price_pence)}</span>
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
    ) : lot.bid_count ? (
      <p>Bidding ended below the seller&apos;s reserve, so this lot didn&apos;t sell.{isSeller ? " You can list it again with a lower reserve." : ""}</p>
    ) : (
      <p>This lot closed without any bids.</p>
    );
  } else if (isSeller) {
    action = (
      <>
        <p className="hint">This is your listing, so you can&apos;t bid on it.</p>
        {canBuyNow ? <p className="hint">Buy it now: <strong className="num">{gbp(lot.buy_now_pence)}</strong>. It disappears once someone bids.</p> : null}
        {confirm === "end" ? (
          <div className="confirm">
            <span>End the auction now? {lot.bid_count && !reserveNotMet ? "The current highest bidder wins." : lot.bid_count ? "The reserve hasn't been met, so it won't sell." : "It will close unsold."}</span>
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
      </>
    );
  } else if (!userId) {
    action = (
      <>
        {canBuyNow ? <p>Bid, or <strong>Buy it now for {gbp(lot.buy_now_pence)}</strong>. Sign in first. All you need is an email address.</p>
          : <p>Sign in to bid. All you need is an email address.</p>}
        <Link className="btn btn-brass btn-lg btn-block" href={`/login?next=/lot/${lot.id}`}>{canBuyNow ? "Sign in to bid or buy" : "Sign in to bid"}</Link>
      </>
    );
  } else {
    action = (
      <form className="stack" style={{ gap: 10 }} onSubmit={placeBid} noValidate>
        {canBuyNow ? (
          confirm === "buy" ? (
            <div className="panel-note stack" style={{ gap: 10 }}>
              <span>Buy <strong>{lot.title}</strong> for <strong>{gbp(lot.buy_now_pence)}</strong>? This ends the auction and you agree to buy it.</span>
              <div className="row">
                <button className="btn btn-primary" type="button" onClick={buyItNow} disabled={busy}>Yes, buy it</button>
                <button className="btn btn-ghost" type="button" onClick={() => setConfirm(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <button className="btn btn-primary btn-lg btn-block" type="button" onClick={() => setConfirm("buy")}>Buy it now for {gbp(lot.buy_now_pence)}</button>
              <p className="hint" style={{ textAlign: "center" }}>or place a bid. Buy it now disappears after the first bid.</p>
            </>
          )
        ) : null}
        <div className="bidform">
          <div className="field">
            <label htmlFor="bid">Your bid</label>
            <div className="money">
              <span>£</span>
              <input id="bid" inputMode="decimal" autoComplete="off" placeholder={(minimum / 100).toFixed(2)}
                value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-brass btn-lg" type="submit" disabled={busy}>{leading ? "Raise my bid" : "Place bid"}</button>
        </div>
        <p className="hint">
          Enter <strong className="num">{gbp(minimum)}</strong> or more.
          {lot.bid_count ? <> Bids go up in steps of {gbp(increment(lot.current_price_pence))}.</> : null}
          {" "}A bid in the last 2 minutes adds 2 minutes to the clock.
        </p>
        {bidMsg.text ? <p className={bidMsg.kind} role="status">{bidMsg.text}</p> : null}
      </form>
    );
  }

  return (
    <div className="lot-page">
      <div className="stack" style={{ gap: 28 }}>
        <div className="gallery">
          {mainSrc
            ? <img className="g-main" src={mainSrc} alt={`Photo of ${lot.title}`} />
            : <div className="g-empty" aria-hidden="true"><PhotoIcon size={56} /></div>}
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

        {lot.description ? (
          <section>
            <h2 className="block-title">Description</h2>
            <p className="desc">{lot.description}</p>
          </section>
        ) : null}

        <section>
          <h2 className="block-title">Bid history <span className="hint" style={{ fontWeight: 400 }}>({lot.bid_count})</span></h2>
          {bids.length ? (
            <div className="hist">
              {bids.map((b, k) => (
                <div key={b.id} className={`hist-row${k === 0 ? " top" : ""}`}>
                  <span className="who">{bidderName(b.bidder_id)}</span>
                  <span className="when">{when(b.created_at)}</span>
                  <span className="num" style={{ fontWeight: 700 }}>{gbp(b.amount_pence)}</span>
                </div>
              ))}
            </div>
          ) : <p className="hint">No bids yet. Bidding starts at {gbp(lot.start_price_pence)}.</p>}
        </section>
      </div>

      <aside className="lot-side">
        <div className="row" style={{ gap: 8 }}>
          {lot.status === "removed"
            ? <span className="pill p-unsold">Withdrawn</span>
            : <StagePill endsAt={lot.ends_at} bidCount={lot.bid_count} reserveStatus={lot.reserve_status} />}
          {!ended && RESERVE_LABEL[lot.reserve_status]
            ? <span className={`pill ${lot.reserve_status === "met" ? "p-reserve-met" : "p-reserve"}`}>{RESERVE_LABEL[lot.reserve_status]}</span>
            : null}
          {leading ? <span className="pill p-win">You&apos;re the highest bidder</span> : null}
          {!ended && iBid && !leading ? <span className="pill p-out">You&apos;ve been outbid</span> : null}
          <span className="hint" style={{ marginLeft: "auto" }}>LOT {lotNumber(lot.lot_no)}</span>
        </div>

        <h1 className="lot-h1">{lot.title}</h1>
        <div className="meta">
          <span>{lot.category}</span>
          {lot.location ? <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><PinIcon />{lot.location}</span> : null}
        </div>

        <div className={`panel${sold ? " panel-sold" : ""}`}>
          <div className="panel-head">
            <div>
              <div className="hint">{priceLabel}</div>
              <div className="big-price">{gbp(lot.current_price_pence)}</div>
              <div className="hint">{lot.bid_count} bid{lot.bid_count === 1 ? "" : "s"}</div>
            </div>
            <div className="clock-box">
              <div className="hint">{ended ? "Closed" : "Time left"}</div>
              <TimeLeft endsAt={lot.ends_at} className="time" />
              {!ended ? <div className="hint num">Ends {when(lot.ends_at)}</div> : null}
            </div>
          </div>
          <div className="panel-divide" />
          {action}
        </div>

        {isSeller && !ended && lot.status === "live" ? (
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="block-title" style={{ marginBottom: 2 }}>Reserve price</div>
                <p className="hint">Only you can see this. Bidders just see whether it&apos;s been met.</p>
              </div>
              <div className="big-price" style={{ fontSize: 22 }}>{reserve ? gbp(reserve) : "None"}</div>
            </div>
            {reserveEdit ? (
              <form className="bidform" onSubmit={saveReserve} noValidate>
                <div className="field">
                  <label htmlFor="reserve">{reserve ? "New reserve" : "Reserve"}</label>
                  <div className="money"><span>£</span>
                    <input id="reserve" inputMode="decimal" value={reserveText} onChange={(e) => setReserveText(e.target.value)} />
                  </div>
                </div>
                <button className="btn btn-primary" type="submit" disabled={busy}>Save</button>
                <button className="btn btn-ghost" type="button" onClick={() => { setReserveEdit(false); setReserveMsg({ kind: "", text: "" }); }}>Cancel</button>
              </form>
            ) : (
              <div className="row">
                {reserve ? (
                  <>
                    <button className="btn btn-ghost" type="button" onClick={() => setReserveEdit(true)}>Lower reserve</button>
                    <button className="btn btn-ghost" type="button" onClick={removeReserve} disabled={busy}>Remove reserve</button>
                  </>
                ) : lot.bid_count === 0 ? (
                  <button className="btn btn-ghost" type="button" onClick={() => setReserveEdit(true)}>Add a reserve</button>
                ) : (
                  <p className="hint">A reserve can&apos;t be added once bidding has started.</p>
                )}
              </div>
            )}
            {reserveMsg.text ? <p className={reserveMsg.kind}>{reserveMsg.text}</p> : null}
          </div>
        ) : null}

        <div className="panel">
          <div className="seller-box">
            <div className="avatar" aria-hidden="true">{sellerName.slice(0, 1).toUpperCase()}</div>
            <div>
              <div className="hint">Sold by</div>
              <strong>{sellerName}</strong>
            </div>
          </div>
          <p className="hint">Payment and collection are arranged between buyer and seller after the auction ends. Cash on collection is simplest.</p>
        </div>

        {lot.status === "live" ? (
          <ShareButtons
            path={`/lot/${lot.id}`}
            title={lot.title}
            text={`${lot.title}: ${ended ? (sold ? `sold for ${gbp(lot.current_price_pence)}` : "auction ended") : lot.bid_count ? `current bid ${gbp(lot.current_price_pence)}` : `bidding starts at ${gbp(lot.start_price_pence)}`} on Going Going Gone`}
          />
        ) : null}

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
      </aside>
    </div>
  );
}
