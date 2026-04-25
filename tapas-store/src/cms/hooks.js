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

function useFetch(fetcher, deps) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetcher()
      .then((v) => { if (alive) { setData(v); setError(null); } })
      .catch((e) => { if (alive) { setError(e); console.warn('[cms]', e?.message || e); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps || []);
  return { data, loading, error };
}

export function usePage(slug)        { return useFetch(() => cms.fetchPage(slug), [slug]); }
export function useShopBooks()       { return useFetch(() => cms.fetchShopBooks()); }
export function useLibraryShelves()  { return useFetch(() => cms.fetchLibraryShelves()); }
export function useEvents()          { return useFetch(() => cms.fetchEvents()); }
export function useClubs()           { return useFetch(() => cms.fetchClubs()); }
export function useFeaturedSupper()  { return useFetch(() => cms.fetchFeaturedSupper()); }
export function useContactInfo()     { return useFetch(() => cms.fetchContactInfo()); }
export function useHours()           { return useFetch(() => cms.fetchHours()); }
export function useFaqs()            { return useFetch(() => cms.fetchFaqs()); }
export function useJournalPosts()    { return useFetch(() => cms.fetchJournalPosts()); }
export function useAbout()           { return useFetch(() => cms.fetchAbout()); }
