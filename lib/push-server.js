import webpush from "web-push";
import { timingSafeEqual } from "node:crypto";
import { CONTACT } from "@/lib/site";

// Server-only helpers for phone notifications.
export function pushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function secretMatches(given) {
  const secret = process.env.PUSH_SECRET || "";
  if (!secret || typeof given !== "string") return false;
  const a = Buffer.from(given), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Sends one notification to each device. Returns the devices that no longer exist.
export async function sendToDevices(subscriptions, message) {
  webpush.setVapidDetails(`mailto:${CONTACT}`, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const payload = JSON.stringify(message);
  const gone = [];
  let sent = 0;
  await Promise.all(
    subscriptions.slice(0, 20).map(async (s) => {
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
