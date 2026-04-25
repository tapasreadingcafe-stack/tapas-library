import React from 'react';
import { CONTACT_FAQS } from '../../data/contactConfig';

export default function FAQSection() {
  return (
    <section aria-labelledby="contact-faq-h">
      <div className="contact-faq-head">
        <div>
          <div className="contact-faq-kicker">
            <span className="contact-faq-dot" aria-hidden="true" />
            Good to know
          </div>
          <h2 id="contact-faq-h" className="contact-faq-title">
            A few <em>common questions.</em>
          </h2>
        </div>
        <p className="contact-faq-lede">
          If you can’t find it here, just ask us at the counter.
        </p>
      </div>

      <div className="contact-faq-grid">
        {CONTACT_FAQS.map((f, idx) => (
          <details
            key={f.q}
            className="contact-faq"
            open={idx === 0 ? true : undefined}
          >
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
