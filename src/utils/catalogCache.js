// Local-first catalog cache — the first brick of offline mode.
//
// Keeps a lightweight copy of the book catalog on-device so the POS (and later
// Books / Borrow) render INSTANTLY instead of re-downloading the whole catalog
// from Supabase on every open. Cover images are intentionally NOT cached here:
// ~531 books store their cover as a large base64 blob directly in the row
// (~52 MB total), which is what made the catalog slow to load. A lightweight
// catalog (no images) is ~230 KB and loads in well under a second.
//
// Uses localStorage for a synchronous, instant first paint. When full offline
// mode lands (all-time history, writes + sync) this moves to IndexedDB, but the
// read API here (readCachedBooks / writeCachedBooks) can stay the same.

const KEY = 'tapas_catalog_books_v1';

// Columns the POS/catalog needs — deliberately WITHOUT book_image.
export const CATALOG_COLS =
  'id, book_id, title, author, category, price, mrp, sales_price, quantity_available, quantity_total';

export function readCachedBooks() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.books) ? parsed.books : null;
  } catch {
    return null;
  }
}

export function writeCachedBooks(books) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ books, cachedAt: Date.now() }));
  } catch {
    // localStorage full or unavailable (e.g. private mode) — cache is best-effort.
  }
}
