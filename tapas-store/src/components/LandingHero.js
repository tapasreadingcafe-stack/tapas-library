import React from 'react';
import { Link } from 'react-router-dom';

// Split-layout landing hero.
//
// Layout from bottom to top:
//   1. Section background: cream (--bg).
//   2. Photo: absolute rectangle pinned to the right 50%, natural
//      aspect, object-fit cover.
//   3. Lime S-curve SVG: overlays the left region, rolling across the
//      middle; its right edge overlaps the photo's left edge.
//   4. Content (kicker + H1 + lede + CTAs): max-width 560, vertically
//      centered in the hero.
//
// The sticky nav above sits at z-index 50. The hero pulls itself up
// under the nav with a negative margin so the photo + lime curve
// start at viewport Y=0 and the nav floats on top.

const LIME = '#caf27e';
const PINK = '#E0004F';
const PINK_DARK = '#b80042';
const ORANGE = '#FF934A';
const ORANGE_DARK = '#de7628';
const INK = '#1a1a1a';
const INK_2 = '#3a3a3a';
const NAV_H = 87; // Keep in sync with TapasStickyNav's measured height.

export default function LandingHero() {
  const photoSrc = `${process.env.PUBLIC_URL || ''}/HERO-LIBRARY.png`;

  return (
    <>
      <style>{`
        .lh-root {
          position: relative;
          overflow-x: hidden;
          overflow-y: visible;
          background: ${LIME};
          min-height: 100vh;
          isolation: isolate;
          /* Full-bleed: root spans the full viewport width. margin-
             left:0 anchors to body's left edge (x=0); width:100vw
             extends 8–15px past body's right (into the scrollbar
             gutter) so the photo truly reaches the viewport edge.
             The sibling <style> below hides body's horizontal
             overflow so this bleed never produces an h-scrollbar. */
          width: 100vw;
          margin-left: 0;
          margin-top: -${NAV_H}px;
        }
        /* Prevent horizontal page scroll caused by the full-bleed
           root extending into the scrollbar gutter. */
        html, body { overflow-x: hidden; }

        /* Image displayed in full, no crop, fitted inside the wrap.
           The PNG has organic curves baked into two corners; those
           curves show against the lime hero background as part of
           the design. */
        .lh-photo-wrap {
          position: absolute;
          top: 0; right: 0; bottom: 0;
          width: 70%;
          z-index: 1;
        }
        .lh-photo {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: right center;
          display: block;
        }

        /* Single lazy S-curve lime overlay. Anchored top-left, sweeps
           through the middle, exits bottom-left; the wavy right edge
           overlaps the photo's left edge as the organic divider. */
        .lh-lime {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
          pointer-events: none;
          z-index: 2;
        }

        /* Content frame: full-viewport tall, flex-centered so the
           block sits in the vertical middle regardless of hero size.
           padding-top accounts for the pulled-up nav space so the
           content never ends up under the nav bar. */
        .lh-content {
          position: relative;
          z-index: 3;
          max-width: 1280px;
          margin: 0 auto;
          /* top padding clears the pulled-up nav area and pushes
             the text block into the upper-middle of the hero
             (~35-40% from top). */
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

        @media (max-width: 1023px) {
          .lh-content { padding-left: 40px; padding-right: 40px; }
          .lh-block { max-width: 440px; }
          .lh-title { font-size: clamp(40px, 5.5vw, 56px); }
        }
        @media (max-width: 767px) {
          .lh-root { min-height: auto; }
          .lh-photo-wrap {
            position: relative;
            width: 100%;
            height: 320px;
            top: auto; right: auto; bottom: auto;
          }
          .lh-lime { display: none; }
          .lh-content {
            position: relative;
            padding: ${NAV_H}px 24px 48px;
            min-height: auto;
            text-align: center;
            justify-content: center;
          }
          .lh-block { max-width: none; }
          .lh-kicker { justify-content: center; }
          .lh-ctas { justify-content: center; }
          .lh-title { font-size: 38px; }
        }
      `}</style>

      <section className="lh-root" aria-label="Welcome to Tapas Reading Cafe">
        <div className="lh-photo-wrap">
          <img
            src={photoSrc}
            alt=""
            role="presentation"
            className="lh-photo"
          />
        </div>

        <svg
          className="lh-lime"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 0,0
               L 820,0
               C 780,220 900,480 760,700
               C 680,820 780,900 720,900
               L 0,900 Z"
            fill={LIME}
          />
        </svg>

        <div className="lh-content">
          <div className="lh-block">
            <div className="lh-kicker">Welcome to Tapas</div>
            <h1 className="lh-title">
              Where Stories Begin &amp; Families Connect
            </h1>
            <p className="lh-lede">
              A cozy reading space for kids and parents — discover books,
              enjoy simple treats, and build a love for reading together.
            </p>
            <div className="lh-ctas">
              <Link to="/sign-up" className="lh-btn is-pink">Join now!</Link>
              <Link to="/shop"    className="lh-btn is-orange">Explore books</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
