import { createClient as createPlainClient } from "@supabase/supabase-js";
import { sendToDevices } from "@/lib/push-server";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The database pings this with an id and a one-time code whenever someone has a new alert.
// We swap them for the notification itself; without the right code there's nothing to send.
export async function POST(request) {
  let data;
  try { data = await request.json(); } catch { return new Response("Bad request", { status: 400 }); }
  const id = typeof data?.id === "string" ? data.id : "";
  const token = typeof data?.token === "string" ? data.token : "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f]{64}$/i.test(token)) return new Response("Bad request", { status: 400 });

  const db = createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data: job } = await db.rpc("gg_push_claim", { p_id: id, p_token: token });
  if (!job?.private_key || !job?.public_key) return new Response("Not found", { status: 404 });

  const url = typeof job.url === "string" && job.url.startsWith(SITE_URL) ? job.url : SITE_URL;
  const { sent, gone } = await sendToDevices(
    job.subscriptions,
    { title: String(job.title || "Going Going Gone").slice(0, 120), body: String(job.body || "").slice(0, 200), url },
    { publicKey: job.public_key, privateKey: job.private_key }
  );
  await db.rpc("gg_push_done", { p_id: id, p_token: token, p_gone: gone });
  return Response.json({ sent, removed: gone.length });
}
