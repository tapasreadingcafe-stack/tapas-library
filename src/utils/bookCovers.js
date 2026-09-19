/* Cover images, fetched a screenful at a time.
 *
 * Why this exists: ~531 books keep their cover as a base64 blob in
 * books.book_image, about 52 MB across the table. Asking for that column
 * alongside the catalog is what used to make the POS crawl — and on the MICRO
 * instance a select('*') over these rows has been enough to OOM Postgres. So
 * the catalog is fetched without images (see catalogCache) and covers come
 * from here instead: only for the tiles actually on screen, a handful per
 * request, each one remembered so scrolling back is instant.
 *
 * A cover that fails to load is not an error worth showing anyone — the tile
 * falls back to its 📖 placeholder, which is what it looked like before.
 */
import { supabase } from './supabase';

const cache = new Map();     // bookId → data URL, or null when the book has no cover
const waiting = new Map();   // bookId → [resolve, …] for a fetch already in flight
let queue = [];
let timer = null;

// Small enough that one request is a few hundred KB rather than megabytes, and
// that a fast scroll doesn't queue up a minute of work.
const BATCH = 8;
const DELAY_MS = 120;
// Roughly 12 screenfuls of tiles. Past that the oldest are dropped, so a long
// session browsing the whole catalog can't quietly eat 50 MB of memory.
const MAX_CACHED = 120;

function remember(id, value) {
  cache.set(id, value);
  if (cache.size > MAX_CACHED) {
    // Map keeps insertion order, so the first key is the least recently added.
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  const resolvers = waiting.get(id);
  waiting.delete(id);
  if (resolvers) resolvers.forEach((fn) => fn(value));
}

async function run() {
  timer = null;
  const ids = queue.splice(0, BATCH);
  if (ids.length === 0) return;
  try {
    const { data, error } = await supabase.from('books').select('id, book_image').in('id', ids);
    if (error) throw error;
    const found = new Map((data || []).map((row) => [row.id, row.book_image || null]));
    ids.forEach((id) => remember(id, found.get(id) ?? null));
  } catch {
    // Offline, or the row is gone. Placeholder, and don't ask again this session.
    ids.forEach((id) => remember(id, null));
  }
  if (queue.length > 0) schedule();
}

function schedule() {
  if (timer) return;
  timer = setTimeout(run, DELAY_MS);
}

/** The cover if it's already in hand, otherwise undefined (never a fetch). */
export const cachedCover = (bookId) => cache.get(bookId);

/** Ask for one book's cover. Resolves with a data URL, or null if it has none. */
export function requestCover(bookId) {
  if (!bookId) return Promise.resolve(null);
  if (cache.has(bookId)) return Promise.resolve(cache.get(bookId));
  return new Promise((resolve) => {
    const already = waiting.get(bookId);
    if (already) { already.push(resolve); return; }
    waiting.set(bookId, [resolve]);
    queue.push(bookId);
    schedule();
  });
}
