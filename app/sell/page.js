import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUserId } from "@/lib/supabase/server";
import SellForm from "./SellForm";

export const metadata = { title: "Sell something" };

export default async function SellPage() {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) redirect("/login?next=/sell");
  const [{ data: profile }, { data: causes }] = await Promise.all([
    supabase.from("profiles").select("area").eq("id", userId).maybeSingle(),
    supabase.from("charities").select("id, name, description").eq("active", true).order("name"),
  ]);

  return (
    <div className="page-room">
    <div className="wrap narrow">
      <h1 className="page-title">Sell something</h1>
      <p className="page-lead">
        Add a few photos, set a starting price and how long bidding runs. Not sure what to ask? <Link href="/sold">See what similar things sold for</Link>. The highest bid when the clock runs out wins, and you arrange payment and collection with the buyer.
      </p>
      <p className="page-lead" style={{ marginTop: -12 }}>
        Rather someone else did it? <Link href="/list-for-me">We&apos;ll list it for you</Link>.
      </p>
      <SellForm userId={userId} defaultArea={profile?.area || ""} causes={causes ?? []} />
    </div>
    </div>
  );
}
