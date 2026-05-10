import React from 'react';
import PageBreadcrumb from '../components/PageBreadcrumb';
import AboutIntro from './about/AboutIntro';
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
  return (
    <div>
      <PageBreadcrumb name="About Us" />
      <AboutIntro />
    </div>
  );
}
