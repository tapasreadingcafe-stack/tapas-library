import React from 'react';
import { CONTACT_INFO } from '../../data/contactConfig';
import { useContactInfo } from '../../cms/hooks';
import { adaptContactInfo } from '../../cms/adapters';

function Row({ label, children }) {
  return (
    <div className="contact-info-row">
      <div className="contact-info-key">{label}</div>
      <div className="contact-info-value">{children}</div>
    </div>
  );
}

export default function FindUsCard() {
  const { data: row } = useContactInfo();
  const i = adaptContactInfo(row) || CONTACT_INFO;
  return (
    <section className="contact-info" aria-labelledby="contact-info-h">
      <div className="contact-info-kicker">Find us</div>
      <h3 id="contact-info-h" className="contact-info-title">
        The <em>room itself.</em>
      </h3>
      <p className="contact-info-lede">
        The fastest way is the front door. For everything else:
      </p>

      <Row label="Address">
        <b>{i.address.bold}</b>
        {i.address.line}
      </Row>
      <Row label="Phone">
        <a href={`tel:${i.phone.replace(/[^+\d]/g, '')}`}>{i.phone}</a>
      </Row>
      <Row label="Email">
        <a href={`mailto:${i.email}`}>{i.email}</a>
      </Row>
      <Row label="Events">
        <a href={`mailto:${i.events}`}>{i.events}</a>
      </Row>
      <Row label="Press">
        <a href={`mailto:${i.press}`}>{i.press}</a>
      </Row>
    </section>
  );
}
