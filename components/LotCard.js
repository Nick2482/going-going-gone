import Link from "next/link";
import { gbp, lotNumber, photoUrl } from "@/lib/format";
import { StagePill, TimeLeft } from "./Clock";

// One lot in a grid. `badge` is an optional extra pill such as "Highest bidder".
export default function LotCard({ lot, badge }) {
  const ended = new Date(lot.ends_at).getTime() <= Date.now();
  const cover = photoUrl(lot.cover_path);
  const priceLabel = ended
    ? lot.bid_count ? "Hammer price" : "Started at"
    : lot.bid_count ? "Current bid" : "Starting bid";

  return (
    <Link href={`/lot/${lot.id}`} className="lot">
      <div className="lot-head">
        <span className="lotno">LOT {lotNumber(lot.lot_no)}</span>
        <span className="cat">{lot.category}</span>
      </div>
      {cover
        ? <img className="lot-img" src={cover} alt="" loading="lazy" />
        : <div className="lot-noimg" aria-hidden="true">{lot.category.slice(0, 1)}</div>}
      <div className="lot-body">
        <div className="row" style={{ gap: 6 }}>
          <StagePill endsAt={lot.ends_at} bidCount={lot.bid_count} />
          {badge}
        </div>
        <h3 className="lot-title">{lot.title}</h3>
        {lot.location ? <p className="lot-where">{lot.location}</p> : null}
      </div>
      <div className="lot-foot">
        <span className="label">{priceLabel}</span>
        <span className="label" style={{ textAlign: "right" }}>
          {lot.bid_count} bid{lot.bid_count === 1 ? "" : "s"}
        </span>
        <span className="price">{gbp(lot.current_price_pence)}</span>
        <TimeLeft endsAt={lot.ends_at} />
      </div>
    </Link>
  );
}
