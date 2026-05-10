import React from 'react';
import { Link } from 'react-router-dom';

const CSS = `
  .page-breadcrumb {
    background: #F6F8F7;
    padding: 56px 0 64px;
    font-family: 'Poppins', system-ui, sans-serif;
  }
  .page-breadcrumb.no-title { padding: 24px 0; }
  .page-breadcrumb-wrap {
    max-width: 1320px;
    margin: 0 auto;
    padding: 0 64px;
  }
  .page-breadcrumb-trail {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: #1a1a1a;
    margin-bottom: 18px;
  }
  .page-breadcrumb-trail a {
    color: #1a1a1a;
    text-decoration: none;
    transition: color 150ms;
  }
  .page-breadcrumb-trail a:hover { color: #6e6e6e; }
  .page-breadcrumb-sep {
    color: #6e6e6e;
    font-size: 14px;
  }
  .page-breadcrumb-current {
    color: #1a1a1a;
    font-weight: 500;
  }
  .page-breadcrumb-title {
    margin: 0;
    font-family: 'Poppins', system-ui, sans-serif;
    font-weight: 500;
    font-size: 28px;
    line-height: 35px;
    letter-spacing: 0;
    text-transform: uppercase;
    color: #8A58DB;
  }
  @media (max-width: 1023px) {
    .page-breadcrumb { padding: 44px 0 48px; }
    .page-breadcrumb.no-title { padding: 20px 0; }
    .page-breadcrumb-wrap { padding: 0 40px; }
  }
  @media (max-width: 639px) {
    .page-breadcrumb { padding: 32px 0 36px; }
    .page-breadcrumb.no-title { padding: 16px 0; }
    .page-breadcrumb-wrap { padding: 0 20px; }
    .page-breadcrumb-trail { font-size: 13px; margin-bottom: 12px; }
  }
  .page-breadcrumb.no-title .page-breadcrumb-trail { margin-bottom: 0; }
`;

export default function PageBreadcrumb({ name, hideTitle }) {
  return (
    <section className={`page-breadcrumb${hideTitle ? ' no-title' : ''}`} aria-labelledby={hideTitle ? undefined : 'page-breadcrumb-title'}>
      <style>{CSS}</style>
      <div className="page-breadcrumb-wrap">
        <nav className="page-breadcrumb-trail" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span className="page-breadcrumb-sep" aria-hidden="true">›</span>
          <span className="page-breadcrumb-current" aria-current="page">{name}</span>
        </nav>
        {!hideTitle && (
          <h1 id="page-breadcrumb-title" className="page-breadcrumb-title">{name}</h1>
        )}
      </div>
    </section>
  );
}
