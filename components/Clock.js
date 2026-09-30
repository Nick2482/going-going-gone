"use client";
import { useEffect, useState } from "react";
import { stage, STAGE_LABEL, timeLeft, when } from "@/lib/format";

// Ticks once a second so "Going once / Going twice / Sold" and the clock stay live.
function useNow(active = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

export function StagePill({ endsAt, bidCount, reserveStatus, className = "" }) {
  const now = useNow();
  const s = stage(endsAt, bidCount, now, reserveStatus);
  return <span className={`pill p-${s} ${className}`} suppressHydrationWarning>{STAGE_LABEL[s]}</span>;
}

export function TimeLeft({ endsAt, className = "time" }) {
  const now = useNow();
  const ended = new Date(endsAt).getTime() <= now;
  return (
    <span className={className} suppressHydrationWarning>
      {ended ? `Ended ${when(endsAt)}` : timeLeft(endsAt, now)}
    </span>
  );
}
