import Link from "next/link";
import { gbp, photoUrl } from "@/lib/format";
import { StagePill, TimeLeft } from "./Clock";
import { PhotoIcon } from "./Icons";

// A row of the next lots to close, each with a big countdown.
export default function EndingSoon({ lots }) {
  if (!lots?.length) return null;
  return (
    <section className="ending" aria-labelledby="ending-title">
      <div className="ending-head">
        <h2 id="ending-title" className="section-title" style={{ margin: 0 }}>Ending soon</h2>
        <span className="hint">Last chance to bid</span>
      </div>
      <div className="ending-scroll">
        <div className="ending-row">
          {lots.map((lot) => {
            const cover = photoUrl(lot.cover_path);
            return (
              <Link key={lot.id} href={`/lot/${lot.id}`} className="ending-card">
                <div className="ending-media">
                  {cover ? <img src={cover} alt="" loading="lazy" /> : <div className="lot-noimg" aria-hidden="true"><PhotoIcon /></div>}
                  <StagePill endsAt={lot.ends_at} bidCount={lot.bid_count} reserveStatus={lot.reserve_status} />
                </div>
                <div className="ending-body">
                  <span className="ending-title">{lot.title}</span>
                  <div className="ending-foot">
                    <span className="price" style={{ fontSize: 17 }}>{gbp(lot.current_price_pence)}</span>
                    <TimeLeft endsAt={lot.ends_at} className="ending-clock" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
