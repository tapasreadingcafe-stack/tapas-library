import React from 'react';
import ContactHero from './contact/ContactHero';
import HoursStrip from './contact/HoursStrip';
import StylizedMap from './contact/StylizedMap';
import FindUsCard from './contact/FindUsCard';
import ContactForm from './contact/ContactForm';
import FAQSection from './contact/FAQSection';
import CONTACT_CSS from './contact/contactStyles';

export default function Contact() {
  return (
    <div className="contact-root">
      <style>{CONTACT_CSS}</style>

      <ContactHero />

      <div className="contact-wrap">
        <HoursStrip />
        <StylizedMap />

        <div className="contact-layout">
          <FindUsCard />
          <ContactForm />
        </div>

        <FAQSection />
      </div>
    </div>
  );
}
