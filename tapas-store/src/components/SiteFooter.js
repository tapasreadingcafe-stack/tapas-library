import React from 'react';
import { Link } from 'react-router-dom';

// Global site footer. Centered layout: logo, a single row of nav links,
// lime social pills, the cafe's address / phone / email, a thin rule,
// then the copyright line. Lives outside the v2 tree so it renders on
// every route without the editor's self-heal having to seed it.

const INK       = '#1a1a1a';
const INK_2     = '#3a3a3a';
const MUTED     = '#6e6e6e';
const RULE      = '#ececea';
const BG        = '#F6F8F7';
const LIME      = '#caf27e';

const EXPLORE_LINKS = [
  { label: 'Home',    to: '/' },
  { label: 'About',   to: '/about' },
  { label: 'Events',  to: '/events' },
  { label: 'Blogs',   to: '/blog' },
  { label: 'Contact', to: '/contact' },
];

function FooterIgIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 4.4c2.5 0 2.8 0 3.7.05 1.7.08 2.5.9 2.6 2.6.05.95.05 1.2.05 3.7s0 2.8-.05 3.7c-.08 1.7-.9 2.5-2.6 2.6-.95.05-1.2.05-3.7.05s-2.8 0-3.7-.05c-1.7-.08-2.5-.9-2.6-2.6C5.6 14.8 5.6 14.5 5.6 12s0-2.8.05-3.7c.08-1.7.9-2.5 2.6-2.6.95-.05 1.2-.05 3.75-.05M12 2.5c-2.6 0-2.9 0-3.9.06-2.4.1-3.7 1.4-3.8 3.8C4.25 7.4 4.2 7.7 4.2 12s.05 4.6.1 5.6c.1 2.4 1.4 3.7 3.8 3.8 1 .06 1.3.06 3.9.06s2.9 0 3.9-.06c2.4-.1 3.7-1.4 3.8-3.8.06-1 .06-1.3.06-5.6s0-4.6-.06-5.6c-.1-2.4-1.4-3.7-3.8-3.8-1-.06-1.3-.06-3.9-.06zm0 4.6c-2.7 0-4.9 2.2-4.9 4.9s2.2 4.9 4.9 4.9 4.9-2.2 4.9-4.9-2.2-4.9-4.9-4.9zm0 8.1c-1.75 0-3.2-1.45-3.2-3.2s1.45-3.2 3.2-3.2 3.2 1.45 3.2 3.2-1.45 3.2-3.2 3.2zm5.1-9.5c-.6 0-1.15.5-1.15 1.15s.5 1.15 1.15 1.15c.65 0 1.15-.5 1.15-1.15s-.5-1.15-1.15-1.15z"/>
    </svg>
  );
}
function FooterWaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.97 6.45 17.5 2 12.04 2zm0 18.13h-.01c-1.53 0-3.03-.41-4.34-1.19l-.31-.18-3.12.82.83-3.04-.2-.32a8.19 8.19 0 01-1.26-4.35c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.82c0 4.54-3.7 8.23-8.25 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.98-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43l-.48-.01c-.16 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.53.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29z"/>
    </svg>
  );
}
function FooterLocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z"/>
    </svg>
  );
}
const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/tapasreadingcafe/', Icon: FooterIgIcon },
  { label: 'WhatsApp',  href: 'https://wa.me/918792470576', Icon: FooterWaIcon },
  { label: 'Location',  href: 'https://maps.app.goo.gl/i24rAtukZxwuL1Uk9', Icon: FooterLocIcon },
];

function FooterLink({ item }) {
  if (item.to) return <Link to={item.to}>{item.label}</Link>;
  return <a href={item.href}>{item.label}</a>;
}

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <>
      {/* Poppins is loaded globally in App.js with all weights and italics. */}
      <style>{`
        .site-footer {
          background: ${BG};
          color: ${INK};
          font-family: 'Poppins', system-ui, sans-serif;
          padding: 64px 0 30px;
          margin-top: auto;
          text-align: center;
        }
        .site-footer-wrap {
          max-width: 960px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 26px;
        }
        .site-footer-logo {
          height: 66px;
          width: auto;
          display: block;
        }
        .site-footer-nav {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 14px 34px;
        }
        .site-footer-nav a {
          color: ${INK};
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.02em;
          transition: color 150ms;
        }
        .site-footer-nav a:hover { color: ${MUTED}; }
        .site-footer-socials {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        .site-footer-social {
          width: 38px; height: 38px;
          border-radius: 999px;
          background: ${LIME};
          color: ${INK};
          display: inline-grid;
          place-items: center;
          text-decoration: none;
          transition: transform 150ms, background 150ms;
        }
        .site-footer-social:hover {
          background: #b4e46e;
          transform: translateY(-2px);
        }
        .site-footer-contact {
          font-style: normal;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 14px;
          line-height: 1.6;
          color: ${INK_2};
          max-width: 46ch;
        }
        .site-footer-contact p { margin: 0; }
        .site-footer-contact a {
          color: inherit;
          text-decoration: none;
          transition: color 150ms;
        }
        .site-footer-contact a:hover { color: ${INK}; }
        .site-footer-rule {
          width: 100%;
          max-width: 780px;
          border: 0;
          border-top: 1px solid ${RULE};
          margin: 6px 0 0;
        }
        .site-footer-copy {
          font-family: 'Poppins', system-ui, sans-serif;
          font-size: 12px;
          color: ${MUTED};
          letter-spacing: 0.02em;
        }
        @media (max-width: 639px) {
          .site-footer { padding: 44px 0 22px; }
          .site-footer-wrap { gap: 22px; padding: 0 20px; }
          .site-footer-logo { height: 52px; }
          .site-footer-nav { gap: 10px 22px; }
          .site-footer-nav a { font-size: 13px; }
          .site-footer-social { width: 34px; height: 34px; }
          .site-footer-contact { font-size: 13px; }
          .site-footer-copy { font-size: 11px; }
        }
      `}</style>
      <footer className="site-footer">
        <div className="site-footer-wrap">
          <img
            src={`${process.env.PUBLIC_URL || ''}/logo.png`}
            alt="Tapas Reading Cafe"
            className="site-footer-logo"
          />

          <nav className="site-footer-nav" aria-label="Footer">
            {EXPLORE_LINKS.map((l) => (
              <FooterLink key={l.label} item={l} />
            ))}
          </nav>

          <div className="site-footer-socials" aria-label="Social links">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                className="site-footer-social"
                aria-label={s.label}
                target="_blank"
                rel="noopener noreferrer"
              >
                <s.Icon />
              </a>
            ))}
          </div>

          <address className="site-footer-contact">
            <p>
              2nd Floor, 2628, 27th Main Rd, above Juice Junction,<br />
              1st Sector, HSR Layout, Bengaluru, Karnataka 560102
            </p>
            <p>
              <a href="tel:+917760393951">+91 77603 93951</a>
              {' / '}
              <a href="tel:+918792470576">+91 87924 70576</a>
            </p>
            <p>
              <a href="mailto:hello@tapasreadingcafe.com">hello@tapasreadingcafe.com</a>
            </p>
          </address>

          <hr className="site-footer-rule" />

          <div className="site-footer-copy">
            © {year} Tapas Reading Cafe · Bengaluru · All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
