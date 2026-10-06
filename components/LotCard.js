import Link from "next/link";
import { gbp, lotNumber, photoUrl, RESERVE_LABEL } from "@/lib/format";
import { StagePill, TimeLeft } from "./Clock";
import { HeartIcon, PhotoIcon, PinIcon } from "./Icons";

// One lot in a grid. `badge` is an optional extra pill such as "Highest bidder".
export default function LotCard({ lot, badge }) {
  const ended = new Date(lot.ends_at).getTime() <= Date.now();
  const cover = photoUrl(lot.cover_path);
  const reserve = !ended ? RESERVE_LABEL[lot.reserve_status] : null;
  const buyNow = !ended && lot.buy_now_pence && lot.bid_count === 0 ? lot.buy_now_pence : null;
  const priceLabel = ended
    ? lot.bought_now ? "Bought for" : lot.bid_count ? "Final bid" : "Started at"
    : lot.bid_count ? "Current bid" : "Starting bid";

  return (
    <Link href={`/lot/${lot.id}`} className="lot">
      <div className="lot-media">
        {cover
          ? <img src={cover} alt="" loading="lazy" />
          : <div className="lot-noimg" aria-hidden="true"><PhotoIcon /></div>}
        <StagePill endsAt={lot.ends_at} bidCount={lot.bid_count} reserveStatus={lot.reserve_status} />
        <span className="lot-no"><em>Lot</em> {lotNumber(lot.lot_no)}</span>
      </div>
      <div className="lot-body">
        <span className="lot-cat">{lot.category}</span>
        <h3 className="lot-title">{lot.title}</h3>
        {lot.location ? <span className="lot-where"><PinIcon />{lot.location}</span> : null}
        {reserve || badge || buyNow || lot.bought_now || lot.charity_percent ? (
          <div className="lot-tags">
            {lot.charity_percent ? <span className="pill charity-pill"><HeartIcon size={11} /> {lot.charity_percent === 100 ? "All to charity" : `${lot.charity_percent}% to charity`}</span> : null}
            {buyNow ? <span className="pill" style={{ background: "#09212c", color: "#fff" }}>Buy it now {gbp(buyNow)}</span> : null}
            {lot.bought_now ? <span className="pill p-unsold">Bought with Buy it now</span> : null}
            {reserve ? <span className={`pill ${lot.reserve_status === "met" ? "p-reserve-met" : "p-reserve"}`}>{reserve}</span> : null}
            {badge}
          </div>
        ) : null}
      </div>
      <div className="lot-foot">
        <div className="lot-price">
          <small>{priceLabel}</small>
          <span className="price">{gbp(lot.current_price_pence)}</span>
        </div>
        <div>
          <TimeLeft endsAt={lot.ends_at} />
          <div className="lot-bids">{lot.bid_count} bid{lot.bid_count === 1 ? "" : "s"}</div>
        </div>
      </div>
    </Link>
  );
}
