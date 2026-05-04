import React from 'react';
import { Link } from 'react-router-dom';
import { usePage } from '../cms/hooks';

// Split-layout landing hero.
//
// Right side composition (desktop ≥768px):
//   1. Inline SVG (viewBox 1512×1099, from Figma export) anchored to
//      the top-right of the hero, scaled to fill via slice. The SVG
//      container intentionally extends ~20% past the hero's bottom
//      edge so the curve tail bleeds into the next section.
//   2. Inside the SVG:
//        a. A 56% white "halo" path — the original Figma curve, scaled
//           up ~3.5% from its visual centroid so a thin white-tinted
//           ring shows around the photo edge.
//        b. The hero photo, rendered via SVG <image> and clipped by
//           the same curve path (clipPathUnits=userSpaceOnUse). The
//           photo renders at 100% strength inside the silhouette.
//
// Mobile (<768px): the SVG curve is hidden and the photo renders below
// the text as a normal full-width rectangle.

const LIME = '#caf27e';
const PINK = '#E0004F';
const PINK_DARK = '#b80042';
const ORANGE = '#FF934A';
const ORANGE_DARK = '#de7628';
const INK = '#1a1a1a';
const INK_2 = '#3a3a3a';
const NAV_H = 87;

// Figma-exported curve paths (viewBox 0 0 1512 1140).
// HALO is the outer 56% white shape; PHOTO_CLIP is the inset shape
// used to mask the photo. Rendering halo behind clipped photo creates
// the natural white-tinted ring around the photo edge.
const HALO_PATH = 'M297.829 -107.732L1599.09 -71.755L1568.8 1023.8C1568.8 1023.8 1623.48 1247.11 1339.29 925.012C1055.11 602.919 724.171 860.116 560.22 714.153C396.269 568.19 943.683 46.2437 756.309 -60.1884C568.935 -166.62 297.829 -107.732 297.829 -107.732Z';
const PHOTO_CLIP_PATH = 'M380.918 -88.2392H1527.4L1527.42 1005.29C1527.42 1005.29 1620.79 1224.42 1343.06 890.578C1065.34 556.731 779.821 767.123 631.928 640.589C484.036 514.055 947.252 30.2559 779.7 -60.3314C612.148 -150.919 380.918 -88.2392 380.918 -88.2392Z';

export default function LandingHero() {
  const photoSrc = `${process.env.PUBLIC_URL || ''}/HERO-LIBRARY.png`;
  const { data: page } = usePage('home');
  const kicker = page?.hero_kicker || 'Welcome to Tapas';
  const headingHtml = page?.hero_heading_html || 'Where Stories Begin &amp; Families Connect';
  const lede = page?.hero_lede ||
    'A cozy reading space for kids and parents — discover books, enjoy simple treats, and build a love for reading together.';

  return (
    <>
      <style>{`
        .lh-root {
          position: relative;
          /* overflow-x: clip (not hidden) — hidden+visible is invalid
             per spec and browsers silently convert overflow-y to auto,
             which gives the hero its own scrollbar. clip prevents
             horizontal overflow without creating a scroll context. */
          overflow-x: clip;
          overflow-y: visible;
          background: ${LIME};
          min-height: 100vh;
          /* z-index lifts the hero (and its overflowing curve tail)
             above the following Services section so the curve bleeds
             ON TOP of the next section instead of being covered. */
          z-index: 2;
          width: 100vw;
          margin-left: 0;
          margin-top: -${NAV_H}px;
        }
        html, body { overflow-x: hidden; }

        /* Curve container: anchored top-right, spans right ~58% of
           hero, extends 20% past hero bottom so the curve tail bleeds
           into the next section. pointer-events:none keeps clicks
           passing through to anything underneath the bleed. */
        .lh-curve-wrap {
          position: absolute;
          top: 0;
          right: 0;
          width: 75%;
          height: 120%;
          z-index: 3;
          pointer-events: none;
        }
        .lh-curve-svg {
          width: 100%;
          height: 100%;
          display: block;
          pointer-events: none;
        }

        .lh-content {
          position: relative;
          z-index: 4;
          max-width: 1280px;
          margin: 0 auto;
          padding: ${NAV_H + 140}px 64px 0;
          min-height: 100vh;
          display: flex;
          align-items: flex-start;
        }
        .lh-block { max-width: 560px; }

        .lh-kicker {
          font-family: "JetBrains Mono", ui-monospace, monospace;
          font-size: 12px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: ${INK};
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }
        .lh-kicker::before {
          content: '';
          display: inline-block;
          width: 7px; height: 7px;
          border-radius: 999px;
          background: ${PINK};
        }

        .lh-title {
          font-family: "DM Serif Display", Georgia, serif;
          font-weight: 400;
          font-size: clamp(44px, 5.5vw, 72px);
          line-height: 1.05;
          letter-spacing: -0.02em;
          color: ${INK};
          margin: 0;
        }

        .lh-lede {
          font-family: "Inter", system-ui, sans-serif;
          font-size: 15px;
          line-height: 1.6;
          color: ${INK_2};
          margin: 20px 0 0;
          max-width: 44ch;
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
        .lh-btn.is-pink {
          background: ${PINK};
          box-shadow: 0 8px 18px -10px rgba(224,0,79,0.7);
        }
        .lh-btn.is-orange {
          background: ${ORANGE};
          box-shadow: 0 8px 18px -10px rgba(255,147,74,0.6);
          text-shadow: 0 1px 1px rgba(0,0,0,0.28);
        }
        .lh-btn:hover { transform: translateY(-1px); }
        .lh-btn.is-pink:hover   { background: ${PINK_DARK}; }
        .lh-btn.is-orange:hover { background: ${ORANGE_DARK}; text-shadow: none; }
        .lh-btn:focus-visible {
          outline: 2px solid ${INK};
          outline-offset: 3px;
        }

        /* Mobile photo (only shown <768px). */
        .lh-mobile-photo {
          display: none;
          width: 100%;
          height: 320px;
          object-fit: cover;
        }

        @media (max-width: 1023px) {
          .lh-content {
            padding-left: 40px;
            padding-right: 40px;
          }
          .lh-block { max-width: 440px; }
          .lh-title { font-size: clamp(40px, 5.5vw, 56px); }
          .lh-curve-wrap { width: 60%; }
        }
        @media (max-width: 767px) {
          .lh-root { min-height: auto; }
          .lh-curve-wrap { display: none; }
          .lh-content {
            position: relative;
            padding: ${NAV_H}px 24px 48px;
            min-height: auto;
            text-align: center;
            display: block;
          }
          .lh-block { max-width: none; }
          .lh-kicker { justify-content: center; }
          .lh-ctas { justify-content: center; }
          .lh-title { font-size: 38px; }
          .lh-mobile-photo { display: block; }
        }
      `}</style>

      <section className="lh-root" aria-label="Welcome to Tapas Reading Cafe">
        <div className="lh-curve-wrap" aria-hidden="true">
          <svg
            className="lh-curve-svg"
            viewBox="0 0 1512 1140"
            preserveAspectRatio="xMaxYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <clipPath id="lh-photo-clip" clipPathUnits="userSpaceOnUse">
                <path d={PHOTO_CLIP_PATH} />
              </clipPath>
            </defs>
            {/* Halo: outer curve, 56% white. Sits behind the clipped
                photo and shows around its edge as a soft ring. */}
            <path d={HALO_PATH} fill="#ffffff" opacity="0.563035" />
            {/* Photo clipped to the inset curve silhouette.
                xMidYMid slice = center-anchored, keeps the girl +
                bookshelves (the photo's main subject) prominent inside
                the curve. */}
            <image
              href={photoSrc}
              x="0" y="0" width="1512" height="1140"
              preserveAspectRatio="xMidYMid slice"
              clipPath="url(#lh-photo-clip)"
            />
          </svg>
        </div>

        <div className="lh-content">
          <div className="lh-block">
            <div className="lh-kicker">{kicker}</div>
            <h1 className="lh-title" dangerouslySetInnerHTML={{ __html: headingHtml }} />
            <p className="lh-lede">{lede}</p>
            <div className="lh-ctas">
              <Link to="/sign-up" className="lh-btn is-pink">Join now!</Link>
              <Link to="/shop"    className="lh-btn is-orange">Explore books</Link>
            </div>
            <img
              src={photoSrc}
              alt=""
              role="presentation"
              className="lh-mobile-photo"
            />
          </div>
        </div>
      </section>
    </>
  );
}
