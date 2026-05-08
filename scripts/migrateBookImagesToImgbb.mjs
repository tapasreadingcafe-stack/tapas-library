// One-time migration: convert any base64 data URLs stored in
// books.book_image / books.cover_url into hosted imgbb URLs so the
// Books page query payload shrinks from megabytes to kilobytes.
//
// Usage:
//   SUPABASE_URL=...              \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   IMGBB_API_KEY=...             \
//   node scripts/migrateBookImagesToImgbb.mjs [--dry]
//
// Falls back to REACT_APP_* env vars (loaded from .env) so you can
// run it from the project root without retyping them — but the
// SERVICE_ROLE key must be supplied explicitly; the anon key won't
// have permission to update arbitrary rows under RLS.

import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Tiny .env loader — we don't want a dotenv dep just for this script.
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const IMGBB_KEY = process.env.IMGBB_API_KEY || process.env.REACT_APP_IMGBB_API_KEY;
const DRY = process.argv.includes('--dry');

if (!SUPABASE_URL || !SERVICE_KEY || !IMGBB_KEY) {
  console.error('Missing env. Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, IMGBB_API_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const isBase64 = (v) => typeof v === 'string' && v.startsWith('data:image');

async function uploadToImgbb(dataUrl) {
  // imgbb accepts the raw base64 payload (no data: prefix).
  const base64 = dataUrl.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
  const fd = new FormData();
  fd.append('image', base64);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: fd });
  const json = await res.json();
  if (!json?.success) throw new Error(`imgbb: ${JSON.stringify(json).slice(0, 200)}`);
  return json.data.display_url;
}

const PAGE = 200;
let scanned = 0, fixed = 0, skipped = 0, failed = 0;

for (let offset = 0; ; offset += PAGE) {
  const { data, error } = await supabase
    .from('books')
    .select('id, title, book_image, cover_url')
    .order('id')
    .range(offset, offset + PAGE - 1);
  if (error) { console.error(error); process.exit(1); }
  if (!data || data.length === 0) break;

  for (const row of data) {
    scanned++;
    const needsBookImage = isBase64(row.book_image);
    const needsCoverUrl = isBase64(row.cover_url);
    if (!needsBookImage && !needsCoverUrl) { skipped++; continue; }

    try {
      const update = {};
      // Reuse one upload when both columns hold the same data URL.
      if (needsBookImage && needsCoverUrl && row.book_image === row.cover_url) {
        const url = DRY ? '<dry-run>' : await uploadToImgbb(row.book_image);
        update.book_image = url;
        update.cover_url = url;
      } else {
        if (needsBookImage) update.book_image = DRY ? '<dry-run>' : await uploadToImgbb(row.book_image);
        if (needsCoverUrl)  update.cover_url  = DRY ? '<dry-run>' : await uploadToImgbb(row.cover_url);
      }
      if (!DRY) {
        const { error: upErr } = await supabase.from('books').update(update).eq('id', row.id);
        if (upErr) throw upErr;
      }
      fixed++;
      console.log(`[${fixed}] ${row.id} "${row.title}" → ${Object.keys(update).join(', ')}`);
    } catch (e) {
      failed++;
      console.error(`FAIL ${row.id} "${row.title}": ${e.message}`);
    }
  }

  if (data.length < PAGE) break;
}

console.log(`\nDone. scanned=${scanned} fixed=${fixed} skipped=${skipped} failed=${failed}${DRY ? ' (dry run)' : ''}`);
