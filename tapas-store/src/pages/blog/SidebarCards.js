import React from 'react';
import { Link } from 'react-router-dom';
import { JOURNAL_SIDEBAR } from '../../data/journalPosts';
import { useJournalPosts } from '../../cms/hooks';
import { adaptJournalPosts } from '../../cms/adapters';

function renderTitle(parts) {
  return parts.map((p, i) => {
    if (!p.em) return <React.Fragment key={i}>{p.t}</React.Fragment>;
    return <em key={i} className={`is-${p.em}`}>{p.t}</em>;
  });
}

export default function SidebarCards() {
  const { data: rows } = useJournalPosts();
  const cards = adaptJournalPosts(rows || []).sidebar;
  const list = cards.length > 0 ? cards : JOURNAL_SIDEBAR;
  return (
    <div className="blog-sidebar">
      {list.map((c) => (
        <Link to={`/blog/${c.slug}`} key={c.slug} className="blog-card">
          <div className={`blog-card-kicker is-${c.kickerColor || 'taupe'}`}>
            {(c.kicker || '').toUpperCase()}
          </div>
          <h3 className="blog-card-title">{renderTitle(c.title)}</h3>
          <p className="blog-card-excerpt">{c.excerpt}</p>
          <div className="blog-card-author-row">
            <span>{c.author.name}</span>
            <span>{c.readMinutes} min</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
