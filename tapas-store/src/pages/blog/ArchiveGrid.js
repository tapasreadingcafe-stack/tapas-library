import React from 'react';
import ArchiveCard from './ArchiveCard';

export default function ArchiveGrid({ articles }) {
  if (articles.length === 0) {
    return (
      <div className="blog-archive-empty">
        <h3 className="blog-archive-empty-title">
          No notes yet from that corner.
        </h3>
        <p>Try another category.</p>
      </div>
    );
  }
  return (
    <div className="blog-archive-grid">
      {articles.map((a) => (
        <ArchiveCard key={a.slug} article={a} />
      ))}
    </div>
  );
}
