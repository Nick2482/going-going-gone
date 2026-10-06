import { photoUrl } from "@/lib/format";

// Button wording: what the admin typed, or a sensible default for social media pages.
function linkLabel(b) {
  if (b.link_label) return b.link_label;
  const u = (b.url || "").toLowerCase();
  if (u.includes("instagram.com")) return "See us on Instagram";
  if (u.includes("facebook.com") || u.includes("fb.com")) return "Find us on Facebook";
  if (u.includes("tiktok.com")) return "See us on TikTok";
  return "Visit website";
}

const TRUST_LINE = "Every business featured here is one we use regularly ourselves and trust.";

function Card({ b }) {
  const pic = photoUrl(b.logo_path);
  const href = b.url ? `/go/${b.id}` : null;
  const tel = b.phone ? `tel:${b.phone.replace(/[^\d+]/g, "")}` : null;
  return (
    <li className="biz-card">
      {pic ? (
        href
          ? <a href={href} target="_blank" rel="noopener" className="biz-pic" tabIndex={-1} aria-hidden="true"><img src={pic} alt="" loading="lazy" /></a>
          : <div className="biz-pic"><img src={pic} alt="" loading="lazy" /></div>
      ) : null}
      <div className="biz-body">
        <h3 className="biz-name">{href ? <a href={href} target="_blank" rel="noopener">{b.name}</a> : b.name}</h3>
        {b.tagline ? <p className="biz-desc">{b.tagline}</p> : null}
        <div className="biz-actions">
          {href ? <a className="btn btn-brass btn-sm" href={href} target="_blank" rel="noopener">{linkLabel(b)}</a> : null}
          {tel ? <a className="btn btn-ghost btn-sm" href={tel}>Call {b.phone}</a> : null}
        </div>
      </div>
    </li>
  );
}

// Down the sides on big screens.
export function BusinessRails({ businesses }) {
  if (!businesses?.length) return null;
  const left = businesses.filter((_, i) => i % 2 === 0);
  const right = businesses.filter((_, i) => i % 2 === 1);
  const Rail = ({ list, side }) => (
    <aside className={`biz-rail biz-rail-${side}`} aria-label="Local businesses we trust">
      <div className="biz-rail-head">
        <span className="biz-kicker">Trusted locally</span>
      </div>
      <ul className="biz-list">{list.map((b) => <Card key={b.id} b={b} />)}</ul>
      <p className="biz-trust">{TRUST_LINE}</p>
    </aside>
  );
  return (
    <>
      <Rail list={left} side="left" />
      {right.length ? <Rail list={right} side="right" /> : null}
    </>
  );
}

// Near the bottom of every page on phones and smaller screens.
export function BusinessStrip({ businesses }) {
  if (!businesses?.length) return null;
  return (
    <section className="biz-strip" aria-labelledby="biz-strip-h">
      <div className="wrap">
        <span className="biz-kicker">Trusted locally</span>
        <h2 id="biz-strip-h" className="biz-strip-title">Local businesses we use and recommend</h2>
        <ul className="biz-grid">{businesses.map((b) => <Card key={b.id} b={b} />)}</ul>
        <p className="biz-trust">{TRUST_LINE}</p>
      </div>
    </section>
  );
}
