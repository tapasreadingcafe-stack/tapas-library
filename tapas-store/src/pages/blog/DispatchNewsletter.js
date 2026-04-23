import React, { useState } from 'react';
import { isValidEmail } from '../../data/journalPosts';

export default function DispatchNewsletter() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('That email doesn\u2019t look right.');
      return;
    }
    setError(null);
    // TODO: wire up to a real newsletter provider (Buttondown,
    // Mailchimp, Resend). For now we log and flip to the success
    // state so the UI acknowledges the click without a backend.
    // eslint-disable-next-line no-console
    console.log({ email, source: 'blog-dispatch-card' });
    setSent(true);
  };

  return (
    <section className="blog-dispatch" aria-labelledby="blog-dispatch-h">
      <div>
        <div className="blog-dispatch-kicker">The Dispatch</div>
        <h2 id="blog-dispatch-h" className="blog-dispatch-title">
          One <em>letter</em> a month.
        </h2>
        <p className="blog-dispatch-lede">
          This week\u2019s shelf, next week\u2019s clubs, and a paragraph
          we couldn\u2019t stop thinking about.
        </p>
      </div>

      <div>
        {sent ? (
          <div className="blog-dispatch-success" role="status">
            You\u2019re on the list \u2014 see you on the first of the month.
          </div>
        ) : (
          <>
            <form className="blog-dispatch-form" onSubmit={onSubmit} noValidate>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email address"
                required
              />
              <button type="submit">Subscribe</button>
            </form>
            {error && (
              <div className="blog-dispatch-error" role="alert">{error}</div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
