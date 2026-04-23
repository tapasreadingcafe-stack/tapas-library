import React from 'react';
import { ABOUT_TEAM } from '../../data/aboutContent';

function renderTitle(parts) {
  return parts.map((p, i) => p.em
    ? <em key={i}>{p.t}</em>
    : <React.Fragment key={i}>{p.t}</React.Fragment>,
  );
}

export default function TeamGrid() {
  const t = ABOUT_TEAM;
  return (
    <section aria-labelledby="ab-team-h">
      <header className="ab-head-row">
        <div>
          <div className="ab-section-kicker">
            <span className="ab-section-kicker-dot" aria-hidden="true" />
            {t.kicker}
          </div>
          <h2 id="ab-team-h" className="ab-head-title">{renderTitle(t.title)}</h2>
        </div>
        <p className="ab-head-lede">{t.lede}</p>
      </header>

      <div className="ab-team">
        {t.members.map((m) => (
          <article key={m.initials} className="ab-member">
            <div
              className="ab-member-avatar"
              style={{ background: m.color }}
              aria-hidden="true"
            >
              {m.initials}
            </div>
            <div className="ab-member-body">
              <h3 className="ab-member-name">{m.name}</h3>
              <p className="ab-member-role">{m.role}</p>
              <div className="ab-member-reading">
                <b>Reading</b>
                {m.reading}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
