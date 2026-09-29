"use client";
import { MAX_PHOTOS } from "./format";

// Resize a photo in the browser and return a JPEG Blob. Keeps uploads small
// (around 200-500KB) so pages load fast on mobile data.
export async function compressPhoto(file, maxSide = 1600, quality = 0.82) {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} isn't a photo.`);
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`Couldn't read ${file.name}. Try a JPEG or PNG. iPhone users: set Camera > Formats to "Most Compatible".`);
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
  if (!blob) throw new Error(`Couldn't process ${file.name}.`);
  return blob;
}

// Upload photos for a lot the signed-in user owns. Returns the storage paths saved.
export async function uploadLotPhotos(supabase, { userId, lotId, blobs, startPosition = 0 }) {
  const saved = [];
  for (let i = 0; i < blobs.length; i++) {
    const path = `${userId}/${lotId}/${crypto.randomUUID()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("lot-photos")
      .upload(path, blobs[i], { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
    if (upErr) throw new Error("A photo didn't upload. Check your connection and try again.");
    const { error: rowErr } = await supabase.from("lot_photos").insert({ lot_id: lotId, path, position: startPosition + i });
    if (rowErr) {
      await supabase.storage.from("lot-photos").remove([path]);
      throw new Error(`Each lot can have up to ${MAX_PHOTOS} photos.`);
    }
    saved.push(path);
  }
  return saved;
}
