import React from 'react';
import BlogGridCard from './BlogGridCard';

const CSS = `
  .blog-grid-section {
    background: #F6F8F7;
    padding: 24px 0 96px;
    font-family: 'Poppins', system-ui, sans-serif;
  }
  .blog-grid-wrap {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 64px;
  }
  .blog-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
  }
  .blog-grid-card {
    background: #fff;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06);
    transition: transform 200ms, box-shadow 200ms;
  }
  .blog-grid-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 14px 36px rgba(0,0,0,0.10);
  }
  .blog-grid-card-image {
    display: block;
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 3;
    text-decoration: none;
  }
  .blog-grid-card-date {
    position: absolute;
    left: 18px;
    bottom: 18px;
    background: #fff;
    border-radius: 8px;
    padding: 8px 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1;
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  }
  .blog-grid-card-date .day {
    font-weight: 700;
    font-size: 18px;
    color: #1a1a1a;
  }
  .blog-grid-card-date .month {
    font-size: 11px;
    font-weight: 600;
    color: #4a4a4a;
    margin-top: 3px;
    letter-spacing: 0.04em;
  }
  .blog-grid-card-body {
    padding: 22px 22px 26px;
  }
  .blog-grid-card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 14px 18px;
    font-size: 12px;
    color: #6e6e6e;
    margin-bottom: 12px;
  }
  .blog-grid-card-meta span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .blog-grid-card-title {
    margin: 0 0 16px;
    font-weight: 600;
    font-size: 16px;
    line-height: 1.45;
    color: #1a1a1a;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: calc(1.45em * 2);
  }
  .blog-grid-card-title a {
    color: inherit;
    text-decoration: none;
    transition: color 150ms;
  }
  .blog-grid-card-title a:hover { color: #8A58DB; }
  .blog-grid-card-more {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #2da44e;
    text-decoration: none;
    transition: gap 150ms;
  }
  .blog-grid-card-more:hover { gap: 10px; }

  .blog-grid-empty {
    grid-column: 1 / -1;
    text-align: center;
    color: #6e6e6e;
    padding: 48px 0;
    font-size: 14px;
  }

  @media (max-width: 1023px) {
    .blog-grid-section { padding: 48px 0 72px; }
    .blog-grid-wrap { padding: 0 40px; }
    .blog-grid { grid-template-columns: repeat(2, 1fr); gap: 24px; }
  }
  @media (max-width: 639px) {
    .blog-grid-section { padding: 32px 0 56px; }
    .blog-grid-wrap { padding: 0 20px; }
    .blog-grid { grid-template-columns: 1fr; gap: 20px; }
  }
`;

export default function BlogGrid({ articles }) {
  return (
    <section className="blog-grid-section">
      <style>{CSS}</style>
      <div className="blog-grid-wrap">
        <div className="blog-grid">
          {articles.length === 0 ? (
            <p className="blog-grid-empty">No articles yet.</p>
          ) : (
            articles.map((a) => <BlogGridCard key={a.slug} article={a} />)
          )}
        </div>
      </div>
    </section>
  );
}
