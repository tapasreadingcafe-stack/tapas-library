import React from 'react';
import PageBreadcrumb from '../components/PageBreadcrumb';
import ContactHeroImage from './contact/ContactHeroImage';
import ContactGetInTouch from './contact/ContactGetInTouch';
import StylizedMap from './contact/StylizedMap';
import PageRenderer from '../blocks/PageRenderer';
import { useSiteContent } from '../context/SiteContent';

export default function Contact() {
  const content = useSiteContent();
  if (content?.pages?.contact?.use_blocks) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <PageRenderer pageKey="contact" />
      </div>
    );
  }
  return (
    <div style={{ background: '#F6F8F7' }}>
      <PageBreadcrumb name="Contact Us" />
      <ContactHeroImage />
      <ContactGetInTouch />
      <StylizedMap />
    </div>
  );
}
