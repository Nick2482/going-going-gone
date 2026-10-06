"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Keeps the "Trusted locally" side panels below the big banner photo on the home page
// (they start under the banner and slide up beside the content as you scroll), and makes
// every business card the same height as the tallest, so they line up neatly.
export default function RailPosition() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    const place = () => {
      frame = 0;
      const hero = document.querySelector(".hero");
      const header = document.querySelector(".site-head");
      const min = Math.max(header ? header.getBoundingClientRect().bottom : 80, 0) + 16;
      const top = hero ? Math.max(min, hero.getBoundingClientRect().bottom + 16) : min;
      root.style.setProperty("--rail-top", `${Math.round(top)}px`);
      root.classList.add("rails-ready");
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(place); };
    const equalise = () => {
      const cards = [...document.querySelectorAll(".biz-card")].filter((c) => c.offsetParent !== null);
      cards.forEach((c) => { c.style.minHeight = ""; });
      const tallest = Math.max(0, ...cards.map((c) => c.offsetHeight));
      if (tallest) cards.forEach((c) => { c.style.minHeight = `${tallest}px`; });
    };
    let resizeTimer = 0;
    const onResize = () => { queue(); clearTimeout(resizeTimer); resizeTimer = setTimeout(equalise, 120); };
    place();
    equalise();
    document.querySelectorAll(".biz-card img").forEach((img) => { if (!img.complete) img.addEventListener("load", equalise, { once: true }); });
    const late = setTimeout(() => { place(); equalise(); }, 400); // after images and fonts settle
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(late);
      clearTimeout(resizeTimer);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);
  return null;
}
