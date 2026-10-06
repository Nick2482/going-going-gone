"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Keeps the "Trusted locally" side panels below the big banner photo on the home page:
// they start under the banner and slide up to sit beside the content as you scroll.
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
    place();
    const late = setTimeout(place, 400); // after images and fonts settle
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      clearTimeout(late);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);
  return null;
}
