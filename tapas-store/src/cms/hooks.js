// =====================================================================
// cms/hooks.js  —  React hooks over the CMS fetchers.
//
// Each hook returns { data, loading, error }. Loading is true on the
// very first fetch only; subsequent re-mounts hit the in-memory cache
// in client.js and resolve synchronously enough that the loading flash
// is barely visible.
// =====================================================================

import { useEffect, useState } from 'react';
import * as cms from './client';

// Stale-while-revalidate cache. Repeat navigations to the same page
// render the previously-seen data instantly, then refetch in the
// background so dashboard edits still propagate within one tab session.
const lastSeen = new Map();

function useFetch(fetcher, key, deps) {
  const initial = key && lastSeen.has(key) ? lastSeen.get(key) : null;
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(initial === null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let alive = true;
    if (initial === null) setLoading(true);
    fetcher()
      .then((v) => {
        if (!alive) return;
        setData(v);
        setError(null);
        if (key) lastSeen.set(key, v);
      })
      .catch((e) => { if (alive) { setError(e); console.warn('[cms]', e?.message || e); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps || []);
  return { data, loading, error };
}

export function usePage(slug)        { return useFetch(() => cms.fetchPage(slug), `page:${slug}`, [slug]); }
export function useShopBooks()       { return useFetch(() => cms.fetchShopBooks(), 'shop_books'); }
export function useLibraryShelves()  { return useFetch(() => cms.fetchLibraryShelves(), 'library_shelves'); }
export function useEvents()          { return useFetch(() => cms.fetchEvents(), 'events'); }
export function useClubs()           { return useFetch(() => cms.fetchClubs(), 'clubs'); }
export function useFeaturedSupper()  { return useFetch(() => cms.fetchFeaturedSupper(), 'featured_supper'); }
export function useContactInfo()     { return useFetch(() => cms.fetchContactInfo(), 'contact_info'); }
export function useHours()           { return useFetch(() => cms.fetchHours(), 'hours'); }
export function useFaqs()            { return useFetch(() => cms.fetchFaqs(), 'faqs'); }
export function useJournalPosts()    { return useFetch(() => cms.fetchJournalPosts(), 'journal_posts'); }
export function useAbout()           { return useFetch(() => cms.fetchAbout(), 'about'); }
export function useHomeTestimonials(){ return useFetch(() => cms.fetchHomeTestimonials(), 'home_testimonials'); }
