import { redirect } from "next/navigation";
import { createClient, getUserId } from "@/lib/supabase/server";
import SellForm from "./SellForm";

export const metadata = { title: "Sell something" };

export default async function SellPage() {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) redirect("/login?next=/sell");
  const { data: profile } = await supabase.from("profiles").select("area").eq("id", userId).maybeSingle();

  return (
    <div className="wrap narrow">
      <h1 className="page-title">Sell something</h1>
      <p className="page-lead">
        Add a few photos, set a starting price and how long bidding runs. The highest bid when the clock runs out wins, and you arrange payment and collection with the buyer.
      </p>
      <SellForm userId={userId} defaultArea={profile?.area || ""} />
    </div>
  );
}
