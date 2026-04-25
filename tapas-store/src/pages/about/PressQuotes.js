import React from 'react';
import { ABOUT_PRESS } from '../../data/aboutContent';
import { useAbout } from '../../cms/hooks';
import { adaptAbout } from '../../cms/adapters';

function renderTitle(parts) {
  return parts.map((p, i) => p.em
    ? <em key={i}>{p.t}</em>
    : <React.Fragment key={i}>{p.t}</React.Fragment>,
  );
}

export default function PressQuotes() {
  const { data } = useAbout();
  const adapted = adaptAbout(data);
  const p = adapted?.press || ABOUT_PRESS;
  return (
    <section aria-labelledby="ab-press-h">
      <header className="ab-head-row">
        <div>
          <div className="ab-section-kicker">
            <span className="ab-section-kicker-dot" aria-hidden="true" />
            {p.kicker}
          </div>
          <h2 id="ab-press-h" className="ab-head-title">{renderTitle(p.title)}</h2>
        </div>
        <p className="ab-head-lede">{p.lede}</p>
      </header>

      <div className="ab-press">
        {p.quotes.map((q) => (
          <blockquote key={q.source} className="ab-press-card">
            <cite className="ab-press-source">{q.source}</cite>
            <p className="ab-press-body">{q.body}</p>
            <footer className="ab-press-foot">{q.footer}</footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
