// Lets people add Going Going Gone to their phone's home screen, where it opens like an app.
export default function manifest() {
  return {
    name: "Going Going Gone",
    short_name: "Going Gone",
    description: "Local auctions in Market Bosworth. Free to list, free to bid, collect locally.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3f9f9",
    theme_color: "#09212c",
    lang: "en-GB",
    categories: ["shopping"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Sell something", url: "/sell", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "My account", url: "/account", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
