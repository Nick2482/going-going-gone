import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getUserId } from "@/lib/supabase/server";
import { gbp, photoUrl } from "@/lib/format";
import LotLive from "./LotLive";
import GroupShare from "@/components/GroupShare";
import { GROUP_NAME, SITE_URL } from "@/lib/site";

async function loadLot(supabase, id) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabase
    .from("lots")
    .select("*, seller:profiles!lots_seller_id_fkey(display_name, area, verified), charity:charities(id, name, website)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

const SITE = "https://www.going-going-gone.uk";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const lot = await loadLot(supabase, id);
  if (!lot) return { title: "Lot not found" };

  const photo = photoUrl(lot.cover_path);
  // A 640px copy of the cover photo, made by Vercel. WhatsApp skips large preview images,
  // and full-size phone photos can be too big.
  const preview = photo ? `${SITE}/_next/image?url=${encodeURIComponent(photo)}&w=640&q=75` : null;
  const price = `${lot.bid_count ? "Current bid" : "Starting bid"} ${gbp(lot.current_price_pence)}`;
  const description = [price, lot.location, lot.description].filter(Boolean).join(" · ").replace(/\s+/g, " ").slice(0, 200);
  const url = `${SITE}/lot/${lot.id}`;

  return {
    title: lot.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "Going Going Gone",
      url,
      title: lot.title,
      description,
      images: preview ? [{ url: preview, width: 640, alt: lot.title }] : [],
    },
    twitter: { card: preview ? "summary_large_image" : "summary", title: lot.title, description, images: preview ? [preview] : [] },
  };
}

export default async function LotPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const [lot, userId] = await Promise.all([loadLot(supabase, id), getUserId(supabase)]);
  if (!lot) notFound();

  const isSeller = userId && userId === lot.seller_id;
  const [{ data: photos }, { data: bids }, reserveRes, { data: sellerSummary }, { data: watchCount }, { data: myWatch }, { data: questions }] = await Promise.all([
    supabase.from("lot_photos").select("id, path, position").eq("lot_id", id).order("position").order("created_at"),
    supabase
      .from("bids")
      .select("id, amount_pence, created_at, bidder_id, auto, bidder:profiles(display_name)")
      .eq("lot_id", id)
      .order("amount_pence", { ascending: false })
      .order("auto", { ascending: false })
      .limit(100),
    // Only the seller can read the reserve amount; everyone else gets nothing back.
    isSeller ? supabase.from("lot_reserves").select("reserve_pence").eq("lot_id", id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.rpc("member_summary", { p_user: lot.seller_id }),
    supabase.rpc("watch_count", { p_lot: id }),
    userId ? supabase.from("watches").select("lot_id").eq("lot_id", id).eq("user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
    // Answered questions for everyone; unanswered ones only for the seller and whoever asked (the database decides).
    supabase.from("lot_questions").select("id, question, answer, asker_id, created_at, answered_at").eq("lot_id", id).order("created_at").limit(100),
  ]);

  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">All lots</Link><span>›</span>
        <Link href={`/?cat=${encodeURIComponent(lot.category)}`}>{lot.category}</Link>
      </nav>
      {sp?.new === "1" && isSeller && lot.status === "live" ? (
        <div className="listed-banner">
          <div>
            <strong className="listed-title">Your lot is live!</strong>
            <p>Get more bids by sharing it with the {GROUP_NAME} group on Facebook.</p>
          </div>
          <GroupShare big label="Share it in the group"
            message={`🔨 I've just listed ${lot.title} on Going Going Gone. Bidding starts at ${gbp(lot.start_price_pence)}!${lot.charity_percent ? " ❤️ Money goes to a local cause." : ""}\n${SITE_URL}/lot/${lot.id}`} />
        </div>
      ) : null}
      {sp?.cause === "dropped" && isSeller ? (
        <p className="notice" style={{ marginTop: 16 }}>Relisted. The local cause you chose before is no longer on our list, so this listing doesn&apos;t have one.</p>
      ) : null}
      {sp?.reserve === "failed" && isSeller && !reserveRes?.data ? (
        <p className="notice" style={{ marginTop: 16 }}>Your item is listed, but the reserve didn&apos;t save. Add it again below before anyone bids.</p>
      ) : null}
      <LotLive
        initialLot={lot}
        initialPhotos={photos ?? []}
        initialBids={bids ?? []}
        initialReserve={reserveRes?.data?.reserve_pence ?? null}
        userId={userId}
        sellerSummary={sellerSummary ?? null}
        watchCount={Number(watchCount) || 0}
        watching={Boolean(myWatch)}
        initialQuestions={questions ?? []}
      />
    </div>
  );
}
