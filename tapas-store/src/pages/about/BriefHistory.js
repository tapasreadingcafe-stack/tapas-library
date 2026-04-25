import React from 'react';
import { ABOUT_HISTORY } from '../../data/aboutContent';
import { useAbout } from '../../cms/hooks';
import { adaptAbout } from '../../cms/adapters';

function renderTitle(parts) {
  return parts.map((p, i) => p.em
    ? <em key={i}>{p.t}</em>
    : <React.Fragment key={i}>{p.t}</React.Fragment>,
  );
}

export default function BriefHistory() {
  const { data } = useAbout();
  const adapted = adaptAbout(data);
  const h = adapted?.history || ABOUT_HISTORY;
  return (
    <section className="ab-history" aria-labelledby="ab-history-h">
      <div className="ab-history-kicker">{h.kicker}</div>
      <h2 id="ab-history-h" className="ab-history-title">{renderTitle(h.title)}</h2>
      <p className="ab-history-lede">{h.lede}</p>
      <div className="ab-history-grid" role="list">
        {h.items.map((item) => (
          <div key={item.year} className="ab-history-cell" role="listitem">
            <div className="ab-history-year">{item.year}</div>
            <h3 className="ab-history-heading">{item.heading}</h3>
            <p className="ab-history-body">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
