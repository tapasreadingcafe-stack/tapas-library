import React from 'react';
import ContactHero from './contact/ContactHero';
import HoursStrip from './contact/HoursStrip';
import StylizedMap from './contact/StylizedMap';
import FindUsCard from './contact/FindUsCard';
import ContactForm from './contact/ContactForm';
import FAQSection from './contact/FAQSection';
import CONTACT_CSS from './contact/contactStyles';
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
  return <ContactLegacy />;
}

function ContactLegacy() {
  return (
    <div className="contact-root">
      <style>{CONTACT_CSS}</style>

      <ContactHero />

      <div className="contact-wrap">
        <div className="contact-layout">
          <FindUsCard />
          <ContactForm />
        </div>

        <HoursStrip />
        <StylizedMap />

        <FAQSection />
      </div>
    </div>
  );
}
