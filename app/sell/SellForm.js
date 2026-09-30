"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, DURATIONS, MAX_PHOTOS, gbp, toPence } from "@/lib/format";
import { compressPhoto, uploadLotPhotos } from "@/lib/photos";

export default function SellForm({ userId, defaultArea }) {
  const supabase = createClient();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Other");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(defaultArea);
  const [start, setStart] = useState("");
  const [reserve, setReserve] = useState("");
  const [days, setDays] = useState("7");
  const [agree, setAgree] = useState(false);
  const [photos, setPhotos] = useState([]); // { blob, preview }
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  // Free preview URLs when photos are removed or the page closes.
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function pickPhotos(e) {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    setError("");
    const room = MAX_PHOTOS - photos.length;
    const errs = [];
    if (files.length > room) errs.push(`Only ${MAX_PHOTOS} photos per lot, so some were left out.`);
    setProcessing(true);
    const added = [];
    for (const f of files.slice(0, room)) {
      try {
        const blob = await compressPhoto(f);
        added.push({ blob, preview: URL.createObjectURL(blob) });
      } catch (err) { errs.push(err.message); }
    }
    setPhotos((prev) => [...prev, ...added]);
    setProcessing(false);
    if (errs.length) setError(errs.join(" "));
  }

  function removePhoto(k) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[k].preview);
      return prev.filter((_, j) => j !== k);
    });
  }

  function moveFirst(k) {
    setPhotos((prev) => [prev[k], ...prev.filter((_, j) => j !== k)]);
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    const pence = toPence(start);
    const reservePence = reserve.trim() ? toPence(reserve) : null;
    if (title.trim().length < 3) return setError("Give your item a title of at least 3 characters.");
    if (!photos.length) return setError("Add at least one photo. Lots with photos get far more bids.");
    if (!Number.isFinite(pence) || pence < 1) return setError("Set a starting bid, for example 5.00.");
    if (reservePence !== null && (!Number.isFinite(reservePence) || reservePence <= pence)) {
      return setError(`The reserve must be higher than the starting bid${Number.isFinite(pence) ? ` of ${gbp(pence)}` : ""}, or left empty.`);
    }
    if (!agree) return setError("Please confirm the item is yours to sell and allowed on the site.");

    setSaving("Listing your item…");
    const endsAt = new Date(Date.now() + Number(days) * 86400e3).toISOString();
    const { data: lot, error: lotErr } = await supabase
      .from("lots")
      .insert({
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim() || null,
        start_price_pence: pence,
        ends_at: endsAt,
      })
      .select("id")
      .single();
    if (lotErr) { setSaving(""); return setError("Your listing didn't save. Check your connection and try again."); }

    let reserveFailed = false;
    if (reservePence !== null) {
      const { error: resErr } = await supabase.from("lot_reserves").insert({ lot_id: lot.id, reserve_pence: reservePence });
      // The lot is live without a reserve; the lot page tells the seller so they can add it again.
      reserveFailed = Boolean(resErr);
    }

    try {
      setSaving("Uploading photos…");
      const paths = await uploadLotPhotos(supabase, { userId, lotId: lot.id, blobs: photos.map((p) => p.blob) });
      if (paths[0]) await supabase.from("lots").update({ cover_path: paths[0] }).eq("id", lot.id);
    } catch {
      // The lot is live; the seller can add photos from the lot page.
    }
    // Remember the area for next time.
    if (location.trim()) await supabase.from("profiles").update({ area: location.trim() }).eq("id", userId);
    router.push(`/lot/${lot.id}${reserveFailed ? "?reserve=failed" : ""}`);
    router.refresh();
  }

  const pence = toPence(start);
  const reservePence = toPence(reserve);

  return (
    <form className="form-card stack" style={{ gap: 22 }} onSubmit={submit} noValidate>
      <div className="formgrid">
        <div className="field full">
          <label htmlFor="title">What are you selling?</label>
          <input id="title" className="input" maxLength={80} placeholder="e.g. Victorian brass carriage clock" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="field full">
          <span className="label">Photos <span className="optional">(up to {MAX_PHOTOS}. The first one is the cover.)</span></span>
          <div className="g-strip">
            {photos.map((p, k) => (
              <span key={p.preview} className="g-thumb" aria-current={k === 0}>
                <button type="button" onClick={() => moveFirst(k)} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%", height: "100%" }} aria-label={k === 0 ? "Cover photo" : `Make photo ${k + 1} the cover`}>
                  <img src={p.preview} alt="" />
                </button>
                <button type="button" className="g-del" onClick={() => removePhoto(k)} aria-label={`Remove photo ${k + 1}`}>×</button>
              </span>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <label className="addph">
                {processing ? "Adding…" : <>+ Add<br />photo</>}
                <input type="file" accept="image/*" multiple onChange={pickPhotos} disabled={processing} />
              </label>
            ) : null}
          </div>
          {photos.length > 1 ? <span className="hint">Tap a photo to make it the cover.</span> : null}
        </div>

        <div className="field">
          <label htmlFor="category">Category</label>
          <select id="category" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="location">Collection area</label>
          <input id="location" className="input" maxLength={60} placeholder="e.g. Market Bosworth" value={location} onChange={(e) => setLocation(e.target.value)} />
          <span className="hint">A town or village, never your full address.</span>
        </div>

        <div className="field full">
          <label htmlFor="description">Description</label>
          <textarea id="description" className="input" maxLength={3000} value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Condition, size, age, any faults, and whether you can post it or it's collection only." />
        </div>

        <h2 className="form-section full">Price and timing</h2>

        <div className="field">
          <label htmlFor="start">Starting bid</label>
          <div className="money">
            <span>£</span>
            <input id="start" inputMode="decimal" placeholder="10.00" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          {Number.isFinite(pence) && pence > 0 ? <span className="hint">Bidding opens at {gbp(pence)}.</span> : null}
        </div>

        <div className="field">
          <label htmlFor="reserve">Reserve price <span className="optional">(optional)</span></label>
          <div className="money">
            <span>£</span>
            <input id="reserve" inputMode="decimal" placeholder="Leave empty for no reserve" value={reserve} onChange={(e) => setReserve(e.target.value)} />
          </div>
          <span className="hint">
            {reserve.trim() && Number.isFinite(reservePence)
              ? `It won't sell unless bidding reaches ${gbp(reservePence)}. Bidders only see "Reserve not met".`
              : "The lowest price you'll accept. It's kept private."}
          </span>
        </div>

        <div className="field full">
          <label htmlFor="days">Auction length</label>
          <select id="days" className="input" value={days} onChange={(e) => setDays(e.target.value)} style={{ maxWidth: 260 }}>
            {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>

        <label className="full check">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span className="hint">This item is mine to sell, it&apos;s described honestly, and it isn&apos;t on the <a href="/terms#not-allowed" target="_blank">not-allowed list</a>. I&apos;ll sell to the highest bidder if the auction ends with a bid that meets my reserve.</span>
        </label>
      </div>

      {error ? <p className="error" role="alert">{error}</p> : null}
      <div>
        <button className="btn btn-brass btn-lg" type="submit" disabled={Boolean(saving) || processing}>{saving || "List it"}</button>
      </div>
    </form>
  );
}
