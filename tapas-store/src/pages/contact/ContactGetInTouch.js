import React, { useState } from 'react';

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
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const setField = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    // eslint-disable-next-line no-console
    console.log({ ...form, source: 'contact-get-in-touch' });
    setSent(true);
  };

  return (
    <section className="contact-git" aria-labelledby="contact-git-h">
      <style>{CSS}</style>
      <div className="contact-git-wrap">
        <div className="contact-git-head">
          <h2 id="contact-git-h">Get In Touch With Us</h2>
          <p>
            Questions about membership, events, or visiting? Drop us a message and we&rsquo;ll get back to you soon.
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
                <p><a href="tel:+918792470576" style={{ color: 'inherit', textDecoration: 'none' }}>+91 87924 70576</a></p>
              </div>
            </div>
            <div className="contact-git-info-row">
              <span className="contact-git-info-icon"><ClockIcon /></span>
              <div>
                <h4>Working Time</h4>
                <p>Tuesday – Sunday: 10 AM – 8 PM<br />Monday: Closed</p>
              </div>
            </div>
          </div>

          <form className="contact-git-form" onSubmit={onSubmit} noValidate>
            <div className="contact-git-field">
              <label htmlFor="cgit-name">Your name</label>
              <input id="cgit-name" type="text" placeholder="Priya Sharma" value={form.name} onChange={setField('name')} required />
            </div>
            <div className="contact-git-field">
              <label htmlFor="cgit-email">Email address</label>
              <input id="cgit-email" type="email" placeholder="priya@gmail.com" value={form.email} onChange={setField('email')} required />
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
            {sent && <div className="contact-git-success" role="status">Thanks — we'll be in touch shortly.</div>}
          </form>
        </div>
      </div>
    </section>
  );
}
