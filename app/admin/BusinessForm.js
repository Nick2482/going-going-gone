"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressPhoto } from "@/lib/photos";
import { photoUrl } from "@/lib/format";

// Add a local business (no `biz`) or edit one.
export default function BusinessForm({ biz, userId, nextPosition = 0 }) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(biz?.name || "");
  const [tagline, setTagline] = useState(biz?.tagline || "");
  const [url, setUrl] = useState(biz?.url || "");
  const [phone, setPhone] = useState(biz?.phone || "");
  const [linkLabel, setLinkLabel] = useState(biz?.link_label || "");
  const [position, setPosition] = useState(String(biz?.position ?? nextPosition));
  const [active, setActive] = useState(biz ? biz.active : true);
  const [logoPath, setLogoPath] = useState(biz?.logo_path || null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const idp = biz?.id || "new";

  async function pickLogo(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setBusy("Uploading picture…");
    try {
      const blob = await compressPhoto(file, 1400, 0.86);
      const path = `${userId}/biz-${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage.from("lot-photos").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
      if (upErr) throw new Error("The picture didn't upload. Please try again.");
      setLogoPath(path);
    } catch (err) {
      setError(err.message || "The picture didn't upload.");
    } finally {
      setBusy("");
    }
  }

  async function save(e) {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Give the business a name.");
    setBusy("Saving…");
    setError("");
    const { error: err } = await supabase.rpc("admin_save_business", {
      p_id: biz?.id ?? null, p_name: name, p_tagline: tagline, p_url: url, p_phone: phone,
      p_logo_path: logoPath, p_active: active, p_position: parseInt(position, 10) || 0, p_link_label: linkLabel,
    });
    setBusy("");
    if (err) return setError(/check constraint/.test(err.message) ? "Something doesn't look right. Check the website and phone." : err.message);
    setOpen(false);
    if (!biz) { setName(""); setTagline(""); setUrl(""); setPhone(""); setLinkLabel(""); setLogoPath(null); setActive(true); }
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`Remove ${biz.name} from the site?`)) return;
    setBusy("Removing…");
    const { error: err } = await supabase.rpc("admin_delete_business", { p_id: biz.id });
    setBusy("");
    if (err) return setError(err.message);
    router.refresh();
  }

  if (!open) {
    return <button type="button" className={`btn btn-sm ${biz ? "btn-ghost" : "btn-primary"}`} onClick={() => setOpen(true)}>{biz ? "Edit" : "Add a local business"}</button>;
  }

  const logo = photoUrl(logoPath);
  return (
    <form className="panel cause-form" onSubmit={save} noValidate>
      <div className="formgrid">
        <div className="field"><label htmlFor={`bn-${idp}`}>Business name</label>
          <input id={`bn-${idp}`} className="input" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bosworth Bakery" /></div>
        <div className="field full"><label htmlFor={`bt-${idp}`}>What they offer <span className="optional">(a few sentences, up to 400 characters)</span></label>
          <textarea id={`bt-${idp}`} className="input" rows={4} maxLength={400} value={tagline} onChange={(e) => setTagline(e.target.value)}
            placeholder="e.g. Family-run bakery on the Market Place since 1985. Fresh bread every morning, celebration cakes made to order, and the best sausage rolls in Leicestershire." />
          <span className="hint">{tagline.length}/400</span></div>
        <div className="field"><label htmlFor={`bu-${idp}`}>Website, Instagram or Facebook page <span className="optional">(optional)</span></label>
          <input id={`bu-${idp}`} className="input" maxLength={300} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="www.example.co.uk or instagram.com/theirname" /></div>
        <div className="field"><label htmlFor={`bk-${idp}`}>Button text <span className="optional">(optional)</span></label>
          <input id={`bk-${idp}`} className="input" maxLength={30} value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder={/instagram/i.test(url) ? "See us on Instagram" : /facebook/i.test(url) ? "Find us on Facebook" : "Visit website"} />
          <span className="hint">Leave empty to use the grey wording shown.</span></div>
        <div className="field"><label htmlFor={`bp-${idp}`}>Phone <span className="optional">(optional)</span></label>
          <input id={`bp-${idp}`} className="input" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01455 …" /></div>
        <div className="field full"><label htmlFor={`bl-${idp}`}>Picture <span className="optional">(a snapshot of their website, or a photo of the shop or their work, landscape works best)</span></label>
          <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
            {logo ? <img src={logo} alt="" style={{ width: 200, aspectRatio: "16 / 10", objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }} /> : null}
            <div className="stack" style={{ gap: 6 }}>
              <input id={`bl-${idp}`} type="file" accept="image/*" onChange={pickLogo} />
              {logo ? <button type="button" className="link-btn" onClick={() => setLogoPath(null)}>Remove picture</button> : null}
              <span className="hint">Shown at 16:10, cropped to fit. Only use pictures the business is happy for you to use.</span>
            </div>
          </div></div>
        <div className="field"><label htmlFor={`bo-${idp}`}>Order <span className="optional">(lower shows first)</span></label>
          <input id={`bo-${idp}`} className="input" inputMode="numeric" value={position} onChange={(e) => setPosition(e.target.value)} style={{ maxWidth: 100 }} /></div>
        <label className="check full"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /><span>Show on the site</span></label>
      </div>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <div className="row">
        <button className="btn btn-primary btn-sm" type="submit" disabled={Boolean(busy)}>{busy || "Save"}</button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setOpen(false)} disabled={Boolean(busy)}>Cancel</button>
        {biz ? <button className="btn btn-ghost btn-sm" type="button" style={{ color: "var(--sold)", marginLeft: "auto" }} onClick={remove} disabled={Boolean(busy)}>Remove</button> : null}
      </div>
    </form>
  );
}
