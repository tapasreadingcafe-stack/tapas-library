// =====================================================================
// assetLibrary — client helpers for the editor-assets Supabase Storage
// bucket. All interactions with the bucket route through here so the
// AssetsPanel, Replace-image picker, and any future drop targets share
// one pipeline.
//
// Bucket: editor-assets (created by 20260421_editor_assets_bucket.sql)
// Path:   <pageId>/<uuid>.<ext>            — full-resolution
//         <pageId>/thumbs/<uuid>.<ext>     — 400×400 square thumbnail
//
// Why client-side thumbnails: we already have canvas in the browser
// and an edge function would add a 150–400 ms cold-start per upload.
// For the image sizes staff typically work with (< 10 MB) a <canvas>
// resize takes under 200 ms and keeps the upload path dependency-free.
// =====================================================================

import { supabase } from './supabase';

const BUCKET = 'editor-assets';
const THUMB_SIZE = 400;

// Simple UUID-ish generator — avoids importing `uuid`. Good enough for
// object keys (paired with the pageId prefix, 128 bits of randomness
// is overkill for filename collisions).
function randomId() {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Public URL cache — avoids re-deriving the same URL on every render
// of the AssetsPanel grid.
const _publicUrlCache = new Map();
export function publicUrlFor(path) {
  if (!path) return '';
  if (_publicUrlCache.has(path)) return _publicUrlCache.get(path);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = data?.publicUrl || '';
  _publicUrlCache.set(path, url);
  return url;
}

// Classify a storage object by its mime / extension so the panel can
// filter by type without a second round-trip.
export function classifyAsset(file) {
  const name = (file?.name || '').toLowerCase();
  const mime = (file?.metadata?.mimetype || '').toLowerCase();
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'image/svg+xml' || name.endsWith('.svg')) return 'svg';
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif)$/.test(name)) return 'image';
  return 'other';
}

// Draw the given image file onto an off-screen canvas at THUMB_SIZE,
// preserving aspect ratio with center-crop. Resolves with a PNG Blob.
// Returns null for non-raster inputs (SVG / video) so callers can skip
// thumbnail upload for those.
export async function makeThumbnail(file) {
  if (!file || !file.type || !file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return null;
  }
  const bitmap = await createBitmap(file);
  if (!bitmap) return null;
  const { width, height } = bitmap;
  const scale = Math.min(THUMB_SIZE / width, THUMB_SIZE / height);
  const dw = width * scale;
  const dh = height * scale;
  const canvas = document.createElement('canvas');
  canvas.width = THUMB_SIZE;
  canvas.height = THUMB_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4f4f5';
  ctx.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE);
  ctx.drawImage(bitmap, (THUMB_SIZE - dw) / 2, (THUMB_SIZE - dh) / 2, dw, dh);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 0.85));
}

async function createBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file); } catch { /* fall through */ }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

// Sanitize the filename to keep the extension recognisable while
// avoiding spaces / URL-unsafe characters in the object key.
function extOf(file) {
  const name = file?.name || '';
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : 'bin';
}

// -------- Upload ----------------------------------------------------
// Returns { id, name, size, type, path, thumb_path, url, thumb_url }.
// Progress is reported via the optional onProgress(fraction) callback;
// Supabase JS v2 doesn't yet expose upload progress, so we approximate
// with a two-step indicator (pre-upload → post-upload).
export async function uploadAsset(file, { pageId = 'site', onProgress } = {}) {
  if (!file) throw new Error('No file provided');
  const id = randomId();
  const ext = extOf(file);
  const path = `${pageId}/${id}.${ext}`;

  onProgress?.(0.05);
  const thumbBlob = await makeThumbnail(file);
  onProgress?.(0.25);

  // Upload the full-resolution file first — if this fails, we never
  // orphan a thumbnail.
  const { error: upErr } = await supabase
    .storage.from(BUCKET)
    .upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      cacheControl: '31536000',
      upsert: false,
    });
  if (upErr) throw new Error(`Upload failed: ${upErr.message || upErr}`);
  onProgress?.(0.75);

  let thumbPath = null;
  if (thumbBlob) {
    thumbPath = `${pageId}/thumbs/${id}.png`;
    const { error: thErr } = await supabase
      .storage.from(BUCKET)
      .upload(thumbPath, thumbBlob, {
        contentType: 'image/png',
        cacheControl: '31536000',
        upsert: false,
      });
    // Thumbnail failures are non-fatal — the grid just falls back to
    // the full asset and logs the issue.
    if (thErr) {
      console.warn(`Thumbnail upload failed for ${path}: ${thErr.message}`);
      thumbPath = null;
    }
  }
  onProgress?.(1);

  return {
    id,
    name: file.name,
    size: file.size,
    type: file.type,
    path,
    thumb_path: thumbPath,
    url: publicUrlFor(path),
    thumb_url: thumbPath ? publicUrlFor(thumbPath) : publicUrlFor(path),
  };
}

// -------- List ------------------------------------------------------
// Paginated listing across every pageId prefix. Supabase's list() only
// returns one directory at a time, so we first list the prefixes, then
// each prefix's files. Thumbnails are paired back to their full file
// via shared UUID.
export async function listAssets({ pageId } = {}) {
  const roots = pageId ? [pageId] : await listRootPrefixes();
  const files = [];
  for (const root of roots) {
    const { data, error } = await supabase.storage.from(BUCKET).list(root, {
      limit: 1000,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (error) {
      console.warn(`list(${root}) failed: ${error.message}`);
      continue;
    }
    for (const entry of data || []) {
      // Skip the `thumbs/` sub-folder marker — listed separately below.
      if (!entry.name || entry.name === 'thumbs') continue;
      const path = `${root}/${entry.name}`;
      const m = /^([^.]+)\.([^.]+)$/.exec(entry.name);
      const uid = m ? m[1] : entry.name;
      const thumbPath = `${root}/thumbs/${uid}.png`;
      files.push({
        id: uid,
        name: entry.name,
        size: entry.metadata?.size || 0,
        type: entry.metadata?.mimetype || '',
        path,
        thumb_path: thumbPath,
        url: publicUrlFor(path),
        thumb_url: publicUrlFor(thumbPath),
        created_at: entry.created_at,
        kind: classifyAsset(entry),
        page_id: root,
      });
    }
  }
  return files;
}

async function listRootPrefixes() {
  const { data, error } = await supabase.storage.from(BUCKET).list('', {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  });
  if (error) return ['site'];
  return (data || [])
    .filter((e) => e && e.id == null && e.name && !e.name.startsWith('.'))
    .map((e) => e.name);
}

// -------- Delete ----------------------------------------------------
// Removes both the full file and its thumbnail (if present). Silent
// when the thumbnail doesn't exist — the RLS policy returns 404 which
// the client treats as "already gone".
export async function deleteAsset(asset) {
  if (!asset?.path) return;
  const targets = [asset.path];
  if (asset.thumb_path && asset.thumb_path !== asset.path) {
    targets.push(asset.thumb_path);
  }
  const { error } = await supabase.storage.from(BUCKET).remove(targets);
  if (error && !/not.?found/i.test(error.message || '')) {
    throw new Error(`Delete failed: ${error.message || error}`);
  }
}
