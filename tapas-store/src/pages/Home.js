import React from 'react';
import LandingHero from '../components/LandingHero';
import HomeSections from '../components/HomeSections';
import PageRenderer from '../blocks/PageRenderer';
import { useSiteContent } from '../context/SiteContent';

// Per-page feature flag: when content.pages.home.use_blocks is true
// (set via the dashboard editor or directly in store_content_v2),
// render the Home page from the block tree instead of the hand-coded
// LandingHero / HomeSections components. Off by default — flip it
// only after verifying the block version matches via `?v2=1`.
export default function Home() {
  const content = useSiteContent();
  const useBlocks = !!content?.pages?.home?.use_blocks;
  const photoSrc = `${process.env.PUBLIC_URL || ''}/hero-library-curved.png`;
  const photoMobileSrc = `${process.env.PUBLIC_URL || ''}/hero-library-mobile.jpg`;

  if (useBlocks) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <PageRenderer pageKey="home" />
      </div>
    );
  }

  return (
    <div className="home-wrap">
      <style>{`
        .home-wrap {
          position: relative;
          background: #caf27e;
          min-height: 100vh;
          overflow-x: hidden;
        }
        .tapas-landing { --landing-bg: #caf27e !important; background: transparent !important; }

        /* Old-design hero image: the library photo with the organic curve
           baked into the PNG, shown in full (object-fit: contain) pinned to
           the upper-right, its transparent curve blending into the lime. */
        .home-composite {
          position: absolute;
          top: 0; right: 0;
          width: 70%;
          height: 68vh;
          max-width: 1512px;
          pointer-events: none;
          z-index: 2;
        }
        .home-composite img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: right top;
          display: block;
        }

        /* Mobile-only clean photo banner (desktop uses the SVG composite). */
        .home-mobile-hero { display: none; }

        /* The hero photo now fits within the hero (100vh), so the first
           section only needs a little breathing room above it. */
        .home-wrap .hs-section:first-of-type { padding-top: 40px; }
        /* Give the last section room to breathe above the black footer
           strip — not so much it reads as an empty lime band. */
        .home-wrap .hs-section:last-of-type { padding-bottom: 48px; }

        @media (max-width: 1023px) {
          .home-composite { width: 78%; }
          .home-wrap .hs-section:first-of-type { padding-top: 40px; }
        }
        @media (max-width: 767px) {
          .home-composite { display: none; }
          /* The app wrapper is lime on the home route, so the nav's reserved
             strip above the hero reads as lime, not a white bar. The photo
             banner sits at the top of .home-wrap, just below that strip. */
          .home-wrap .hs-section:first-of-type { padding-top: 64px; }
          /* Extra breathing room on mobile between the pricing cards and
             the black newsletter/footer strip. */
          .home-wrap .hs-section:last-of-type { padding-bottom: 64px; }
          .home-mobile-hero {
            display: block;
            width: 100%;
            height: 240px;
            margin-top: 0;
          }
          .home-mobile-hero img {
            width: 100%; height: 100%;
            object-fit: cover; object-position: center;
            display: block;
          }
          .lh-root { margin-top: 0 !important; }
          .lh-content { padding-top: 32px !important; }
        }
      `}</style>

      <div className="home-composite" aria-hidden="true">
        <img src={photoSrc} alt="" />
      </div>

      <div className="home-mobile-hero" aria-hidden="true">
        <img src={photoMobileSrc} alt="" />
      </div>

      <LandingHero />
      <HomeSections />
    </div>
  );
}
