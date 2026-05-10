import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageBreadcrumb from '../components/PageBreadcrumb';
import BlogGrid from './blog/BlogGrid';
import { useJournalPosts } from '../cms/hooks';
import { adaptJournalPosts } from '../cms/adapters';
import { titleText } from '../data/journalPosts';
import PageRenderer from '../blocks/PageRenderer';
import { useSiteContent } from '../context/SiteContent';

export default function Blog() {
  const content = useSiteContent();
  if (content?.pages?.blog?.use_blocks) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <PageRenderer pageKey="blog" />
      </div>
    );
  }
  return <BlogLegacy />;
}

function BlogLegacy() {
  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const { data: rows } = useJournalPosts();
  const adapted = useMemo(() => adaptJournalPosts(rows || []), [rows]);
  const archive = useMemo(() => adapted?.archive || [], [adapted]);

  const filtered = useMemo(() => {
    if (!q) return archive;
    return archive.filter((a) =>
      [titleText(a.title), a.excerpt, a.category, a.author?.name]
        .some((s) => (s || '').toLowerCase().includes(q))
    );
  }, [archive, q]);

  return (
    <div style={{ background: '#F6F8F7' }}>
      <PageBreadcrumb name="Blogs" />
      <BlogGrid articles={filtered} />
    </div>
  );
}
