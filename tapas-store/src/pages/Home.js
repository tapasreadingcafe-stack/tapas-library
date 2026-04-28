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

  if (useBlocks) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <PageRenderer pageKey="home" />
      </div>
    );
  }

  return (
    <div style={{ background: '#caf27e', minHeight: '100vh' }}>
      <style>{`
        .tapas-landing { --landing-bg: #caf27e !important; background: #caf27e !important; }
      `}</style>
      <LandingHero />
      <HomeSections />
    </div>
  );
}
