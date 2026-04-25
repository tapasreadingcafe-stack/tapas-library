import React from 'react';
import { useSiteContent } from '../context/SiteContent';
import PageRenderer from '../blocks/PageRenderer';
import LandingHero from '../components/LandingHero';
import HomeSections from '../components/HomeSections';
import { findPageByPath } from '../utils/findPage';

// =====================================================================
// Home — Tapas reading cafe landing page.
//
// The page is intentionally minimal:
//   [TapasStickyNav]  — global, mounted in App.js
//   <LandingHero />   — split-layout hero with library photo + CTAs
//   [SiteFooter]      — global, mounted in App.js
//
// No template "Services / New Arrivals / Testimonials / Newsletter"
// sections — those were generic placeholder content that never
// reflected the real product and were stripped during the CMS
// migration. The hero copy is editable via the `pages` table
// (LandingHero reads it via usePage('home')); the layout itself is
// hardcoded since it's a designed composition, not editable copy.
//
// If a future block-tree editor wants to render its own home page,
// content.pages.home.blocks can hold a non-empty array and we'll
// hand it off to PageRenderer instead. The default is empty —
// hero-only.
// =====================================================================
export default function Home() {
  const content = useSiteContent();
  const matchKey = findPageByPath(content?.pages, '/');
  const blocks = matchKey ? content.pages[matchKey]?.blocks : null;
  const hasBlocks = Array.isArray(blocks) && blocks.length > 0;

  return (
    <div style={{ background: '#caf27e', minHeight: '100vh' }}>
      <style>{`
        .tapas-landing { --landing-bg: #caf27e !important; background: #caf27e !important; }
      `}</style>
      <LandingHero />
      {hasBlocks ? <PageRenderer pageKey={matchKey} /> : <HomeSections />}
    </div>
  );
}
