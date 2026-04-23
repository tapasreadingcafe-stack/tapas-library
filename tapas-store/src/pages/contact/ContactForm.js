import React, { useState } from 'react';
import { CONTACT_SUBJECTS, isValidEmail } from '../../data/contactConfig';

export default function ContactForm() {
  const [values, setValues] = useState({
    name: '',
    email: '',
    subject: CONTACT_SUBJECTS[0],
    message: '',
  });
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const patch = (k, v) => setValues((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!values.name.trim()) {
      setError('Please add your name.');
      return;
    }
    if (!isValidEmail(values.email)) {
      setError('That email doesn\u2019t look right.');
      return;
    }
    setError(null);
    // TODO: wire up to a real submission endpoint (Resend, Formspree,
    // or a Supabase edge function). For now we just log the payload
    // and flip the button into the confirmation state so the page
    // acknowledges the click without needing a backend round-trip.
    // eslint-disable-next-line no-console
    console.log('[contact] submit', values);
    setSent(true);
  };

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate aria-labelledby="contact-form-h">
      <div className="contact-form-kicker">Write us</div>
      <h3 id="contact-form-h" className="contact-form-title">
        Say <em>hello.</em>
      </h3>
      <p className="contact-form-lede">
        For supper reservations, private bookings, press, or a
        question about a club.
      </p>

      <div className="contact-form-row2">
        <div>
          <label htmlFor="contact-name">Name</label>
          <input
            id="contact-name"
            type="text"
            placeholder="Your name"
            required
            disabled={sent}
            value={values.name}
            onChange={(e) => patch('name', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="contact-email">Email</label>
          <input
            id="contact-email"
            type="email"
            placeholder="you@example.com"
            required
            disabled={sent}
            value={values.email}
            onChange={(e) => patch('email', e.target.value)}
          />
        </div>
      </div>

      <label htmlFor="contact-subject">Subject</label>
      <select
        id="contact-subject"
        disabled={sent}
        value={values.subject}
        onChange={(e) => patch('subject', e.target.value)}
      >
        {CONTACT_SUBJECTS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <label htmlFor="contact-message">Message</label>
      <textarea
        id="contact-message"
        placeholder="Tell us a little\u2026"
        rows={4}
        disabled={sent}
        value={values.message}
        onChange={(e) => patch('message', e.target.value)}
      />

      {error && !sent && (
        <div className="contact-form-error" role="alert">{error}</div>
      )}

      <button type="submit" disabled={sent}>
        {sent ? (
          <>Sent \u2014 we\u2019ll write back soon</>
        ) : (
          <>Send <span className="contact-form-arrow" aria-hidden="true">\u2192</span></>
        )}
      </button>
    </form>
  );
}
