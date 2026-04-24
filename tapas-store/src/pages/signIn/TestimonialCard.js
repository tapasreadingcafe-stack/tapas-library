import React from 'react';

export default function TestimonialCard() {
  return (
    <aside className="si-testimonial" aria-label="Member testimonial">
      <p className="si-testimonial-quote">
        \u201CThe only place Iâve ever wanted to stay until
        closing, and the only place thatâs ever let me.\u201D
      </p>
      <div className="si-testimonial-author">
        <span className="si-avatar" aria-hidden="true">H</span>
        <div>
          <div className="si-testimonial-name">Helena N.</div>
          <div className="si-testimonial-meta">Member since 2022</div>
        </div>
      </div>
    </aside>
  );
}
