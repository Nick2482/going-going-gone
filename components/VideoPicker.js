"use client";
import { useEffect, useRef, useState } from "react";
import { MAX_VIDEO_SECONDS, prepareVideo } from "@/lib/video";
import { PlayIcon } from "@/components/Icons";

// "Add a short video": picks a video, shrinks it on the phone, and shows a preview.
// Calls onChange with the prepared video ({ blob, ext, type, ... }) or null when removed.
export default function VideoPicker({ value, onChange, onBusy = () => {}, disabled = false, label = "Add a short video" }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!value?.blob) { setPreview(""); return undefined; }
    const url = URL.createObjectURL(value.blob);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setNote("");
    setBusy(true);
    onBusy(true);
    setProgress(0);
    try {
      const v = await prepareVideo(file, setProgress);
      onChange(v);
      if (v.trimmed) setNote(`Your video was longer than ${MAX_VIDEO_SECONDS} seconds, so we've kept the first ${MAX_VIDEO_SECONDS}.`);
    } catch (err) {
      setError(err.message || "That video didn't work. Please try another.");
    }
    setBusy(false);
    onBusy(false);
  }

  return (
    <div className="video-pick">
      {preview ? (
        <div className="video-pick-preview">
          <video src={preview} controls playsInline preload="metadata" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onChange(null); setNote(""); }} disabled={disabled}>Remove video</button>
        </div>
      ) : busy ? (
        <div className="video-pick-busy" role="status">
          <span>Preparing your video… {Math.round(progress * 100)}%</span>
          <span className="video-pick-bar"><span style={{ width: `${Math.round(progress * 100)}%` }} /></span>
          <span className="hint">Please keep this page open. It takes about as long as the video itself.</span>
        </div>
      ) : (
        <label className={`video-pick-add${disabled ? " is-disabled" : ""}`}>
          <PlayIcon size={18} />
          <span><strong>{label}</strong> <span className="optional">(optional, up to {MAX_VIDEO_SECONDS} seconds)</span></span>
          <input ref={inputRef} type="file" accept="video/*" onChange={pick} disabled={disabled} />
        </label>
      )}
      {note ? <span className="hint">{note}</span> : null}
      {error ? <span className="error" role="alert">{error}</span> : null}
    </div>
  );
}
