import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getUserId } from "@/lib/supabase/server";
import { photoUrl } from "@/lib/format";
import LotLive from "./LotLive";

async function loadLot(supabase, id) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabase
    .from("lots")
    .select("*, seller:profiles!lots_seller_id_fkey(display_name, area)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const lot = await loadLot(supabase, id);
  if (!lot) return { title: "Lot not found" };
  const image = photoUrl(lot.cover_path);
  return {
    title: lot.title,
    description: lot.description?.slice(0, 160),
    openGraph: { title: lot.title, description: lot.description?.slice(0, 160), images: image ? [image] : [] },
  };
}

export default async function LotPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const [lot, userId] = await Promise.all([loadLot(supabase, id), getUserId(supabase)]);
  if (!lot) notFound();

  const isSeller = userId && userId === lot.seller_id;
  const [{ data: photos }, { data: bids }, reserveRes] = await Promise.all([
    supabase.from("lot_photos").select("id, path, position").eq("lot_id", id).order("position").order("created_at"),
    supabase
      .from("bids")
      .select("id, amount_pence, created_at, bidder_id, bidder:profiles(display_name)")
      .eq("lot_id", id)
      .order("amount_pence", { ascending: false })
      .limit(100),
    // Only the seller can read the reserve amount; everyone else gets nothing back.
    isSeller ? supabase.from("lot_reserves").select("reserve_pence").eq("lot_id", id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">All lots</Link><span>›</span>
        <Link href={`/?cat=${encodeURIComponent(lot.category)}`}>{lot.category}</Link>
      </nav>
      {sp?.reserve === "failed" && isSeller && !reserveRes?.data ? (
        <p className="notice" style={{ marginTop: 16 }}>Your item is listed, but the reserve didn&apos;t save. Add it again below before anyone bids.</p>
      ) : null}
      <LotLive
        initialLot={lot}
        initialPhotos={photos ?? []}
        initialBids={bids ?? []}
        initialReserve={reserveRes?.data?.reserve_pence ?? null}
        userId={userId}
      />
    </div>
  );
}
