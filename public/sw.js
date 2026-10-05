// Going Going Gone: shows phone notifications. It doesn't store pages or track anything.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "" }; }
  const url = data.url || "/";
  event.waitUntil(
    self.registration.showNotification(data.title || "Going Going Gone", {
      body: data.body || "",
      icon: "/icon-192.png",
      tag: url,
      renotify: true,
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("navigate" in w && new URL(w.url).origin === self.location.origin) {
          return w.focus().then(() => w.navigate(url));
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
