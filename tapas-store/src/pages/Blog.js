import React, { useEffect, useMemo, useState } from 'react';
import JournalHero from './blog/JournalHero';
import FeaturedArticle from './blog/FeaturedArticle';
import SidebarCards from './blog/SidebarCards';
import ArchiveFilters from './blog/ArchiveFilters';
import ArchiveGrid from './blog/ArchiveGrid';
import DispatchNewsletter from './blog/DispatchNewsletter';
import BLOG_CSS from './blog/blogStyles';
import {
  FILTER_TO_CATEGORY,
  titleText,
} from '../data/journalPosts';
import { useJournalPosts } from '../cms/hooks';
import { adaptJournalPosts } from '../cms/adapters';

function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function filterArticles(articles, category, query) {
  const mapped = FILTER_TO_CATEGORY[category]; // undefined for 'All'
  const q = query.trim().toLowerCase();
  return articles.filter((a) => {
    if (mapped && a.category !== mapped) return false;
    if (q) {
      const haystack = [
        titleText(a.title),
        a.excerpt || '',
        a.author?.name || '',
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export default function Blog() {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query, 200);

  const { data: rows } = useJournalPosts();
  const adapted = useMemo(() => adaptJournalPosts(rows || []), [rows]);
  const archive = useMemo(() => adapted?.archive || [], [adapted]);

  const filtered = useMemo(
    () => filterArticles(archive, category, debouncedQuery),
    [archive, category, debouncedQuery],
  );

  const filterEngaged = category !== 'All' || debouncedQuery.trim() !== '';

  return (
    <div className="blog-root">
      <style>{BLOG_CSS}</style>

      <JournalHero />

      <div className="blog-wrap">
        <div className="blog-top">
          <FeaturedArticle />
          <SidebarCards />
        </div>

        <header className="blog-archive-head">
          <div>
            <div className="blog-archive-kicker">The Archive</div>
            <h2 className="blog-archive-title">
              More from <em>the room.</em>
            </h2>
          </div>
          <p className="blog-archive-lede">
            Essays and interviews, sorted however’s useful.
          </p>
        </header>

        <ArchiveFilters
          category={category}
          onCategory={setCategory}
          query={query}
          onQuery={setQuery}
        />

        {filterEngaged && (
          <p className="blog-archive-count" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? 'article' : 'articles'}
          </p>
        )}

        <ArchiveGrid articles={filtered} />

        <DispatchNewsletter />
      </div>
    </div>
  );
}
