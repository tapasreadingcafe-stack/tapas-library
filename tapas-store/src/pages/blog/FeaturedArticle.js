import React from 'react';
import { Link } from 'react-router-dom';
import { JOURNAL_FEATURED, formatPublished } from '../../data/journalPosts';
import { useJournalPosts } from '../../cms/hooks';
import { adaptJournalPosts } from '../../cms/adapters';

function renderTitle(parts) {
  return parts.map((p, i) => {
    if (!p.em) return <React.Fragment key={i}>{p.t}</React.Fragment>;
    return (
      <em key={i} className={p.em === 'lime' ? 'is-lime' : 'is-white'}>
        {p.t}
      </em>
    );
  });
}

export default function FeaturedArticle() {
  const { data: rows } = useJournalPosts();
  const adapted = adaptJournalPosts(rows || []);
  const a = adapted.featured || JOURNAL_FEATURED;
  if (!a) return null;
  const dateLabel = formatPublished(a.publishedAt).toUpperCase();
  const role = a.author?.role;
  return (
    <Link to={`/blog/${a.slug}`} className="blog-featured">
      <div className="blog-featured-blob" aria-hidden="true" />
      <div className="blog-featured-kicker">
        {(a.kicker || 'FEATURED').toUpperCase()}{dateLabel ? ` · ${dateLabel}` : ''}
      </div>
      <h2 className="blog-featured-title">{renderTitle(a.title)}</h2>
      <div className="blog-featured-author">
        <span className="blog-avatar" aria-hidden="true">{a.author?.initial}</span>
        <div className="blog-featured-author-name">
          {a.author?.name}{' '}
          <span className="dim">
            {role ? `· ${role} ` : ''}· {a.readMinutes} min read
          </span>
        </div>
      </div>
    </Link>
  );
}
