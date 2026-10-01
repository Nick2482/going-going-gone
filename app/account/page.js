import { redirect } from "next/navigation";
import { createClient, getUserId } from "@/lib/supabase/server";
import LotCard from "@/components/LotCard";
import ProfileForm from "./ProfileForm";

export const metadata = { title: "My account" };

const LOT_FIELDS = "id, lot_no, title, category, location, current_price_pence, bid_count, ends_at, cover_path, high_bidder_id, status, reserve_status";

function Section({ title, lots, badge, empty }) {
  return (
    <section className="section">
      <h2 className="section-title">{title}</h2>
      <div className="grid">
        {lots.length ? lots.map((l) => <LotCard key={l.id} lot={l} badge={badge?.(l)} />) : <div className="empty">{empty}</div>}
      </div>
    </section>
  );
}

export default async function AccountPage() {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) redirect("/login?next=/account");

  const [{ data: profile }, { data: myBids }, { data: mine }] = await Promise.all([
    supabase.from("profiles").select("display_name, area, email_alerts").eq("id", userId).maybeSingle(),
    supabase.from("bids").select("lot_id").eq("bidder_id", userId).limit(1000),
    supabase.from("lots").select(LOT_FIELDS).eq("seller_id", userId).order("ends_at", { ascending: false }).limit(200),
  ]);

  const bidLotIds = [...new Set((myBids ?? []).map((b) => b.lot_id))];
  const { data: bidLots } = bidLotIds.length
    ? await supabase.from("lots").select(LOT_FIELDS).in("id", bidLotIds).order("ends_at", { ascending: true })
    : { data: [] };

  const now = Date.now();
  const isLive = (l) => l.status === "live" && new Date(l.ends_at).getTime() > now;
  const biddingOn = (bidLots ?? []).filter(isLive);
  const won = (bidLots ?? []).filter((l) => !isLive(l) && l.high_bidder_id === userId && l.reserve_status !== "not_met").reverse();
  const selling = (mine ?? []).filter(isLive).reverse();
  const finished = (mine ?? []).filter((l) => !isLive(l));

  const bidBadge = (l) => l.high_bidder_id === userId
    ? <span className="pill p-win">Highest bidder</span>
    : <span className="pill p-out">Outbid</span>;

  return (
    <div className="wrap" style={{ paddingBlock: 32 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
        <h1 className="page-title">My account</h1>
        <form action="/auth/signout" method="post"><button className="btn btn-ghost" type="submit">Sign out</button></form>
      </div>

      <ProfileForm userId={userId} initialName={profile?.display_name || ""} initialArea={profile?.area || ""} initialAlerts={profile?.email_alerts ?? true} />

      <Section title="Bidding on" lots={biddingOn} badge={bidBadge} empty="You're not bidding on anything right now." />
      <Section title="Won" lots={won} badge={() => <span className="pill p-win">You won</span>} empty="Lots you win will appear here, with the seller's contact details on the lot page." />
      <Section title="Selling" lots={selling} empty="Nothing for sale right now." />
      {finished.length ? (
        <Section title="Finished listings" lots={finished}
          badge={(l) => l.status === "removed"
            ? <span className="pill p-unsold">Withdrawn</span>
            : l.bid_count > 0 && l.reserve_status === "not_met" ? <span className="pill p-reserve">Reserve not met</span> : null} />
      ) : null}
    </div>
  );
}
