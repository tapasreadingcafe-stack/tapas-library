// =====================================================================
// findPage
//
// Resolves a URL path to a page key in `content.pages`. Pages are
// uniform — any page can claim any slug (subject to validation in the
// editor). The conventional default keys (home, about, catalog, …)
// have implicit seed paths, used as a fallback when meta.path is unset.
// =====================================================================

import React from 'react';
import { Link } from 'react-router-dom';

const SEED_PATHS = {
  home:    '/',
  about:   '/about',
  catalog: '/books',
  offers:  '/offers',
  blog:    '/blog',
  events:  '/events',
};

const normalize = (s) => (s || '').toLowerCase().replace(/\/$/, '') || '/';

export function findPageByPath(pages, path) {
  if (!pages || typeof pages !== 'object') return null;
  const target = normalize(path);
  for (const [key, page] of Object.entries(pages)) {
    const effective = page?.meta?.path || SEED_PATHS[key];
    if (!effective) continue;
    if (normalize(effective) === target) return key;
  }
  return null;
}

// Shared 404 used by hardcoded route files when their URL no longer
// maps to any page (the user deleted it, or renamed its slug elsewhere).
export function NotFound({ path }) {
  return (
    <div style={{
      maxWidth: '560px', margin: '80px auto', padding: '40px 24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '56px', marginBottom: '16px' }}>📖</div>
      <h1 style={{
        fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
        fontSize: '32px', fontWeight: 500,
        margin: '0 0 12px', color: 'var(--tapas-primary, #26170c)',
      }}>Page not found</h1>
      <p style={{
        fontSize: '15px', lineHeight: 1.6,
        color: 'var(--tapas-body-color, #5c3a1e)',
        margin: '0 0 24px',
      }}>
        We couldn't find a page at <code style={{ background: 'rgba(38,23,12,0.08)', padding: '2px 6px', borderRadius: '4px' }}>{path}</code>.
      </p>
      <Link
        to="/"
        style={{
          display: 'inline-block',
          padding: '12px 28px',
          background: 'var(--tapas-accent, #006a6a)',
          color: '#fff', textDecoration: 'none',
          borderRadius: '50px', fontWeight: 700, fontSize: '14px',
        }}
      >← Back to home</Link>
    </div>
  );
}
