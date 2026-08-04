import React, { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { isValidEmail } from '../../data/journalPosts';

const CSS = `
  .contact-git {
    background: #F6F8F7;
    padding: 40px 0 96px;
    font-family: 'Poppins', system-ui, sans-serif;
  }
  .contact-git-wrap {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 64px;
  }
  .contact-git-head {
    text-align: center;
    margin-bottom: 56px;
  }
  .contact-git-head h2 {
    margin: 0 0 12px;
    font-weight: 700;
    font-size: 28px;
    line-height: 1.2;
    color: #1a1a1a;
  }
  .contact-git-head p {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: #4a4a4a;
  }
  .contact-git-grid {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: 64px;
    align-items: start;
  }
  .contact-git-info {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }
  .contact-git-info-row {
    display: grid;
    grid-template-columns: 36px 1fr;
    gap: 16px;
    align-items: start;
  }
  .contact-git-info-icon {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    color: #1a1a1a;
  }
  .contact-git-info-row h4 {
    margin: 0 0 6px;
    font-weight: 600;
    font-size: 16px;
    color: #1a1a1a;
  }
  .contact-git-info-row p {
    margin: 0;
    font-size: 14px;
    line-height: 1.55;
    color: #1a1a1a;
  }
  .contact-git-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .contact-git-field { display: flex; flex-direction: column; gap: 8px; }
  .contact-git-field label {
    font-size: 14px;
    font-weight: 500;
    color: #1a1a1a;
  }
  .contact-git-field input,
  .contact-git-field textarea {
    width: 100%;
    border: 1px solid #d6d6d6;
    border-radius: 8px;
    padding: 12px 16px;
    font-family: inherit;
    font-size: 14px;
    color: #1a1a1a;
    outline: none;
    background: #fff;
    transition: border-color 150ms;
  }
  .contact-git-field input:focus,
  .contact-git-field textarea:focus { border-color: #8A58DB; }
  .contact-git-field textarea { resize: vertical; min-height: 100px; }
  .contact-git-field input::placeholder,
  .contact-git-field textarea::placeholder { color: #b0b0b0; }
  .contact-git-submit {
    align-self: flex-start;
    background: #E0004F;
    color: #fff;
    border: 0;
    border-radius: 999px;
    padding: 13px 36px;
    font-family: inherit;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    transition: background 150ms, transform 150ms;
    margin-top: 4px;
  }
  .contact-git-submit:hover { background: #b80042; transform: translateY(-1px); }
  .contact-git-success {
    color: #1a7a3e;
    font-size: 14px;
    margin-top: 6px;
  }
  .contact-git-thanks {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
    padding: 48px 28px;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    box-shadow: 0 10px 34px rgba(0,0,0,0.06);
  }
  .contact-git-thanks-badge {
    width: 66px;
    height: 66px;
    border-radius: 999px;
    background: #E9F9EC;
    color: #1a7a3e;
    display: grid;
    place-items: center;
    font-size: 32px;
    font-weight: 700;
    line-height: 1;
    animation: cgit-pop 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  @keyframes cgit-pop {
    from { transform: scale(0.4); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
  }
  .contact-git-thanks-title {
    margin: 4px 0 0;
    font-size: 22px;
    font-weight: 700;
    color: #1a1a1a;
  }
  .contact-git-thanks-text {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: #4a4a4a;
    max-width: 34ch;
  }
  .contact-git-thanks-again {
    margin-top: 10px;
    background: #E0004F;
    color: #fff;
    border: 0;
    border-radius: 999px;
    padding: 11px 26px;
    font-family: inherit;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    transition: background 150ms, transform 150ms;
  }
  .contact-git-thanks-again:hover { background: #b80042; transform: translateY(-1px); }
  .contact-git-error {
    color: #c0392b;
    font-size: 13px;
    margin-top: 2px;
  }
  .contact-git-field input.is-invalid {
    border-color: #c0392b;
    background: #fdf3f2;
  }
  .contact-git-field input.is-invalid:focus {
    border-color: #c0392b;
    box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.12);
  }

  @media (max-width: 1023px) {
    .contact-git { padding: 56px 0 72px; }
    .contact-git-wrap { padding: 0 40px; }
    .contact-git-grid { grid-template-columns: 1fr; gap: 48px; }
  }
  @media (max-width: 639px) {
    .contact-git { padding: 40px 0 56px; }
    .contact-git-wrap { padding: 0 20px; }
    .contact-git-head { margin-bottom: 36px; }
    .contact-git-head h2 { font-size: 24px; }
  }
`;

function PinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 4.5h3l1.5 4-2 1.2a12 12 0 006.8 6.8l1.2-2 4 1.5v3a2 2 0 01-2 2A16 16 0 013 6.5a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ContactGetInTouch() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState({});

  // Clear a field's validation error as soon as the visitor edits it, so
  // a stale message doesn't linger after they've corrected the value.
  const clearError = (k) => setErrors((prev) => {
    if (!prev[k]) return prev;
    const next = { ...prev };
    delete next[k];
    return next;
  });

  const setField = (k) => (e) => {
    const { value } = e.target;
    setForm((s) => ({ ...s, [k]: value }));
    clearError(k);
  };

  // Phone field: allow only digits, a leading +, spaces and hyphens —
  // strip everything else as the visitor types so it can't hold letters.
  const setPhone = (e) => {
    const cleaned = e.target.value.replace(/[^\d+\s-]/g, '');
    setForm((s) => ({ ...s, phone: cleaned }));
    clearError('phone');
  };

  // Validate on blur so the box turns red as soon as the visitor leaves a
  // field with a bad value — not only after they hit Submit.
  const onEmailBlur = () => {
    const v = form.email.trim();
    if (v && !isValidEmail(v)) {
      setErrors((prev) => ({ ...prev, email: 'Enter a valid email address.' }));
    }
  };
  const onPhoneBlur = () => {
    const v = form.phone.trim();
    if (v && v.replace(/\D/g, '').length < 7) {
      setErrors((prev) => ({ ...prev, phone: 'Enter a valid phone number.' }));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (sent) return;

    // Validate before saving: email must look like an email; phone, if
    // provided, must carry enough digits to be a real number.
    const nextErrors = {};
    if (!isValidEmail(form.email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (form.phone.trim() && form.phone.replace(/\D/g, '').length < 7) {
      nextErrors.phone = 'Enter a valid phone number.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    // Save to Supabase so the message lands in the staff dashboard's
    // Contact Inbox (/store/inbox). Mirrors the ContactForm block's
    // shape: legacy name/email/message columns + the full `fields` blob
    // (which carries Subject). Errors are swallowed so the visitor still
    // gets a thank-you and we never leak backend/RLS details.
    try {
      await supabase.from('contact_submissions').insert([{
        source_page: 'contact',
        created_at: new Date().toISOString(),
        fields: { ...form },
        name: form.name.trim() || null,
        email: form.email.trim() || null,
        message: form.message.trim() || null,
      }]);
    } catch {
      /* network / RLS — still thank the visitor */
    }

    // Fire-and-forget: email the cafe about the new submission. The SMTP
    // credentials + recipient live in Supabase secrets (server-side) — the
    // browser only sends the form fields. Failures never affect the
    // visitor's thank-you.
    supabase.functions.invoke('notify-contact-email', {
      body: {
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
        fields: { ...form },
      },
    }).catch(() => {});

    setSent(true);
  };

  const firstName = form.name.trim().split(/\s+/).filter(Boolean)[0] || '';

  const resetForm = () => {
    setSent(false);
    setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    setErrors({});
  };

  return (
    <section className="contact-git" aria-labelledby="contact-git-h">
      <style>{CSS}</style>
      <div className="contact-git-wrap">
        <div className="contact-git-head">
          <h2 id="contact-git-h">Get In Touch With Us</h2>
          <p>
            Get in touch with us for library memberships, café reservations, book launches, author talks, poetry readings, storytelling sessions, literary events, workshops, collaborations, and venue bookings. We&rsquo;d love to hear from you!
          </p>
        </div>

        <div className="contact-git-grid">
          <div className="contact-git-info">
            <div className="contact-git-info-row">
              <span className="contact-git-info-icon"><PinIcon /></span>
              <div>
                <h4>Address</h4>
                <p>2nd Floor, 2628, 27th Main Rd, above Juice Junction, 1st Sector, HSR Layout, Bengaluru, Karnataka 560102</p>
              </div>
            </div>
            <div className="contact-git-info-row">
              <span className="contact-git-info-icon"><PhoneIcon /></span>
              <div>
                <h4>Phone</h4>
                <p>
                  <a href="tel:+917760393951" style={{ color: 'inherit', textDecoration: 'none' }}>+91 77603 93951</a>
                  {' / '}
                  <a href="tel:+918792470576" style={{ color: 'inherit', textDecoration: 'none' }}>+91 87924 70576</a>
                </p>
              </div>
            </div>
            <div className="contact-git-info-row">
              <span className="contact-git-info-icon"><ClockIcon /></span>
              <div>
                <h4>Working Time</h4>
                <p>Tuesday – Sunday: 11 AM – 9 PM<br />Monday: Closed</p>
              </div>
            </div>
          </div>

          {sent ? (
            <div className="contact-git-thanks" role="status" aria-live="polite">
              <div className="contact-git-thanks-badge" aria-hidden="true">✓</div>
              <h3 className="contact-git-thanks-title">
                Thank you{firstName ? `, ${firstName}` : ''}!
              </h3>
              <p className="contact-git-thanks-text">
                Your message has landed in our inbox — we&rsquo;ll get back to you shortly.
              </p>
              <button type="button" className="contact-git-thanks-again" onClick={resetForm}>
                Send another message
              </button>
            </div>
          ) : (
            <form className="contact-git-form" onSubmit={onSubmit} noValidate>
              <div className="contact-git-field">
                <label htmlFor="cgit-name">Your name</label>
                <input id="cgit-name" type="text" placeholder="Priya Sharma" value={form.name} onChange={setField('name')} required />
              </div>
              <div className="contact-git-field">
                <label htmlFor="cgit-email">Email address</label>
                <input id="cgit-email" type="email" inputMode="email" className={errors.email ? 'is-invalid' : undefined} placeholder="priya@gmail.com" value={form.email} onChange={setField('email')} onBlur={onEmailBlur} required />
                {errors.email && <span className="contact-git-error" role="alert">{errors.email}</span>}
              </div>
              <div className="contact-git-field">
                <label htmlFor="cgit-phone">Phone number</label>
                <input id="cgit-phone" type="tel" inputMode="tel" className={errors.phone ? 'is-invalid' : undefined} placeholder="+91 98765 43210" value={form.phone} onChange={setPhone} onBlur={onPhoneBlur} />
                {errors.phone && <span className="contact-git-error" role="alert">{errors.phone}</span>}
              </div>
              <div className="contact-git-field">
                <label htmlFor="cgit-subject">Subject</label>
                <input id="cgit-subject" type="text" placeholder="What's this about? (optional)" value={form.subject} onChange={setField('subject')} />
              </div>
              <div className="contact-git-field">
                <label htmlFor="cgit-message">Message</label>
                <textarea id="cgit-message" rows="4" placeholder="Hi! I'd like to ask about" value={form.message} onChange={setField('message')} required />
              </div>
              <button type="submit" className="contact-git-submit">Submit</button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
