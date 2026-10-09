"use client";

export const MAX_VIDEO_SECONDS = 30;
const MAX_LONG_SIDE = 960;      // plenty for a phone screen
const VIDEO_BITRATE = 1_200_000; // about 4.5MB for 30 seconds
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

// The best recording format this browser can make. MP4 plays everywhere, so it comes first.
function pickFormat() {
  if (typeof MediaRecorder === "undefined") return null;
  const options = [
    ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "mp4", "video/mp4"],
    ["video/mp4;codecs=avc1,mp4a", "mp4", "video/mp4"],
    ["video/webm;codecs=vp9,opus", "webm", "video/webm"],
    ["video/webm;codecs=vp8,opus", "webm", "video/webm"],
    ["video/webm", "webm", "video/webm"],
  ];
  for (const [mime, ext, type] of options) {
    if (MediaRecorder.isTypeSupported(mime)) return { mime, ext, type };
  }
  return null;
}

function loadVideo(url) {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "auto";
    v.playsInline = true;
    v.muted = false;
    v.src = url;
    // Keep it in the page (some phones pause videos that aren't), but invisible.
    Object.assign(v.style, { position: "fixed", left: "-10000px", top: "0", width: "2px", height: "2px", opacity: "0", pointerEvents: "none" });
    document.body.appendChild(v);
    v.onloadedmetadata = () => resolve(v);
    v.onerror = () => { v.remove(); reject(new Error("That video couldn't be opened. Try recording it again with your phone's camera.")); };
  });
}

// Shrink a phone video in the browser so it uploads quickly and fits the free plan.
// Plays the video through once (up to 30 seconds) and records a smaller copy.
// onProgress gets a number from 0 to 1. Returns { blob, ext, type, seconds, trimmed }.
export async function prepareVideo(file, onProgress = () => {}) {
  if (!file.type.startsWith("video/")) throw new Error("That file isn't a video.");
  const url = URL.createObjectURL(file);
  let video;
  try {
    video = await loadVideo(url);
    const fullLength = Number.isFinite(video.duration) ? video.duration : 0;
    const seconds = Math.min(fullLength || MAX_VIDEO_SECONDS, MAX_VIDEO_SECONDS);
    const trimmed = fullLength > MAX_VIDEO_SECONDS + 0.5;
    const format = pickFormat();

    if (!format || !HTMLCanvasElement.prototype.captureStream) {
      // This phone can't shrink videos. A short clip may still be small enough to send as it is.
      if (file.size <= MAX_UPLOAD_BYTES && !trimmed && /^video\/(mp4|webm|quicktime)$/.test(file.type)) {
        return { blob: file, ext: file.type === "video/webm" ? "webm" : "mp4", type: file.type === "video/webm" ? "video/webm" : "video/mp4", seconds, trimmed: false };
      }
      throw new Error("This phone can't shrink videos, and this one is too big to send as it is. Try a shorter clip, or use Chrome or Safari.");
    }

    const scale = Math.min(1, MAX_LONG_SIDE / Math.max(video.videoWidth || 1, video.videoHeight || 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(2, Math.round((video.videoWidth * scale) / 2) * 2);
    canvas.height = Math.max(2, Math.round((video.videoHeight * scale) / 2) * 2);
    const ctx = canvas.getContext("2d");
    const stream = canvas.captureStream(30);

    // Keep the sound if we can (handy for engines, instruments, clocks). If not, carry on without it.
    let audioCtx = null;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        audioCtx = new AC();
        if (audioCtx.state === "suspended") await audioCtx.resume().catch(() => {});
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest); // not to the speakers, so it records silently
        dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      }
    } catch {
      video.muted = true;
    }

    const recorder = new MediaRecorder(stream, { mimeType: format.mime, videoBitsPerSecond: VIDEO_BITRATE, audioBitsPerSecond: 64_000 });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const finished = new Promise((resolve) => { recorder.onstop = resolve; });

    let raf = 0;
    const draw = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      onProgress(Math.min(1, video.currentTime / seconds));
      if (video.currentTime >= seconds || video.ended) {
        if (recorder.state !== "inactive") recorder.stop();
        video.pause();
        return;
      }
      raf = requestAnimationFrame(draw);
    };

    video.currentTime = 0;
    recorder.start(1000);
    try {
      await video.play();
    } catch {
      // Autoplay with sound blocked: try silently.
      video.muted = true;
      await video.play();
    }
    raf = requestAnimationFrame(draw);
    video.onended = () => { if (recorder.state !== "inactive") recorder.stop(); };
    // Safety net in case the phone stops playing in the background.
    const guard = setTimeout(() => { if (recorder.state !== "inactive") recorder.stop(); }, (seconds + 15) * 1000);
    await finished;
    clearTimeout(guard);
    cancelAnimationFrame(raf);
    stream.getTracks().forEach((t) => t.stop());
    audioCtx?.close?.().catch(() => {});
    onProgress(1);

    const blob = new Blob(chunks, { type: format.type });
    if (!blob.size) throw new Error("The video didn't come out. Please keep this page open while it's being prepared, and try again.");
    if (blob.size > MAX_UPLOAD_BYTES) throw new Error("That video is still too big after shrinking. Try a shorter clip.");
    return { blob, ext: format.ext, type: format.type, seconds: Math.round(seconds), trimmed };
  } finally {
    video?.remove();
    URL.revokeObjectURL(url);
  }
}

// Upload the prepared video for a lot the signed-in seller owns, then attach it.
export async function uploadLotVideo(supabase, { userId, lotId, video }) {
  const path = `${userId}/${lotId}/video-${crypto.randomUUID()}.${video.ext}`;
  const { error: upErr } = await supabase.storage
    .from("lot-photos")
    .upload(path, video.blob, { contentType: video.type, cacheControl: "31536000", upsert: false });
  if (upErr) throw new Error("The video didn't upload. Check your connection and try again.");
  const { error: rowErr } = await supabase.from("lots").update({ video_path: path }).eq("id", lotId);
  if (rowErr) {
    await supabase.storage.from("lot-photos").remove([path]);
    throw new Error(rowErr.message || "The video didn't save. Please try again.");
  }
  return path;
}
