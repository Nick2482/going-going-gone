import { notFound } from "next/navigation";
import { createClient, getUserId } from "@/lib/supabase/server";
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
  return lot ? { title: lot.title, description: lot.description?.slice(0, 160) } : { title: "Lot not found" };
}

export default async function LotPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const [lot, userId] = await Promise.all([loadLot(supabase, id), getUserId(supabase)]);
  if (!lot) notFound();

  const [{ data: photos }, { data: bids }] = await Promise.all([
    supabase.from("lot_photos").select("id, path, position").eq("lot_id", id).order("position").order("created_at"),
    supabase
      .from("bids")
      .select("id, amount_pence, created_at, bidder_id, bidder:profiles(display_name)")
      .eq("lot_id", id)
      .order("amount_pence", { ascending: false })
      .limit(100),
  ]);

  return (
    <div className="wrap">
      <LotLive
        initialLot={lot}
        initialPhotos={photos ?? []}
        initialBids={bids ?? []}
        userId={userId}
      />
    </div>
  );
}
