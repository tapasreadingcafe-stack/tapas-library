import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isValidEmail } from '../data/journalPosts';

// Global site footer. Cream/off-white band with three link columns,
// lime social pills, and a thin-ruled copyright row. Lives outside
// the v2 tree so it renders on every route without the editor's
// self-heal having to seed it into each page.

const INK       = '#1a1a1a';
const INK_2     = '#3a3a3a';
const MUTED     = '#6e6e6e';
const RULE      = '#ececea';
const BG        = '#F6F8F7';
const LIME      = '#caf27e';

// Column link shapes. Internal routes use <Link>; external or
// not-yet-built targets use an <a href="#">.
const EXPLORE_LINKS = [
  { label: 'Home',   to: '/' },
  { label: 'About',  to: '/about' },
  { label: 'Events', to: '/events' },
  { label: 'Blogs',  to: '/blog' },
];

const HELP_LINKS = [
  { label: 'Contact',           to: '/contact' },
  { label: 'Faqs',              to: '/faqs' },
  { label: 'Terms & Condition', to: '/terms' },
  { label: 'Privacy Policy',    to: '/privacy' },
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

const PINK = '#E0004F';

function FooterLink({ item }) {
  if (item.to) return <Link to={item.to}>{item.label}</Link>;
  return <a href={item.href}>{item.label}</a>;
}

export default function SiteFooter() {
  const year = new Date().getFullYear();
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const onSubscribe = (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('Enter a valid email.');
      return;
    }
    setError(null);
    // eslint-disable-next-line no-console
    console.log({ email, source: 'site-footer-strip' });
    setSent(true);
  };

  return (
    <>
      {/* Poppins is loaded globally in App.js with all weights and italics. */}
      <style>{`
        .footer-newsletter-strip {
          background: #0d0d0d;
          color: #fff;
          padding: 28px 0;
          border-top: 64px solid #F6F8F7;
          font-family: 'Poppins', system-ui, sans-serif;
        }
        .footer-newsletter-strip.is-home { border-top-width: 0; }
        .footer-newsletter-wrap {
          max-width: 1320px;
          margin: 0 auto;
          padding: 0 64px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: 48px;
        }
        .footer-newsletter-intro { min-width: 0; }
        .footer-newsletter-title {
          margin: 0 0 6px;
          font-family: 'Poppins', system-ui, sans-serif;
          font-weight: 700;
          font-size: clamp(22px, 2.2vw, 30px);
          line-height: 1.1;
          letter-spacing: -0.018em;
          color: #fff;
        }
        .footer-newsletter-title em {
          color: ${LIME};
          font-style: italic;
          font-weight: 700;
        }
        .footer-newsletter-lede {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
          color: rgba(255,255,255,0.6);
          max-width: 52ch;
        }
        .footer-newsletter-form {
          display: flex;
          align-items: center;
          background: #fff;
          border-radius: 999px;
          padding: 5px;
        }
        .footer-newsletter-form input {
          flex: 1;
          background: transparent;
          border: 0;
          outline: none;
          color: #1a1a1a;
          font-family: inherit;
          font-size: 14px;
          padding: 10px 18px;
          min-width: 0;
        }
        .footer-newsletter-form input::placeholder { color: #9aa0a6; }
        .footer-newsletter-form button {
          background: ${PINK};
          color: #fff;
          border: 0;
          border-radius: 999px;
          padding: 10px 26px;
          font-family: inherit;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: background 150ms, transform 150ms;
        }
        .footer-newsletter-form button:hover { background: #b80042; transform: translateY(-1px); }
        .footer-newsletter-success {
          color: ${LIME};
          font-size: 14px;
          font-weight: 500;
          padding: 12px 22px;
          background: #1a1a1a;
          border-radius: 999px;
        }
        .footer-newsletter-error {
          color: #ffa8b8;
          font-size: 12px;
          margin-top: 6px;
          padding-left: 22px;
        }

        @media (max-width: 1023px) {
          .footer-newsletter-strip { padding: 24px 0; border-top-width: 48px; }
          .footer-newsletter-strip.is-home { border-top-width: 0; }
          .footer-newsletter-wrap {
            grid-template-columns: 1fr;
            padding: 0 40px;
            gap: 18px;
          }
        }
        @media (max-width: 639px) {
          .footer-newsletter-strip { padding: 16px 0; border-top-width: 24px; }
          .footer-newsletter-strip.is-home { border-top-width: 0; }
          .footer-newsletter-wrap { padding: 0 20px; gap: 12px; }
          .footer-newsletter-title { font-size: 19px; margin: 0 0 4px; }
          .footer-newsletter-lede { font-size: 12px; line-height: 1.45; }
          .footer-newsletter-form input { font-size: 13px; padding: 8px 14px; }
          .footer-newsletter-form button { padding: 8px 18px; font-size: 13px; }
        }

        .site-footer {
          background: ${BG};
          color: ${INK};
          font-family: 'Poppins', system-ui, sans-serif;
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
          grid-template-columns: 1.8fr 1fr 1fr;
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
          font-family: 'Poppins', system-ui, sans-serif;
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
          font-family: 'Poppins', system-ui, sans-serif;
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
          font-family: 'Poppins', system-ui, sans-serif;
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
          font-family: 'Poppins', system-ui, sans-serif;
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
          .site-footer { padding: 28px 0 16px; }
          .site-footer-wrap { padding: 0 20px; }
          .site-footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 22px 20px;
            padding-bottom: 20px;
          }
          .site-footer-brand { grid-column: 1 / -1; text-align: center; }
          .site-footer-logo { height: 52px; margin: 0 auto 8px; }
          .site-footer-brand-body { font-size: 12.5px; max-width: 38ch; margin: 0 auto; line-height: 1.5; }
          .site-footer-col:nth-of-type(4) { grid-column: 1 / -1; }
          .site-footer-col h5 { font-size: 10px; margin: 0 0 10px; letter-spacing: 0.16em; }
          .site-footer-col ul { gap: 8px; }
          .site-footer-col a,
          .site-footer-col li { font-size: 13px; line-height: 1.35; }
          .site-footer-col:nth-of-type(4) ul {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 8px 18px;
          }
          .site-footer-bottom {
            padding-top: 14px;
            flex-direction: column-reverse;
            align-items: center;
            gap: 12px;
          }
          .site-footer-copy { font-size: 11px; text-align: center; }
          .site-footer-social { width: 30px; height: 30px; }
          .site-footer-social svg { width: 14px; height: 14px; }
        }
      `}</style>
      <section className={`footer-newsletter-strip${isHome ? ' is-home' : ''}`} aria-labelledby="footer-newsletter-h">
        <div className="footer-newsletter-wrap">
          <div className="footer-newsletter-intro">
            <h2 id="footer-newsletter-h" className="footer-newsletter-title">
              One <em>letter</em> a month.
            </h2>
            <p className="footer-newsletter-lede">
              This week's shelf, next week's clubs, and a paragraph
              we couldn't stop thinking about.
            </p>
          </div>

          {sent ? (
            <div className="footer-newsletter-success" role="status">
              You're on the list — see you on the first of the month.
            </div>
          ) : (
            <div>
              <form className="footer-newsletter-form" onSubmit={onSubscribe} noValidate>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Email address"
                  required
                />
                <button type="submit">Subscribe</button>
              </form>
              {error && <div className="footer-newsletter-error" role="alert">{error}</div>}
            </div>
          )}
        </div>
      </section>

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
                A cosy library-café in HSR Layout, Bengaluru — read,
                borrow books, and linger over coffee.
              </p>
            </div>

            <div className="site-footer-col">
              <h5>Explore</h5>
              <ul>
                {EXPLORE_LINKS.map((l) => (
                  <li key={l.label}><FooterLink item={l} /></li>
                ))}
              </ul>
            </div>

            <div className="site-footer-col">
              <h5>Helps</h5>
              <ul>
                {HELP_LINKS.map((l) => (
                  <li key={l.label}><FooterLink item={l} /></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="site-footer-bottom">
            <div className="site-footer-copy">
              © {year} Tapas Reading Cafe · Bengaluru
            </div>
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
          </div>
        </div>
      </footer>
    </>
  );
}
