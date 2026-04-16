import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useSiteContent } from '../context/SiteContent';
import PageRenderer from '../blocks/PageRenderer';

// =====================================================================
// CustomPage
//
// Catch-all for routes that aren't in the fixed set (Home, Catalog,
// About, etc.). Matches the current location.pathname against
// content.pages[*].meta.path — if a custom page with meta.custom === true
// is found, renders its blocks through PageRenderer. Otherwise shows a
// 404-style "page not found" message.
// =====================================================================

export default function CustomPage() {
  const location = useLocation();
  const content = useSiteContent();
  const pages = content?.pages || {};
  const path = location.pathname;

  // Find the page whose meta.path matches the current URL (case-insensitive,
  // ignore trailing slash).
  const normalize = (s) => (s || '').toLowerCase().replace(/\/$/, '') || '/';
  const targetPath = normalize(path);
  let matchKey = null;
  for (const [key, page] of Object.entries(pages)) {
    if (!page?.meta?.custom) continue;
    if (normalize(page.meta.path) === targetPath) {
      matchKey = key;
      break;
    }
  }

  if (!matchKey) {
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

  return (
    <div style={{ minHeight: '60vh' }}>
      <PageRenderer pageKey={matchKey} />
    </div>
  );
}
