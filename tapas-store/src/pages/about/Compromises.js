import React from 'react';
import { ABOUT_COMPROMISES } from '../../data/aboutContent';
import { useAbout } from '../../cms/hooks';
import { adaptAbout } from '../../cms/adapters';

function renderTitle(parts) {
  return parts.map((p, i) => {
    if (!p.em) return <React.Fragment key={i}>{p.t}</React.Fragment>;
    return <em key={i}>{p.t}</em>;
  });
}

function renderCardTitle(parts) {
  return parts.map((p, i) => {
    if (!p.em) return <React.Fragment key={i}>{p.t}</React.Fragment>;
    return <em key={i} className={`is-${p.em}`}>{p.t}</em>;
  });
}

export default function Compromises() {
  const { data } = useAbout();
  const adapted = adaptAbout(data);
  const c = adapted?.compromises || ABOUT_COMPROMISES;
  return (
    <section aria-labelledby="ab-compromises-h">
      <header className="ab-head-row">
        <div>
          <div className="ab-section-kicker">
            <span className="ab-section-kicker-dot" aria-hidden="true" />
            {c.kicker}
          </div>
          <h2 id="ab-compromises-h" className="ab-head-title">{renderTitle(c.title)}</h2>
        </div>
        <p className="ab-head-lede">{c.lede}</p>
      </header>

      <div className="ab-compromises">
        {c.cards.map((card) => (
          <article key={card.n} className={`ab-compromise is-${card.variant}`}>
            <div className="ab-compromise-n">{card.n}</div>
            <h3 className="ab-compromise-title">{renderCardTitle(card.title)}</h3>
            <p className="ab-compromise-body">{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
