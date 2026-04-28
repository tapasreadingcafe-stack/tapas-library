import React from 'react';
import AboutHero from './about/AboutHero';
import Manifesto from './about/Manifesto';
import StatsStrip from './about/StatsStrip';
import BriefHistory from './about/BriefHistory';
import Compromises from './about/Compromises';
import TeamGrid from './about/TeamGrid';
import PressQuotes from './about/PressQuotes';
import ABOUT_CSS from './about/aboutStyles';
import PageRenderer from '../blocks/PageRenderer';
import { useSiteContent } from '../context/SiteContent';

export default function About() {
  const content = useSiteContent();
  if (content?.pages?.about?.use_blocks) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <PageRenderer pageKey="about" />
      </div>
    );
  }
  return <AboutLegacy />;
}

function AboutLegacy() {
  return (
    <div className="ab-root">
      <style>{ABOUT_CSS}</style>
      <AboutHero />
      <div className="ab-wrap">
        <Manifesto />
        <StatsStrip />
        <BriefHistory />
        <Compromises />
        <TeamGrid />
        <PressQuotes />
      </div>
    </div>
  );
}
