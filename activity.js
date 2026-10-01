// Turns recent bids and new listings into activity-ticker events.
// Shared by the server (first load) and the browser (live updates).

export const BID_FIELDS = "id, amount_pence, created_at, bidder:profiles(display_name), lot:lots(id, title, status, bought_now, buy_now_pence)";
export const NEW_LOT_FIELDS = "id, title, category, created_at, status";

export function bidEvent(b) {
  if (!b?.lot || b.lot.status !== "live") return null;
  const bought = b.lot.bought_now && b.lot.buy_now_pence === b.amount_pence;
  return {
    key: `b-${b.id}`,
    at: b.created_at,
    kind: bought ? "bought" : "bid",
    who: b.bidder?.display_name || "Someone",
    amount: b.amount_pence,
    lotId: b.lot.id,
    title: b.lot.title,
  };
}

export function listingEvent(l) {
  if (!l || l.status !== "live") return null;
  return { key: `l-${l.id}`, at: l.created_at, kind: "listed", lotId: l.id, title: l.title, category: l.category };
}

export function mergeEvents(...lists) {
  const seen = new Set();
  return lists.flat().filter(Boolean)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .filter((e) => (seen.has(e.key) ? false : (seen.add(e.key), true)))
    .slice(0, 12);
}

export function ago(iso, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}
