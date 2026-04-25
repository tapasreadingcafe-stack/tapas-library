import React from 'react';
import { Link } from 'react-router-dom';
import { CATEGORY_PILL } from '../../data/journalPosts';

function renderTitle(parts) {
  return parts.map((p, i) => {
    if (!p.em) return <React.Fragment key={i}>{p.t}</React.Fragment>;
    return <em key={i}>{p.t}</em>;
  });
}

export default function ArchiveCard({ article }) {
  const bannerClass = `blog-archive-banner c-${article.color} is-${article.color}`;
  return (
    <Link to={`/blog/${article.slug}`} className="blog-archive-card">
      <div className={bannerClass}>
        <span className="blog-archive-tag">
          {CATEGORY_PILL[article.category] || article.category.toUpperCase()}
        </span>
        <h3 className="blog-archive-title-text">{renderTitle(article.title)}</h3>
      </div>
      <div className="blog-archive-body">
        <p className="blog-archive-excerpt">{article.excerpt}</p>
        <div className="blog-archive-author">
          <span className="blog-archive-author-left">
            <span className="blog-avatar is-sm" aria-hidden="true">
              {article.author.initial}
            </span>
            {article.author.name}
          </span>
          <span>{article.readMinutes} min</span>
        </div>
      </div>
    </Link>
  );
}
