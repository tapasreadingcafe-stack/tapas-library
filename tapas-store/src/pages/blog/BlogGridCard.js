import React from 'react';
import { Link } from 'react-router-dom';
import { titleText } from '../../data/journalPosts';

const COLOR_TO_BG = {
  purple: 'linear-gradient(155deg, #8F4FD6 0%, #5a2b9a 100%)',
  orange: 'linear-gradient(155deg, #FF934A 0%, #c65a1e 100%)',
  ink:    'linear-gradient(155deg, #1a1a1a 0%, #3a3a3a 100%)',
  pink:   'linear-gradient(155deg, #E0004F 0%, #8a002f 100%)',
  lime:   'linear-gradient(155deg, #C9F27F 0%, #8ac13a 100%)',
  taupe:  'linear-gradient(155deg, #5b4d3d 0%, #2c241b 100%)',
};

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function formatDate(iso) {
  if (!iso) return { day: '01', month: 'JAN' };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { day: '01', month: 'JAN' };
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: MONTHS[d.getMonth()],
  };
}

function TagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12V4h8l10 10-8 8L3 12z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function CommentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5h16v11H8.5L4 19V5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function BlogGridCard({ article }) {
  const { day, month } = formatDate(article.publishedAt);
  const bg = COLOR_TO_BG[article.color] || COLOR_TO_BG.purple;
  const comments = article.commentsCount ?? Math.max(3, article.readMinutes * 4);

  return (
    <article className="blog-grid-card">
      <Link to={`/blog/${article.slug}`} className="blog-grid-card-image" style={{ background: bg }} aria-label={titleText(article.title)}>
        <div className="blog-grid-card-date">
          <span className="day">{day}</span>
          <span className="month">{month}</span>
        </div>
      </Link>
      <div className="blog-grid-card-body">
        <div className="blog-grid-card-meta">
          <span><TagIcon /> {article.category}</span>
          <span><UserIcon /> By {article.author?.name || 'Admin'}</span>
          <span><CommentIcon /> {comments} Comments</span>
        </div>
        <h3 className="blog-grid-card-title">
          <Link to={`/blog/${article.slug}`}>{titleText(article.title)}</Link>
        </h3>
        <Link to={`/blog/${article.slug}`} className="blog-grid-card-more">
          Read More <ArrowIcon />
        </Link>
      </div>
    </article>
  );
}
