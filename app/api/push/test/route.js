import { createClient, getUserId } from "@/lib/supabase/server";
import { pushConfigured, sendToDevices } from "@/lib/push-server";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "Send me a test": sends a notification to the signed-in person's own devices only.
export async function POST() {
  if (!pushConfigured()) return Response.json({ error: "Notifications aren't set up yet." }, { status: 503 });
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { data: rows } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", userId).limit(10);
  const subs = (rows ?? []).map((r) => ({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }));
  if (!subs.length) return Response.json({ error: "No devices switched on yet." }, { status: 404 });
  const { sent } = await sendToDevices(subs, {
    title: "Going Going Gone 🔨",
    body: "Notifications are working. We'll buzz you if you're outbid, win, or get a question.",
    url: `${SITE_URL}/account`,
  });
  return Response.json({ sent });
}
