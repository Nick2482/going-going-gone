"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Full-screen photo viewer: swipe or use the arrows to move between photos,
// tap (or double-tap on phones) to zoom in, Esc or × to close.
export default function PhotoViewer({ srcs, start = 0, title, onClose }) {
  const [i, setI] = useState(start);
  const [zoom, setZoom] = useState(null); // { x, y } in % when zoomed in
  const touch = useRef(null);
  const closeBtn = useRef(null);
  const n = srcs.length;
  const go = useCallback((d) => { setZoom(null); setI((k) => (k + d + n) % n); }, [n]);

  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    return () => { window.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [go, onClose]);

  function toggleZoom(e) {
    if (zoom) return setZoom(null);
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  }
  function onTouchStart(e) { if (e.touches.length === 1) touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }; }
  function onTouchEnd(e) {
    const s = touch.current; touch.current = null;
    if (!s || zoom || n < 2) return;
    const dx = e.changedTouches[0].clientX - s.x, dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - s.t < 800) go(dx < 0 ? 1 : -1);
  }

  return (
    <div className="pv" role="dialog" aria-modal="true" aria-label={`Photos of ${title}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pv-top">
        <span className="pv-count">{n > 1 ? `${i + 1} / ${n}` : ""}</span>
        <button ref={closeBtn} type="button" className="pv-btn" onClick={onClose} aria-label="Close photos">×</button>
      </div>
      <div className="pv-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <img
          key={srcs[i]} src={srcs[i]} alt={`Photo ${i + 1} of ${title}`}
          className={`pv-img${zoom ? " is-zoomed" : ""}`}
          style={zoom ? { transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          onClick={toggleZoom}
        />
      </div>
      {n > 1 ? (
        <>
          <button type="button" className="pv-btn pv-prev" onClick={() => go(-1)} aria-label="Previous photo">‹</button>
          <button type="button" className="pv-btn pv-next" onClick={() => go(1)} aria-label="Next photo">›</button>
        </>
      ) : null}
      <div className="pv-hint">{zoom ? "Tap to zoom out" : n > 1 ? "Swipe or use the arrows · tap to zoom" : "Tap to zoom"}</div>
    </div>
  );
}
