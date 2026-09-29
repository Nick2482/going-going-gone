// Shared helpers used on both server and browser.

export const CATEGORIES = [
  "Antiques", "Art", "Baby & Kids", "Books", "Clothing", "Collectables", "Electronics",
  "Furniture", "Garden & DIY", "Home", "Music", "Sport & Leisure", "Toys & Games", "Vehicles & Parts", "Other",
];

export const DURATIONS = [
  { value: "1", label: "1 day" },
  { value: "3", label: "3 days" },
  { value: "5", label: "5 days" },
  { value: "7", label: "7 days" },
  { value: "10", label: "10 days" },
];

export const MAX_PHOTOS = 6;

// Money is stored in pence everywhere.
export function gbp(pence) {
  return "£" + (pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Parse "12", "12.5", "£1,200.00" into pence. Returns NaN when not a number.
export function toPence(text) {
  const clean = String(text ?? "").replace(/[£,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) return NaN;
  return Math.round(parseFloat(clean) * 100);
}

// Saleroom-style bid steps. Must match public.bid_increment() in supabase/schema.sql.
export function increment(pence) {
  if (pence < 2000) return 50;
  if (pence < 10000) return 100;
  if (pence < 50000) return 500;
  if (pence < 100000) return 1000;
  if (pence < 500000) return 2500;
  return 5000;
}

export function nextMinimum(lot) {
  return lot.bid_count > 0 ? lot.current_price_pence + increment(lot.current_price_pence) : lot.start_price_pence;
}

// The auctioneer's call for how close a lot is to closing.
export function stage(endsAt, bidCount, now = Date.now()) {
  const left = new Date(endsAt).getTime() - now;
  if (left <= 0) return bidCount > 0 ? "gone" : "unsold";
  if (left <= 10 * 60e3) return "twice";
  if (left <= 60 * 60e3) return "once";
  return "open";
}

export const STAGE_LABEL = {
  open: "Open",
  once: "Going once",
  twice: "Going twice",
  gone: "Gone",
  unsold: "Unsold",
};

export function timeLeft(endsAt, now = Date.now()) {
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return "Ended";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d) return `${d}d ${h}h left`;
  if (h) return `${h}h ${String(m).padStart(2, "0")}m left`;
  return `${m}m ${String(sec).padStart(2, "0")}s left`;
}

export function when(iso) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London",
  });
}

export function photoUrl(path) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/lot-photos/${path}`;
}

export function lotNumber(n) {
  return String(n).padStart(4, "0");
}
