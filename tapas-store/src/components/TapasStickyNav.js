import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

// Primary site nav. Sticky, green, matches the Figma redesign.
// Lives outside the v2 tree so active-state styling can react to the
// current route — the tree renderer is static and can't do that.

const LIME = '#caf27e';
const PINK = '#E0004F';
const PINK_DARK = '#B8003F';
const PURPLE = '#7C3AED';
const INK = '#1a1a1a';

const NAV_LINKS = [
  { to: '/about',   label: 'About Us' },
  { to: '/events',  label: 'Events' },
  { to: '/blog',    label: 'Blogs' },
  { to: '/contact', label: 'Contact Us' },
];

function isActive(pathname, to) {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(to + '/');
}

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function TapasStickyNav() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Transparent at the top, lime + soft shadow once the user has
  // scrolled past a short threshold. 50px mirrors the usual "leave
  // the hero" distance so the transition kicks in when the nav
  // starts covering page content instead of the hero photo.
  const [isScrolled, setIsScrolled] = useState(() =>
    typeof window !== 'undefined' && window.scrollY > 50,
  );
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap"
      />
      <style>{`
        .tapas-snav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          background: transparent;
          font-family: 'Poppins', system-ui, sans-serif;
          color: ${INK};
          transition: background-color 300ms ease;
        }
        .tapas-snav.is-scrolled {
          background: ${LIME};
        }
        /* At the top of the home page the nav sits over the full-bleed
           library photo (dark), so ALL nav items go white: logo (inverted
           to a white silhouette), center links, and Sign In. Sign Up keeps
           its pink pill. Once the user scrolls (is-scrolled \u2192 lime bg) they
           revert to dark ink. On mobile the nav sits over lime, not the
           photo \u2014 the logo filter is reset in the \u2264900 block below. */
        .tapas-snav.is-top .tapas-snav-logo-img {
          filter: brightness(0) invert(1);
        }
        .tapas-snav.is-top .tapas-snav-links a,
        .tapas-snav.is-top .tapas-snav-signin,
        .tapas-snav.is-top .tapas-snav-icon {
          color: #fff;
        }
        .tapas-snav.is-top .tapas-snav-links a:hover,
        .tapas-snav.is-top .tapas-snav-signin:hover {
          color: #fff;
          opacity: 0.75;
        }
        .tapas-snav.is-top .tapas-snav-signin {
          text-decoration-color: rgba(255,255,255,0.6);
        }
        .tapas-snav.is-top .tapas-snav-icon:hover {
          background: rgba(255,255,255,0.14);
        }
        .tapas-snav-inner {
          max-width: 1320px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 32px; gap: 24px;
        }
        .tapas-snav-logo {
          display: inline-flex;
          align-items: center;
          text-decoration: none; color: ${INK};
          line-height: 1;
        }
        .tapas-snav-logo-img {
          height: 58px;
          width: auto;
          display: block;
          /* Logo is dark on a transparent background; reads well on the
             lime nav (#caf27e) with no filter. */
        }
        .tapas-snav-links {
          display: flex; gap: 30px; align-items: center;
        }
        .tapas-snav-links a {
          color: ${INK}; text-decoration: none;
          font-size: 15px; font-weight: 500;
          transition: color 150ms;
          position: relative;
        }
        .tapas-snav-links a:hover { color: ${PURPLE}; }
        .tapas-snav-links a.is-active {
          color: ${PURPLE};
          font-weight: 600;
        }
        .tapas-snav-right {
          display: flex; gap: 14px; align-items: center;
        }
        .tapas-snav-icon {
          background: transparent; border: none; color: ${INK};
          cursor: pointer; display: inline-flex;
          padding: 8px; border-radius: 8px;
          text-decoration: none;
          transition: background 150ms;
        }
        .tapas-snav-icon:hover { background: rgba(0,0,0,0.08); }
        .tapas-snav-icon { position: relative; }
        .tapas-snav-badge {
          position: absolute;
          top: 2px; right: 2px;
          min-width: 18px; height: 18px;
          padding: 0 5px;
          border-radius: 999px;
          background: ${PINK};
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          line-height: 18px;
          text-align: center;
          border: 2px solid ${LIME};
          font-variant-numeric: tabular-nums;
          pointer-events: none;
        }
        .tapas-snav-signin {
          color: ${INK}; text-decoration: underline;
          font-size: 15px; font-weight: 500;
          padding: 0 6px;
        }
        .tapas-snav-signin:hover { color: ${PURPLE}; }
        .tapas-snav-signup {
          background: ${PINK}; color: #fff;
          padding: 10px 22px; border-radius: 999px;
          font-size: 14px; font-weight: 600;
          text-decoration: none;
          transition: background 150ms, transform 150ms, box-shadow 150ms;
          box-shadow: 0 4px 12px rgba(224,0,79,0.25);
        }
        .tapas-snav-signup:hover {
          background: ${PINK_DARK};
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(224,0,79,0.32);
        }
        .tapas-snav-hamburger {
          display: none;
          background: transparent; border: none; color: ${INK};
          cursor: pointer; padding: 8px; border-radius: 8px;
        }
        .tapas-snav-hamburger:hover { background: rgba(0,0,0,0.08); }
        .tapas-snav-search-inline {
          display: inline-flex;
          align-items: center;
          height: 40px;
          width: 40px;
          background: transparent;
          border: 1.5px solid transparent;
          border-radius: 999px;
          overflow: hidden;
          padding: 0;
          transition: width 260ms cubic-bezier(.2,.8,.2,1), border-color 200ms, background 200ms, padding 260ms cubic-bezier(.2,.8,.2,1);
        }
        .tapas-snav-search-inline.is-open {
          width: 280px;
          border-color: ${INK};
          background: transparent;
          padding-left: 18px;
        }
        .tapas-snav-search-inline input {
          flex: 1;
          min-width: 0;
          width: 0;
          background: transparent;
          border: 0;
          outline: none;
          box-shadow: none;
          -webkit-appearance: none;
          appearance: none;
          font-family: 'Poppins', system-ui, sans-serif;
          font-size: 14px;
          color: ${INK};
          padding: 0;
          opacity: 0;
          pointer-events: none;
          transition: opacity 180ms 80ms;
        }
        .tapas-snav-search-inline input::-webkit-search-decoration,
        .tapas-snav-search-inline input::-webkit-search-cancel-button,
        .tapas-snav-search-inline input::-webkit-search-results-button,
        .tapas-snav-search-inline input::-webkit-search-results-decoration { display: none; }
        .tapas-snav-search-inline.is-open input { opacity: 1; pointer-events: auto; }
        .tapas-snav-search-inline input::placeholder { color: rgba(0,0,0,0.45); }
        .tapas-snav-search-toggle {
          flex: 0 0 auto;
          background: transparent;
          border: 0;
          color: ${INK};
          width: 40px;
          height: 40px;
          padding: 0;
          border-radius: 999px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background 150ms;
        }
        .tapas-snav-search-inline:not(.is-open) .tapas-snav-search-toggle:hover { background: rgba(0,0,0,0.08); }
        @media (max-width: 767px) {
          .tapas-snav-search-inline.is-open { width: 200px; padding-left: 14px; }
        }
        .tapas-snav-mobile {
          display: none;
          background: ${LIME};
          border-top: 1px solid rgba(0,0,0,0.08);
          padding: 8px 24px 20px;
        }
        .tapas-snav-mobile a {
          display: block;
          padding: 14px 0;
          color: ${INK}; text-decoration: none;
          font-size: 16px; font-weight: 500;
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .tapas-snav-mobile a.is-active { color: ${PURPLE}; }
        .tapas-snav-mobile-actions {
          display: flex; gap: 12px; align-items: center;
          margin-top: 16px;
        }
        .tapas-snav-mobile-actions .tapas-snav-signup { padding: 10px 22px; }
        @media (max-width: 900px) {
          .tapas-snav-links, .tapas-snav-right { display: none; }
          .tapas-snav-hamburger { display: inline-flex; }
          .tapas-snav-mobile { display: block; }
          .tapas-snav-inner { padding: 12px 20px; }
          .tapas-snav-logo-img { height: 48px; }
          /* Mobile nav sits over lime (not the photo) — keep the logo dark. */
          .tapas-snav.is-top .tapas-snav-logo-img { filter: none; }
        }
      `}</style>
      <nav
        className={(() => {
          // Transparent-at-top behavior is a home-page thing only —
          // other routes don't have a hero photo under the nav, so
          // the lime bg should stay put. On non-home pages we force
          // is-scrolled regardless of actual scroll position.
          const isHome = pathname === '/';
          const state = !isHome || isScrolled ? 'is-scrolled' : 'is-top';
          return `tapas-snav ${state}`;
        })()}
        aria-label="Primary"
      >
        <div className="tapas-snav-inner">
          <Link to="/" className="tapas-snav-logo" aria-label="Tapas Reading Cafe — home">
            <img
              src={`${process.env.PUBLIC_URL || ''}/logo.png`}
              alt="Tapas Reading Cafe"
              className="tapas-snav-logo-img"
              width={423}
              height={228}
            />
          </Link>

          <div className="tapas-snav-links">
            {NAV_LINKS.map((l) => {
              const active = isActive(pathname, l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={active ? 'is-active' : ''}
                  aria-current={active ? 'page' : undefined}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            className="tapas-snav-hamburger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        {menuOpen && (
          <div className="tapas-snav-mobile">
            {NAV_LINKS.map((l) => {
              const active = isActive(pathname, l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMenuOpen(false)}
                  className={active ? 'is-active' : ''}
                  aria-current={active ? 'page' : undefined}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </>
  );
}
