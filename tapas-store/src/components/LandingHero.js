import React from 'react';
import { Link } from 'react-router-dom';

// Split-layout landing hero.
//
// Layout from bottom to top:
//   1. Section background: cream (#faf8f4) â the page's natural bg.
//   2. Photo: absolute rectangle pinned to the right ~55%, object-fit
//      cover. Clean rectangle; no masking.
//   3. Lime S-curve SVG: absolute over the whole section, fills the
//      left region with a smooth wavy right edge that overlaps the
//      photo's left edge â that overlap is the organic divider.
//   4. Copy + CTAs: absolute on the left, sits on top of the lime
//      region.
// The sticky nav above the hero is its own lime band (TapasStickyNav)
// and spans full width without any gap over the photo.

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

        /* Clean rectangle for the photo, right 55%. */
        .lh-photo-wrap {
          position: absolute;
          top: 0;
          right: 0;
          width: 55%;
          height: 100%;
          z-index: 1;
          overflow: hidden;
          background: ${CREAM};
        }
        .lh-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
        }

        /* The single lime S-curve: fills the left region with a wavy
           right edge that sweeps across the middle of the hero and
           overlaps the photoâs left edge. One <path>, one fill. */
        .lh-lime {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
          pointer-events: none;
          z-index: 2;
        }

        /* Text column, on top of the lime region. */
        .lh-copy {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 50%;
          z-index: 3;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 72px 56px 72px 64px;
        }
        .lh-title {
          font-family: "Fraunces", Georgia, serif;
          font-weight: 700;
          font-size: clamp(40px, 4.6vw, 66px);
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
        .lh-btn.is-pink {
          background: ${PINK};
          box-shadow: 0 8px 18px -10px rgba(224,0,79,0.7);
        }
        .lh-btn.is-orange {
          background: ${ORANGE};
          box-shadow: 0 8px 18px -10px rgba(255,147,74,0.6);
          /* Subtle text-shadow holds the white above WCAG AA on the
             light-orange field. Dropped on hover when we darken the
             background anyway. */
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
          .lh-photo-wrap { width: 50%; }
          .lh-copy {
            width: 55%;
            padding: 56px 32px 56px 48px;
          }
          .lh-title { font-size: clamp(36px, 4.6vw, 48px); }
        }
        @media (max-width: 767px) {
          .lh-root { min-height: auto; }
          .lh-photo-wrap {
            position: relative;
            width: 100%;
            height: 320px;
          }
          .lh-copy {
            position: relative;
            width: 100%;
            padding: 48px 28px 36px;
            text-align: center;
            align-items: center;
          }
          .lh-title { font-size: 34px; max-width: none; }
          .lh-lede { max-width: none; }
          .lh-ctas { justify-content: center; }
          /* On mobile the curve flows along the photo's TOP edge. */
          .lh-lime { height: 80px; top: auto; bottom: 320px; }
        }
      `}</style>

      <section className="lh-root" aria-label="Welcome to Tapas Reading Cafe">
        {/* 1. Photo rectangle, right 55%. */}
        <div className="lh-photo-wrap">
          <img
            src={photoSrc}
            alt=""
            role="presentation"
            className="lh-photo"
          />
        </div>

        {/* 2. Single lime S-curve over the whole hero. Starts
             top-left, sweeps across the middle, exits bottom-left â
             its right edge overlaps the photo. */}
        <svg
          className="lh-lime"
          viewBox="0 0 1440 700"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 0,0
               L 760,0
               C 860,180 620,360 820,540
               C 900,620 780,660 720,700
               L 0,700 Z"
            fill={LIME}
          />
        </svg>

        {/* 3. Copy + CTAs. Em dash is a real character so it renders
             as â in the output (JSX text doesnât interpret
             \\u escape sequences). */}
        <div className="lh-copy">
          <h1 className="lh-title">
            Where Stories Begin &amp;<br />Families Connect
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
      </section>
    </>
  );
}
