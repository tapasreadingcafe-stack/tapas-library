import React from 'react';
import { Link } from 'react-router-dom';
import { usePage } from '../cms/hooks';

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

const PINK = '#E0004F';
const PINK_DARK = '#b80042';
const ORANGE = '#FF934A';
const ORANGE_DARK = '#de7628';
const INK = '#1a1a1a';
const INK_2 = '#3a3a3a';
const NAV_H = 87; // Keep in sync with TapasStickyNav's measured height.

export default function LandingHero() {
  const { data: page } = usePage('home');
  const pub = process.env.PUBLIC_URL || '';
  const rawHeading = page?.hero_heading_html || 'Where Stories Begin &amp; Families Connect';
  // Bind "&" to the word after it (non-breaking space) so it never dangles at
  // a line end — when the heading wraps, "&" moves down with the next word.
  const headingHtml = rawHeading.replace(/&(amp;)?\s+/i, (m, amp) => `&${amp || ''} `);
  const rawLede = page?.hero_lede ||
    'A cozy reading space for kids and parents, discover books, enjoy simple treats, and build a love for reading together.';
  // Drop any em dash from the lede copy.
  const lede = rawLede.replace(/\s*—\s*/g, ', ');

  return (
    <>
      <style>{`
        .lh-root {
          position: relative;
          overflow-x: hidden;
          overflow-y: visible;
          /* Desktop/tablet: full-bleed library photo as the hero background,
             with a left-weighted dark scrim so the white heading stays
             readable. Reset to transparent on mobile (uses .home-mobile-hero). */
          background:
            linear-gradient(100deg, rgba(0,0,0,0.68) 0%, rgba(0,0,0,0.44) 33%, rgba(0,0,0,0.16) 57%, rgba(0,0,0,0) 80%),
            linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.42) 100%),
            url(${pub}/hero-library-crop.png) center center / cover no-repeat;
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

        /* SVG composite (white decorative shape + clipped photo) is
           now rendered by Home.js so it can span the hero + Our
           Services section seamlessly. */

        /* Content frame: full-viewport tall, flex-centered so the
           block sits in the vertical middle regardless of hero size.
           padding-top accounts for the pulled-up nav space so the
           content never ends up under the nav bar. */
        .lh-content {
          position: relative;
          z-index: 4;
          max-width: 1280px;
          margin: 0 auto;
          /* Full-height hero: clear the nav, then vertically center the
             heading block over the photo. */
          padding: ${NAV_H}px 64px 64px;
          min-height: 100vh;
          display: flex;
          align-items: center;
        }
        .lh-block { max-width: 560px; }

        .lh-kicker {
          font-family: "Poppins", system-ui, sans-serif;
          font-size: 12px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #fff;
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
          font-family: "Poppins", system-ui, sans-serif;
          font-weight: 500;
          font-size: 52px;
          line-height: 65px;
          letter-spacing: -2px;
          color: #fff;
          text-shadow: 0 2px 28px rgba(0,0,0,0.45);
          margin: 0;
        }

        /* Forced break before "&" — enabled on mobile only (see @767). */
        .lh-break { display: none; }

        .lh-lede {
          font-family: "Poppins", system-ui, sans-serif;
          font-size: 15px;
          line-height: 1.6;
          color: rgba(255,255,255,0.92);
          text-shadow: 0 1px 12px rgba(0,0,0,0.4);
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
        }
        .lh-btn.is-orange {
          background: ${ORANGE};
        }
        .lh-btn:hover { transform: translateY(-1px); }
        .lh-btn.is-pink:hover   { background: ${PINK_DARK}; }
        .lh-btn.is-orange:hover { background: ${ORANGE_DARK}; text-shadow: none; }
        .lh-btn:focus-visible {
          outline: 2px solid ${INK};
          outline-offset: 3px;
        }

        @media (max-width: 1023px) {
          .lh-content {
            padding: ${NAV_H}px 40px 56px;
            min-height: 100vh;
            align-items: center;
          }
          .lh-block { max-width: 420px; }
          .lh-title {
            font-size: 40px;
            line-height: 1.12;
            letter-spacing: -1px;
          }
          .lh-lede { margin-top: 14px; max-width: 32ch; font-size: 14px; }
          .lh-ctas { margin-top: 22px; }
          .lh-btn { padding: 11px 24px; font-size: 13.5px; }
        }
        @media (max-width: 767px) {
          /* Mobile keeps the lime hero + .home-mobile-hero banner: drop the
             photo background and return the text to dark ink. */
          .lh-root { min-height: auto; background: transparent; }
          .lh-content {
            position: relative;
            padding: ${NAV_H}px 24px 48px;
            min-height: auto;
            align-items: flex-start;
            text-align: center;
            justify-content: center;
          }
          .lh-block { max-width: none; }
          .lh-kicker { justify-content: center; color: ${INK}; }
          .lh-ctas { justify-content: center; }
          .lh-title {
            color: #000;
            text-shadow: none;
            font-size: clamp(28px, 8vw, 34px);
            line-height: 1.15;
            letter-spacing: -0.02em;
          }
          .lh-break { display: inline; }
          .lh-lede {
            color: ${INK_2};
            text-shadow: none;
            font-size: 14.5px;
            line-height: 1.55;
            max-width: 46ch;
            margin-left: auto;
            margin-right: auto;
          }
        }
      `}</style>

      <section className="lh-root" aria-label="Welcome to Tapas Reading Cafe">
        <div className="lh-content">
          <div className="lh-block">
            <h1 className="lh-title" dangerouslySetInnerHTML={{ __html: headingHtml }} />
            <p className="lh-lede">{lede}</p>
            <div className="lh-ctas">
              <Link to="/sign-up" className="lh-btn is-pink">Join now!</Link>
              <Link to="/contact" className="lh-btn is-orange">Visit us</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
