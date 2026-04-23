import React from 'react';
import AboutHero from './about/AboutHero';
import Manifesto from './about/Manifesto';
import StatsStrip from './about/StatsStrip';
import BriefHistory from './about/BriefHistory';
import Compromises from './about/Compromises';
import TeamGrid from './about/TeamGrid';
import PressQuotes from './about/PressQuotes';
import ABOUT_CSS from './about/aboutStyles';

export default function About() {
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
