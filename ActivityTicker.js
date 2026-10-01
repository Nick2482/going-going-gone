"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { gbp } from "@/lib/format";
import { BID_FIELDS, NEW_LOT_FIELDS, ago, bidEvent, listingEvent, mergeEvents } from "@/lib/activity";

// A one-line live feed: new bids and new listings, rotating every few seconds.
// When something new happens it jumps to the front and the lot prices on the page refresh.
export default function ActivityTicker({ initial }) {
  const supabase = createClient();
  const router = useRouter();
  const [events, setEvents] = useState(initial);
  const [idx, setIdx] = useState(0);
  const [fresh, setFresh] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const refreshTimer = useRef(null);

  // Rotate through recent events.
  useEffect(() => {
    if (events.length < 2) return;
    const t = setInterval(() => { setIdx((i) => (i + 1) % Math.min(events.length, 8)); setNow(Date.now()); }, 4500);
    return () => clearInterval(t);
  }, [events.length]);

  // Live updates.
  useEffect(() => {
    const push = (ev) => {
      if (!ev) return;
      setEvents((prev) => mergeEvents([ev], prev));
      setIdx(0);
      setFresh(ev.key);
      setNow(Date.now());
      // Refresh the lot cards on the page so prices stay current (at most every few seconds).
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 2500);
    };
    const channel = supabase
      .channel("activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bids" }, async (payload) => {
        const { data } = await supabase.from("bids").select(BID_FIELDS).eq("id", payload.new.id).maybeSingle();
        push(bidEvent(data));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "lots" }, async (payload) => {
        const { data } = await supabase.from("lots").select(NEW_LOT_FIELDS).eq("id", payload.new.id).maybeSingle();
        push(listingEvent(data));
      })
      .subscribe();
    return () => { clearTimeout(refreshTimer.current); supabase.removeChannel(channel); };
  }, [supabase, router]);

  if (!events.length) return null;
  const ev = events[Math.min(idx, events.length - 1)];

  return (
    <div className="ticker" role="status" aria-live="polite">
      <div className="wrap ticker-inner">
        <span className="ticker-live"><span className="ticker-dot" aria-hidden="true" />Live</span>
        <Link key={ev.key} href={`/lot/${ev.lotId}`} className={`ticker-item${fresh === ev.key ? " ticker-fresh" : ""}`}>
          {ev.kind === "listed" ? (
            <><strong>New lot:</strong> {ev.title} <span className="ticker-muted">in {ev.category}</span></>
          ) : ev.kind === "bought" ? (
            <><strong>{ev.who}</strong> bought <strong>{ev.title}</strong> with Buy it now</>
          ) : (
            <><strong>{ev.who}</strong> bid <strong className="num">{gbp(ev.amount)}</strong> on {ev.title}</>
          )}
          <span className="ticker-muted" suppressHydrationWarning> · {ago(ev.at, now)}</span>
        </Link>
      </div>
    </div>
  );
}
