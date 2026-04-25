// =====================================================================
// cms/client.js  —  Phase 3 data layer.
//
// Thin wrapper around supabase-js that the CMS hooks consume. Each
// fetcher returns a promise; the hooks plug them into useEffect/useState.
//
// Responsibilities:
//   * One supabase query per typed CMS table.
//   * In-memory cache keyed by table + (optional) options. 60s TTL —
//     mirrors "edits show up within a minute" requirement.
//   * `?preview=draft` URL flag bypasses the cache so dashboard iframe
//     edits show immediately. RLS still scopes which rows are visible
//     (status='published' for public; 'draft' OR 'published' for the
//     staff session that owns the dashboard editor — Phase 4).
// =====================================================================

import { supabase } from '../utils/supabase';

const TTL_MS = 60_000;
const cache = new Map();

function isDraftPreview() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('preview') === 'draft';
  } catch {
    return false;
  }
}

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.t > TTL_MS) { cache.delete(key); return null; }
  return entry.v;
}
function cacheSet(key, v) { cache.set(key, { v, t: Date.now() }); }
export function clearCmsCache() { cache.clear(); }

// Wraps a supabase fetch with cache + draft-preview bypass.
async function cached(key, fn) {
  if (isDraftPreview()) return fn();
  const hit = cacheGet(key);
  if (hit) return hit;
  const v = await fn();
  cacheSet(key, v);
  return v;
}

// ---------------------------------------------------------------------
// Page-level metadata (hero copy, meta tags, page-level stats blob).
// ---------------------------------------------------------------------
export async function fetchPage(slug) {
  return cached(`page:${slug}`, async () => {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return data;
  });
}

// ---------------------------------------------------------------------
// shop_books
// ---------------------------------------------------------------------
export async function fetchShopBooks() {
  return cached('shop_books', async () => {
    const { data, error } = await supabase
      .from('shop_books')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return data || [];
  });
}

// ---------------------------------------------------------------------
// library_shelves with their books nested. One round-trip for the
// whole page.
// ---------------------------------------------------------------------
export async function fetchLibraryShelves() {
  return cached('library_shelves+books', async () => {
    const [{ data: shelves, error: e1 }, { data: books, error: e2 }] = await Promise.all([
      supabase.from('library_shelves').select('*').order('sort_order'),
      supabase.from('library_books').select('*').order('sort_order'),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    const byShelf = new Map();
    (books || []).forEach((b) => {
      if (!byShelf.has(b.shelf_id)) byShelf.set(b.shelf_id, []);
      byShelf.get(b.shelf_id).push(b);
    });
    return (shelves || []).map((s) => ({ ...s, books: byShelf.get(s.id) || [] }));
  });
}

// ---------------------------------------------------------------------
// tapas_events  +  clubs  +  featured_supper  (events page)
// ---------------------------------------------------------------------
export async function fetchEvents() {
  return cached('tapas_events', async () => {
    const { data, error } = await supabase
      .from('tapas_events')
      .select('*')
      .order('event_date');
    if (error) throw error;
    return data || [];
  });
}

export async function fetchClubs() {
  return cached('clubs', async () => {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return data || [];
  });
}

export async function fetchFeaturedSupper() {
  return cached('featured_supper', async () => {
    const { data, error } = await supabase
      .from('featured_supper')
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data;
  });
}

// ---------------------------------------------------------------------
// contact_info  +  hours  +  faqs  (contact page)
// ---------------------------------------------------------------------
export async function fetchContactInfo() {
  return cached('contact_info', async () => {
    const { data, error } = await supabase
      .from('contact_info')
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data;
  });
}

export async function fetchHours() {
  return cached('hours', async () => {
    const { data, error } = await supabase
      .from('hours')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return data || [];
  });
}

export async function fetchFaqs() {
  return cached('faqs', async () => {
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return data || [];
  });
}

// ---------------------------------------------------------------------
// journal_posts (blog page — renamed in Phase 2)
// ---------------------------------------------------------------------
export async function fetchJournalPosts() {
  return cached('journal_posts', async () => {
    const { data, error } = await supabase
      .from('journal_posts')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return data || [];
  });
}

// ---------------------------------------------------------------------
// about_*  —  one round-trip via Promise.all
// ---------------------------------------------------------------------
export async function fetchAbout() {
  return cached('about', async () => {
    const [
      { data: manifesto, error: e1 },
      { data: stats,     error: e2 },
      { data: timeline,  error: e3 },
      { data: compromises, error: e4 },
      { data: team,      error: e5 },
      { data: press,     error: e6 },
    ] = await Promise.all([
      supabase.from('about_manifesto').select('*').maybeSingle(),
      supabase.from('about_stats').select('*').order('sort_order'),
      supabase.from('about_timeline').select('*').order('sort_order'),
      supabase.from('about_compromises').select('*').order('sort_order'),
      supabase.from('team_members').select('*').order('sort_order'),
      supabase.from('press_quotes').select('*').order('sort_order'),
    ]);
    const err = e1 || e2 || e3 || e4 || e5 || e6;
    if (err) throw err;
    return {
      manifesto:    manifesto || null,
      stats:        stats || [],
      timeline:     timeline || [],
      compromises:  compromises || [],
      team:         team || [],
      press:        press || [],
    };
  });
}
