import { createClient as createPlainClient } from "@supabase/supabase-js";
import { pushConfigured, secretMatches, sendToDevices } from "@/lib/push-server";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called by the database (never by browsers) when someone has a new alert.
// It carries a shared password, so nobody else can send notifications through it.
export async function POST(request) {
  if (!secretMatches(request.headers.get("x-push-secret"))) return new Response("Not allowed", { status: 401 });
  if (!pushConfigured()) return Response.json({ sent: 0, note: "Notification keys aren't set up yet." });

  let data;
  try { data = await request.json(); } catch { return new Response("Bad request", { status: 400 }); }
  const subs = Array.isArray(data?.subscriptions) ? data.subscriptions : [];
  const url = typeof data?.url === "string" && data.url.startsWith(SITE_URL) ? data.url : SITE_URL;
  const message = {
    title: String(data?.title || "Going Going Gone").slice(0, 120),
    body: String(data?.body || "").slice(0, 200),
    url,
  };

  const { sent, gone } = await sendToDevices(subs, message);
  if (gone.length) {
    // Tidy up phones that have uninstalled the app or switched notifications off.
    const db = createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
    await db.rpc("gg_push_gone", { p_secret: process.env.PUSH_SECRET, p_endpoints: gone });
  }
  return Response.json({ sent, removed: gone.length });
}
