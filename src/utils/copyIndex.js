/* Which books are actually for sale, and which are on the lending shelf.
 *
 * The books table can't answer that. A title has physical copies, and each
 * copy is either stock to sell (S-…) or a library copy that goes out on loan
 * (B-…) — the same title can have both. Without this, the sell grid listed
 * every book in the building at ₹0, most of which are lending copies nobody
 * may buy.
 *
 * copy_kind is the source of truth and the printed prefix is only a label
 * (see 20260613_book_copy_kind.sql), but the two disagree on a couple of dozen
 * copies, so a copy counts as sale stock if EITHER says so — better to offer a
 * book that is for sale than to hide one that is.
 *
 * Only copies that are actually on the shelf are counted: a sold or issued
 * copy is not something the counter can hand over today.
 *
 * ~1,900 copies come to roughly 100 KB, so this is one small fetch, cached
 * next to the catalog for an instant first paint.
 */
import { supabase } from './supabase';

const KEY = 'tapas_copy_index_v1';
const PAGE = 1000;   // Supabase caps a select at 1000 rows; ask page by page.

export const isSaleCopy = (copy) =>
  copy.copy_kind === 'sale' || /^S-/i.test(copy.copy_code || '');

/** { [bookId]: { sale: n, saleCode, library: n, libraryCode } } */
export function buildCopyIndex(copies) {
  const index = {};
  for (const copy of copies) {
    if (!copy.book_id) continue;
    const entry = index[copy.book_id] || (index[copy.book_id] = { sale: 0, saleCode: null, library: 0, libraryCode: null });
    if (isSaleCopy(copy)) {
      entry.sale += 1;
      if (!entry.saleCode) entry.saleCode = copy.copy_code;
    } else {
      entry.library += 1;
      if (!entry.libraryCode) entry.libraryCode = copy.copy_code;
    }
  }
  return index;
}

export function readCachedCopyIndex() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.index === 'object' ? parsed.index : null;
  } catch {
    return null;
  }
}

export function writeCachedCopyIndex(index) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ index, cachedAt: Date.now() }));
  } catch {
    // Best-effort, exactly like the catalog cache.
  }
}

/** Every copy currently on the shelf, folded into the index above. */
export async function fetchCopyIndex() {
  const copies = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('book_copies')
      .select('book_id, copy_code, copy_kind')
      .eq('status', 'available')
      .order('copy_code')
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    copies.push(...data);
    if (data.length < PAGE) break;
  }
  return buildCopyIndex(copies);
}
