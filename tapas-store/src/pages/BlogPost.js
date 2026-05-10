import React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  JOURNAL_FEATURED,
  JOURNAL_SIDEBAR,
  JOURNAL_ARCHIVE,
  titleText,
  formatPublished,
} from '../data/journalPosts';

const COLOR_TO_BG = {
  purple: 'linear-gradient(155deg, #8F4FD6 0%, #2c1450 100%)',
  orange: 'linear-gradient(155deg, #FF934A 0%, #5a2509 100%)',
  ink:    'linear-gradient(155deg, #2a2a2a 0%, #0a0a0a 100%)',
  pink:   'linear-gradient(155deg, #E0004F 0%, #4a0019 100%)',
  lime:   'linear-gradient(155deg, #6f8a3d 0%, #2c361b 100%)',
  taupe:  'linear-gradient(155deg, #5b4d3d 0%, #1a140d 100%)',
};

const CSS = `
  .blogpost-root { background: #F6F8F7; font-family: 'Poppins', system-ui, sans-serif; color: #1a1a1a; }

  .blogpost-crumb {
    background: #f3f3f4;
    padding: 18px 0;
    font-size: 13px;
    color: #1a1a1a;
  }
  .blogpost-crumb-wrap {
    max-width: 1320px;
    margin: 0 auto;
    padding: 0 64px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .blogpost-crumb-wrap a { color: #1a1a1a; text-decoration: none; }
  .blogpost-crumb-wrap a:hover { color: #6e6e6e; }
  .blogpost-crumb-sep { color: #6e6e6e; }
  .blogpost-crumb-current {
    color: #1a1a1a;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 320px;
  }

  .blogpost-hero {
    padding: 24px 0 0;
  }
  .blogpost-hero-wrap {
    max-width: 1320px;
    margin: 0 auto;
    padding: 0 64px;
  }
  .blogpost-hero-frame {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: 6px;
    overflow: hidden;
    color: #fff;
  }
  .blogpost-hero-frame::after {
    content: "";
    position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 80%, rgba(0,0,0,0.65) 100%);
    pointer-events: none;
  }
  .blogpost-hero-chips {
    position: absolute;
    top: 28px;
    left: 28px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    z-index: 1;
  }
  .blogpost-hero-chip {
    background: rgba(255,255,255,0.18);
    backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,0.35);
    color: #fff;
    border-radius: 999px;
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 500;
  }
  .blogpost-hero-content {
    position: absolute;
    left: 32px; right: 32px; bottom: 32px;
    z-index: 1;
  }
  .blogpost-hero-title {
    margin: 0 0 14px;
    font-weight: 700;
    font-size: clamp(24px, 3.6vw, 44px);
    line-height: 1.1;
    letter-spacing: -0.01em;
    text-transform: uppercase;
    max-width: 22ch;
  }
  .blogpost-hero-subtitle {
    margin: 0 0 18px;
    font-size: clamp(14px, 1.4vw, 20px);
    line-height: 1.4;
    color: rgba(255,255,255,0.92);
    font-weight: 400;
    max-width: 60ch;
  }
  .blogpost-hero-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 18px;
    font-size: 13px;
    color: rgba(255,255,255,0.85);
  }
  .blogpost-hero-meta > span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .blogpost-hero-meta .sep { color: rgba(255,255,255,0.5); }
  .blogpost-hero-meta .icons {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    margin-left: 4px;
    margin-right: 4px;
  }
  .blogpost-hero-meta .icons svg { width: 14px; height: 14px; }

  .blogpost-body {
    max-width: 1320px;
    margin: 0 auto;
    padding: 64px 64px 96px;
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 56px;
  }
  .blogpost-share {
    text-align: center;
    position: sticky;
    top: 110px;
    align-self: start;
  }
  .blogpost-share-count {
    font-weight: 700;
    font-size: 32px;
    line-height: 1;
    color: #1a1a1a;
  }
  .blogpost-share-label {
    font-size: 12px;
    color: #6e6e6e;
    margin-top: 4px;
    margin-bottom: 28px;
    letter-spacing: 0.04em;
  }
  .blogpost-share-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: center;
  }
  .blogpost-share-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .blogpost-share-btn {
    width: 36px; height: 36px;
    border-radius: 999px;
    display: inline-grid;
    place-items: center;
    color: #fff;
    text-decoration: none;
    border: 0;
    cursor: pointer;
    transition: transform 150ms;
  }
  .blogpost-share-btn:hover { transform: translateY(-2px); }
  .blogpost-share-btn svg { width: 16px; height: 16px; }
  .blogpost-share-btn.fb { background: #1877f2; }
  .blogpost-share-btn.tw { background: #1d9bf0; }
  .blogpost-share-btn.pin { background: #e60023; }
  .blogpost-share-btn.gm { background: #d44638; }
  .blogpost-share-pill {
    border: 1px solid #d6d6d6;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 11px;
    color: #1a1a1a;
    font-weight: 500;
  }

  .blogpost-content { max-width: 720px; }
  .blogpost-content p {
    margin: 0 0 22px;
    font-size: 16px;
    line-height: 1.7;
    color: #2a2a2a;
  }
  .blogpost-content h2 {
    margin: 36px 0 18px;
    font-weight: 700;
    font-size: 28px;
    line-height: 1.25;
    letter-spacing: -0.01em;
    color: #1a1a1a;
  }
  .blogpost-content a { color: #1a1a1a; text-decoration: underline; }
  .blogpost-content a:hover { color: #6e6e6e; }

  .blogpost-back {
    display: inline-block;
    margin-top: 32px;
    color: #8A58DB;
    text-decoration: none;
    font-weight: 500;
    font-size: 14px;
  }
  .blogpost-back:hover { color: #5a2b9a; }

  @media (max-width: 1023px) {
    .blogpost-crumb-wrap, .blogpost-hero-wrap { padding: 0 40px; }
    .blogpost-body { grid-template-columns: 1fr; padding: 48px 40px 72px; gap: 32px; }
    .blogpost-share { position: static; display: flex; gap: 12px; justify-content: flex-start; align-items: center; }
    .blogpost-share-list { flex-direction: row; }
    .blogpost-share-label { margin: 0 16px 0 0; }
    .blogpost-share-pill { display: none; }
  }
  @media (max-width: 639px) {
    .blogpost-crumb-wrap, .blogpost-hero-wrap { padding: 0 20px; }
    .blogpost-body { padding: 32px 20px 56px; }
    .blogpost-hero-frame { aspect-ratio: 4 / 3; }
    .blogpost-hero-content { left: 20px; right: 20px; bottom: 20px; }
    .blogpost-hero-chips { top: 16px; left: 16px; }
  }
`;

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function ShareGroupIcon() {
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.25-1.5 1.55-1.5H17V4.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.45-4 4.1v2.3H8v3.1h2.6V22h2.9z"/></svg>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 5.8c-.7.3-1.5.6-2.3.7.8-.5 1.5-1.3 1.8-2.2-.8.5-1.7.8-2.6 1-1.5-1.6-4-1.7-5.6-.2-1 1-1.5 2.5-1.2 3.9C8.8 8.8 5.8 7.2 3.8 4.7c-1 1.7-.5 4 1.2 5.1-.6 0-1.3-.2-1.9-.5 0 1.8 1.3 3.4 3 3.8-.6.2-1.2.2-1.8.1.5 1.6 2 2.7 3.7 2.7-1.6 1.2-3.6 1.8-5.5 1.6 1.8 1.2 3.9 1.8 6 1.8 7.2 0 11.2-6 11.2-11.2v-.5c.8-.5 1.4-1.2 1.9-2.0z"/></svg>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.5 2 4 5.7 4 8.7c0 1.8.7 3.4 2.2 4 .2.1.4 0 .5-.2 0-.2.2-.7.2-.9.1-.3.1-.4-.1-.7-.5-.6-.8-1.4-.8-2.5C5.9 6 7.7 4 11.2 4c2.7 0 4.4 1.6 4.4 3.9 0 2.9-1.3 5.4-3.2 5.4-1.1 0-1.9-.9-1.6-2 .3-1.3.9-2.7.9-3.7 0-.8-.5-1.5-1.4-1.5-1.1 0-2 1.1-2 2.7 0 1 .3 1.6.3 1.6L7.3 16c-.4 1.5-.1 3.4-.1 3.6 0 .1.1.1.2.1.1-.1 1.3-1.6 1.7-3.1.1-.4.7-2.7.7-2.7.3.6 1.3 1.2 2.4 1.2 3.1 0 5.3-2.9 5.3-6.7C17.4 4.6 14.8 2 12 2z"/></svg>
    </span>
  );
}
function FbIcon() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.25-1.5 1.55-1.5H17V4.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.45-4 4.1v2.3H8v3.1h2.6V22h2.9z"/></svg>; }
function TwIcon() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 5.8c-.7.3-1.5.6-2.3.7.8-.5 1.5-1.3 1.8-2.2-.8.5-1.7.8-2.6 1-1.5-1.6-4-1.7-5.6-.2-1 1-1.5 2.5-1.2 3.9C8.8 8.8 5.8 7.2 3.8 4.7c-1 1.7-.5 4 1.2 5.1-.6 0-1.3-.2-1.9-.5 0 1.8 1.3 3.4 3 3.8-.6.2-1.2.2-1.8.1.5 1.6 2 2.7 3.7 2.7-1.6 1.2-3.6 1.8-5.5 1.6 1.8 1.2 3.9 1.8 6 1.8 7.2 0 11.2-6 11.2-11.2v-.5c.8-.5 1.4-1.2 1.9-2.0z"/></svg>; }
function PinIcon() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 4 5.7 4 8.7c0 1.8.7 3.4 2.2 4 .2.1.4 0 .5-.2 0-.2.2-.7.2-.9.1-.3.1-.4-.1-.7-.5-.6-.8-1.4-.8-2.5C5.9 6 7.7 4 11.2 4c2.7 0 4.4 1.6 4.4 3.9 0 2.9-1.3 5.4-3.2 5.4-1.1 0-1.9-.9-1.6-2 .3-1.3.9-2.7.9-3.7 0-.8-.5-1.5-1.4-1.5-1.1 0-2 1.1-2 2.7 0 1 .3 1.6.3 1.6L7.3 16c-.4 1.5-.1 3.4-.1 3.6 0 .1.1.1.2.1.1-.1 1.3-1.6 1.7-3.1.1-.4.7-2.7.7-2.7.3.6 1.3 1.2 2.4 1.2 3.1 0 5.3-2.9 5.3-6.7C17.4 4.6 14.8 2 12 2z"/></svg>; }
function GmailIcon() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 6.5C3 5.7 3.7 5 4.5 5H7l5 4 5-4h2.5c.8 0 1.5.7 1.5 1.5v11c0 .8-.7 1.5-1.5 1.5H17V10l-5 4-5-4v8.5H4.5C3.7 18.5 3 17.8 3 17z"/></svg>; }

function approxShares(slug) {
  let s = 0; for (let i = 0; i < slug.length; i++) s = (s * 31 + slug.charCodeAt(i)) | 0;
  const n = Math.abs(s);
  return {
    total: 200 + (n % 1500),
    fb: 50 + ((n >> 3) % 600),
    tw: 30 + ((n >> 5) % 350),
    pin: 20 + ((n >> 7) % 250),
    gmail: 10 + ((n >> 9) % 120),
    views: 800 + ((n >> 11) % 4500),
  };
}

function findPost(slug) {
  if (JOURNAL_FEATURED?.slug === slug) {
    return {
      slug: JOURNAL_FEATURED.slug,
      title: JOURNAL_FEATURED.title,
      kicker: 'Featured',
      excerpt: JOURNAL_FEATURED.lede || '',
      author: JOURNAL_FEATURED.author,
      readMinutes: JOURNAL_FEATURED.readMinutes || 6,
      publishedAt: JOURNAL_FEATURED.publishedAt,
      color: JOURNAL_FEATURED.color || 'purple',
      category: JOURNAL_FEATURED.kicker || 'Featured',
    };
  }
  const side = JOURNAL_SIDEBAR.find((s) => s.slug === slug);
  if (side) return { ...side, kicker: side.kicker, category: side.kicker };
  const arch = JOURNAL_ARCHIVE.find((a) => a.slug === slug);
  if (arch) return arch;
  return null;
}

export default function BlogPost() {
  const { slug } = useParams();
  const post = findPost(slug);

  if (!post) {
    return (
      <div className="blogpost-root">
        <style>{CSS}</style>
        <div className="blogpost-crumb">
          <div className="blogpost-crumb-wrap">
            <Link to="/">Home</Link>
            <span className="blogpost-crumb-sep">›</span>
            <Link to="/blog">Blogs</Link>
            <span className="blogpost-crumb-sep">›</span>
            <span className="blogpost-crumb-current">Not found</span>
          </div>
        </div>
        <div className="blogpost-body">
          <div />
          <div className="blogpost-content">
            <h2>Post not found</h2>
            <p>That story isn't on the shelf.</p>
            <Link to="/blog" className="blogpost-back">← Back to Blogs</Link>
          </div>
        </div>
      </div>
    );
  }

  const title = Array.isArray(post.title) ? titleText(post.title) : post.title;
  const titleSegments = Array.isArray(post.title) ? post.title : null;
  const subtitleSegment = titleSegments?.find((s) => s.em);
  const subtitle = subtitleSegment ? subtitleSegment.t : '';
  const headlineParts = titleSegments
    ? titleSegments.filter((s) => !s.em).map((s) => s.t).join(' ').trim()
    : title;

  const stats = approxShares(slug);
  const heroBg = COLOR_TO_BG[post.color] || COLOR_TO_BG.purple;
  const published = post.publishedAt ? formatPublished(post.publishedAt) : '';

  return (
    <div className="blogpost-root">
      <style>{CSS}</style>

      <nav className="blogpost-crumb" aria-label="Breadcrumb">
        <div className="blogpost-crumb-wrap">
          <Link to="/">Home</Link>
          <span className="blogpost-crumb-sep">›</span>
          <Link to="/blog">Blogs</Link>
          <span className="blogpost-crumb-sep">›</span>
          <span className="blogpost-crumb-current" title={title}>{title}</span>
        </div>
      </nav>

      <section className="blogpost-hero">
        <div className="blogpost-hero-wrap">
          <div className="blogpost-hero-frame" style={{ background: heroBg }}>
            <div className="blogpost-hero-chips">
              <span className="blogpost-hero-chip">{post.category || post.kicker || 'Journal'}</span>
              <span className="blogpost-hero-chip">By {post.author?.name || 'Tapas'}</span>
              {published && <span className="blogpost-hero-chip">{published}</span>}
            </div>
            <div className="blogpost-hero-content">
              <h1 className="blogpost-hero-title">{headlineParts || title}</h1>
              {subtitle && <p className="blogpost-hero-subtitle">{subtitle}</p>}
              <div className="blogpost-hero-meta">
                <span>by {post.author?.name || 'Tapas'}</span>
                <span className="sep">—</span>
                <span><ClockIcon /> {post.readMinutes || 5} minute read</span>
                <span className="sep">—</span>
                <span><EyeIcon /> {(stats.views / 1000).toFixed(1)}K views</span>
                <span className="sep">—</span>
                <span><span className="icons"><ShareGroupIcon /></span> {(stats.total / 1000).toFixed(1)}K shares</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="blogpost-body">
        <aside className="blogpost-share">
          <div className="blogpost-share-count">{stats.total}</div>
          <div className="blogpost-share-label">Shares</div>
          <div className="blogpost-share-list">
            <div className="blogpost-share-item">
              <button type="button" className="blogpost-share-btn fb" aria-label="Share on Facebook"><FbIcon /></button>
              <span className="blogpost-share-pill">{stats.fb}</span>
            </div>
            <div className="blogpost-share-item">
              <button type="button" className="blogpost-share-btn tw" aria-label="Share on Twitter"><TwIcon /></button>
            </div>
            <div className="blogpost-share-item">
              <button type="button" className="blogpost-share-btn pin" aria-label="Save on Pinterest"><PinIcon /></button>
              <span className="blogpost-share-pill">{stats.pin}</span>
            </div>
            <div className="blogpost-share-item">
              <button type="button" className="blogpost-share-btn gm" aria-label="Share via email"><GmailIcon /></button>
            </div>
          </div>
        </aside>

        <article className="blogpost-content">
          {post.excerpt && <p>{post.excerpt}</p>}
          <h2>From the room</h2>
          <p>
            We sit with these stories the way we sit with a long book —
            in the corner, with a cappuccino, taking our time. The cafe
            becomes part of the reading, and the reading becomes part of
            the cafe.
          </p>
          <p>
            What follows is a longer companion to the piece above —
            notes from the table, snippets the editor cut, the kind of
            paragraph that survives a third read.
          </p>
          <Link to="/blog" className="blogpost-back">← Back to Blogs</Link>
        </article>
      </div>
    </div>
  );
}
