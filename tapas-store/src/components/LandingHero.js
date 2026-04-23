import React from 'react';
import { Link } from 'react-router-dom';

// Split-layout landing hero that replaces the v2 tree's "big books /
// small plates" band. The right-hand photo already ships with an
// organic white cut-out on its top-left and bottom-left edges, so
// the photo itself forms the cream-to-photo boundary. A lime SVG
// shape peeks through the photo's bottom-right + sits behind its
// left edge, matching the spec's "curve sweeps from top-left, dips
// down through the middle, continues along the bottom of the right
// side" requirement.

const LIME = '#caf27e';
const PINK = '#E0004F';
const PINK_DARK = '#b80042';
const ORANGE = '#FF934A';
const ORANGE_DARK = '#de7628';
const INK = '#1a1a1a';
const INK_2 = '#3a3a3a';
const CREAM = '#faf8f4';

export default function LandingHero() {
  const photoSrc = `${process.env.PUBLIC_URL || ''}/HERO-LIBRARY.png`;

  return (
    <>
      <style>{`
        .lh-root {
          position: relative;
          overflow: hidden;
          background: ${CREAM};
          min-height: 560px;
          isolation: isolate;
        }
        .lh-lime {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
          pointer-events: none;
          z-index: 0;
        }
        .lh-grid {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: 45% 55%;
          min-height: 560px;
          max-width: 1440px;
          margin: 0 auto;
        }
        .lh-copy {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 72px 40px 72px 64px;
          position: relative;
          z-index: 3;
        }
        .lh-title {
          font-family: "Fraunces", Georgia, serif;
          font-weight: 700;
          font-size: clamp(40px, 4.6vw, 64px);
          line-height: 1.05;
          letter-spacing: -0.02em;
          color: ${INK};
          margin: 0;
          max-width: 14ch;
        }
        .lh-lede {
          font-family: "Inter", system-ui, sans-serif;
          font-size: 15px;
          line-height: 1.6;
          color: ${INK_2};
          margin: 18px 0 0;
          max-width: 52ch;
        }
        .lh-ctas {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 28px;
        }
        .lh-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 13px 30px;
          border-radius: 999px;
          font-family: "Inter", system-ui, sans-serif;
          font-size: 14.5px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          text-decoration: none;
          border: 0;
          cursor: pointer;
          transition: background 150ms, transform 150ms, box-shadow 150ms;
          color: #fff;
        }
        .lh-btn.is-pink   { background: ${PINK};   box-shadow: 0 8px 18px -10px rgba(224,0,79,0.7); }
        .lh-btn.is-orange {
          background: ${ORANGE};
          box-shadow: 0 8px 18px -10px rgba(255,147,74,0.6);
          /* Subtle text-shadow to hold the white above WCAG AA on the
             light-orange field without changing the brand tone. */
          text-shadow: 0 1px 1px rgba(0,0,0,0.28);
        }
        .lh-btn:hover { transform: translateY(-1px); }
        .lh-btn.is-pink:hover   { background: ${PINK_DARK}; }
        .lh-btn.is-orange:hover { background: ${ORANGE_DARK}; text-shadow: none; }
        .lh-btn:focus-visible {
          outline: 2px solid ${INK};
          outline-offset: 3px;
        }

        .lh-photo-wrap {
          position: relative;
          overflow: hidden;
        }
        .lh-photo {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
        }
        /* Soft white-to-transparent wash along the top of the photo
           so the sticky nav's right-side items (Sign In / Sign Up /
           icons) stay legible when they happen to sit over darker
           parts of the library. Kept subtle so it doesn't flatten
           the image. */
        .lh-photo-scrim {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 120px;
          background: linear-gradient(
            to bottom,
            rgba(202, 242, 126, 0.6) 0%,
            rgba(202, 242, 126, 0) 100%
          );
          pointer-events: none;
          z-index: 1;
        }

        @media (max-width: 1023px) {
          .lh-grid { grid-template-columns: 50% 50%; }
          .lh-copy { padding: 56px 32px 56px 48px; }
          .lh-title { font-size: clamp(36px, 4.6vw, 48px); }
        }
        @media (max-width: 767px) {
          .lh-root { min-height: auto; }
          .lh-grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto;
            min-height: auto;
          }
          .lh-copy {
            padding: 48px 28px 36px;
            text-align: center;
            align-items: center;
          }
          .lh-title { font-size: 34px; max-width: none; }
          .lh-lede { max-width: none; }
          .lh-ctas { justify-content: center; }
          .lh-photo-wrap { height: 360px; }
          .lh-photo-scrim {
            /* Mobile: curve flows along the photo's TOP edge, so we
               tint that band with a lime wash for a visual echo. */
            background: linear-gradient(
              to bottom,
              ${LIME} 0%,
              rgba(202, 242, 126, 0.35) 30%,
              rgba(202, 242, 126, 0) 70%
            );
            height: 80px;
          }
        }
      `}</style>

      <section className="lh-root" aria-label="Welcome to Tapas Reading Cafe">
        {/* Lime curve. One <path> fills the bottom+right half of the
            section with a soft S-wave across the top. The photo's
            built-in white cut-out overlays the left edge of this
            shape so the lime "peeks out" where the photo ends. */}
        <svg
          className="lh-lime"
          viewBox="0 0 1440 560"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 0,130
               C 320,40 600,220 820,170
               C 1040,120 1220,260 1440,180
               L 1440,560
               L 0,560 Z"
            fill={LIME}
          />
        </svg>

        <div className="lh-grid">
          <div className="lh-copy">
            <h1 className="lh-title">
              Where Stories Begin &amp;<br />Families Connect
            </h1>
            <p className="lh-lede">
              A cozy reading space for kids and parents \u2014 discover
              books, enjoy simple treats, and build a love for reading
              together.
            </p>
            <div className="lh-ctas">
              <Link to="/sign-up" className="lh-btn is-pink">Join now!</Link>
              <Link to="/shop"    className="lh-btn is-orange">Explore books</Link>
            </div>
          </div>

          <div className="lh-photo-wrap">
            <div className="lh-photo-scrim" aria-hidden="true" />
            <img
              src={photoSrc}
              alt=""
              role="presentation"
              className="lh-photo"
            />
          </div>
        </div>
      </section>
    </>
  );
}
