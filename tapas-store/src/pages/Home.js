import React from 'react';
import LandingHero from '../components/LandingHero';
import HomeSections from '../components/HomeSections';

export default function Home() {
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
