import React from 'react';
import { Link } from 'react-router-dom';

// Global site footer. Cream/off-white band with three link columns,
// lime social pills, and a thin-ruled copyright row. Lives outside
// the v2 tree so it renders on every route without the editor's
// self-heal having to seed it into each page.

const INK       = '#1a1a1a';
const INK_2     = '#3a3a3a';
const MUTED     = '#6e6e6e';
const RULE      = '#ececea';
const BG        = '#faf8f4';
const LIME      = '#caf27e';

// Column link shapes. Internal routes use <Link>; external or
// not-yet-built targets use an <a href="#">.
const READ_LINKS = [
  { label: 'Library',    to: '/library'       },
  { label: 'Book Clubs', to: '/events'        },
  { label: 'The Journal', to: '/blog'         },
  { label: 'Archive',    to: null, href: '#' },
];

const MORE_LINKS = [
  { label: 'Private Events', to: null, href: '#' },
  { label: 'Gift Cards',     to: null, href: '#' },
  { label: 'Careers',        to: null, href: '#' },
  { label: 'Contact',        to: '/contact' },
];

const SOCIALS = [
  { label: 'IG', href: '#' },
  { label: 'FB', href: '#' },
  { label: 'SP', href: '#' },
];

function FooterLink({ item }) {
  if (item.to) return <Link to={item.to}>{item.label}</Link>;
  return <a href={item.href}>{item.label}</a>;
}

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
      />
      <style>{`
        .site-footer {
          background: ${BG};
          color: ${INK};
          font-family: 'Inter', system-ui, sans-serif;
          padding: 72px 0 28px;
          margin-top: auto;
        }
        .site-footer-wrap {
          max-width: 1320px;
          margin: 0 auto;
          padding: 0 64px;
        }
        .site-footer-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr 1fr;
          gap: 48px;
          padding-bottom: 44px;
        }
        .site-footer-logo {
          height: 84px;
          width: auto;
          display: block;
          margin-bottom: 18px;
        }
        .site-footer-brand-headline {
          font-family: 'DM Serif Display', Georgia, serif;
          font-weight: 500;
          font-style: italic;
          font-size: 16px;
          line-height: 1.4;
          letter-spacing: -0.005em;
          color: ${INK_2};
          margin: 0 0 14px;
        }
        .site-footer-brand-body {
          font-size: 14px;
          line-height: 1.6;
          color: ${INK_2};
          max-width: 28ch;
          margin: 0;
        }
        .site-footer-col h5 {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: ${MUTED};
          margin: 4px 0 18px;
        }
        .site-footer-col ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .site-footer-col li { line-height: 1.4; }
        .site-footer-col a,
        .site-footer-col li {
          color: ${INK};
          text-decoration: none;
          font-size: 14px;
          transition: color 150ms;
        }
        .site-footer-col a:hover { color: ${MUTED}; }

        .site-footer-bottom {
          border-top: 1px solid ${RULE};
          padding-top: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .site-footer-copy {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 12px;
          color: ${MUTED};
          letter-spacing: 0.02em;
        }
        .site-footer-socials {
          display: flex;
          gap: 10px;
        }
        .site-footer-social {
          width: 36px; height: 36px;
          border-radius: 999px;
          background: ${LIME};
          color: ${INK};
          display: inline-grid;
          place-items: center;
          text-decoration: none;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          transition: transform 150ms, background 150ms;
        }
        .site-footer-social:hover {
          background: #b4e46e;
          transform: translateY(-2px);
        }
        @media (max-width: 1023px) {
          .site-footer-wrap { padding: 0 40px; }
          .site-footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
        }
        @media (max-width: 639px) {
          .site-footer { padding: 48px 0 24px; }
          .site-footer-wrap { padding: 0 20px; }
          .site-footer-grid {
            grid-template-columns: 1fr;
            gap: 32px;
            padding-bottom: 32px;
          }
          .site-footer-bottom { flex-direction: column-reverse; align-items: flex-start; }
        }
      `}</style>
      <footer className="site-footer" aria-labelledby="site-footer-brand">
        <div className="site-footer-wrap">
          <div className="site-footer-grid">
            <div className="site-footer-brand">
              <img
                src={`${process.env.PUBLIC_URL || ''}/logo.png`}
                alt="Tapas Reading Cafe"
                className="site-footer-logo"
              />
              <p className="site-footer-brand-body" id="site-footer-brand">
                A neighborhood library-cafe serving small plates,
                natural wine, and six weekly book clubs.
              </p>
            </div>

            <div className="site-footer-col">
              <h5>Visit</h5>
              <ul>
                <li>14 Haven Street</li>
                <li>Reading, MA 01867</li>
                <li>Tue–Sun · 10a–11p</li>
              </ul>
            </div>

            <div className="site-footer-col">
              <h5>Read</h5>
              <ul>
                {READ_LINKS.map((l) => (
                  <li key={l.label}><FooterLink item={l} /></li>
                ))}
              </ul>
            </div>

            <div className="site-footer-col">
              <h5>More</h5>
              <ul>
                {MORE_LINKS.map((l) => (
                  <li key={l.label}><FooterLink item={l} /></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="site-footer-bottom">
            <div className="site-footer-copy">
              \u00a9 {year} Tapas Reading Cafe · Reading, MA
            </div>
            <div className="site-footer-socials" aria-label="Social links">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  className="site-footer-social"
                  aria-label={s.label}
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
