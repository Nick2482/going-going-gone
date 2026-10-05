import webpush from "web-push";
import { CONTACT } from "@/lib/site";

// Server-only: sends one notification to each device, signed with the site's keys
// (which are kept in Supabase Vault). Returns the devices that no longer exist.
export async function sendToDevices(subscriptions, message, keys) {
  webpush.setVapidDetails(`mailto:${CONTACT}`, keys.publicKey, keys.privateKey);
  const payload = JSON.stringify(message);
  const gone = [];
  let sent = 0;
  await Promise.all(
    (subscriptions || []).slice(0, 20).map(async (s) => {
      if (!s?.endpoint?.startsWith("https://") || !s.keys?.p256dh || !s.keys?.auth) return;
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }, payload, { TTL: 86400, urgency: "high" });
        sent++;
      } catch (err) {
        if (err?.statusCode === 404 || err?.statusCode === 410) gone.push(s.endpoint);
      }
    })
  );
  return { sent, gone };
}
