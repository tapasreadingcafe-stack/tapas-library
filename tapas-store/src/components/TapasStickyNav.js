import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

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
  { to: '/shop',    label: 'Shop' },
  { to: '/library', label: 'Library' },
  { to: '/events',  label: 'Events' },
  { to: '/blog',    label: 'Blogs' },
  { to: '/contact', label: 'Contact Us' },
];

function isActive(pathname, to) {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(to + '/');
}

const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const BagIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

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
  const { itemCount } = useCart();

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
          position: sticky; top: 0; z-index: 50;
          background: transparent;
          font-family: 'Poppins', system-ui, sans-serif;
          color: ${INK};
          transition: background-color 300ms ease;
        }
        .tapas-snav.is-scrolled {
          background: ${LIME};
        }
        /* When the nav is transparent at the top, only the right-side
           items (search, cart, Sign In) sit over the library photo
           and need to be white. The center links (About Us \u2192
           Contact Us) sit over the lime curve / lime bg and stay
           dark ink. Logo is also on lime and stays dark. Sign Up
           keeps its pink pill either way. */
        .tapas-snav.is-top .tapas-snav-signin,
        .tapas-snav.is-top .tapas-snav-icon {
          color: #fff;
        }
        .tapas-snav.is-top .tapas-snav-signin {
          text-decoration-color: rgba(255,255,255,0.6);
        }
        .tapas-snav.is-top .tapas-snav-icon:hover {
          background: rgba(255,255,255,0.15);
        }
        .tapas-snav.is-top .tapas-snav-badge {
          border-color: rgba(255,255,255,0.9);
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

          <div className="tapas-snav-right">
            <Link to="/search" className="tapas-snav-icon" aria-label="Search">
              <SearchIcon />
            </Link>
            <Link
              to="/cart"
              className="tapas-snav-icon"
              aria-label={itemCount > 0 ? `Shopping bag (${itemCount})` : 'Shopping bag'}
            >
              <BagIcon />
              {itemCount > 0 && (
                <span className="tapas-snav-badge" aria-hidden="true">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
            <Link to="/sign-in" className="tapas-snav-signin">Sign In</Link>
            <Link to="/sign-up" className="tapas-snav-signup">Sign Up</Link>
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
            <div className="tapas-snav-mobile-actions">
              <Link to="/sign-in" className="tapas-snav-signin" onClick={() => setMenuOpen(false)}>
                Sign In
              </Link>
              <Link to="/sign-up" className="tapas-snav-signup" onClick={() => setMenuOpen(false)}>
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
