import React from 'react';
import { ABOUT_STATS } from '../../data/aboutContent';

function renderTitle(parts) {
  return parts.map((p, i) => p.em
    ? <em key={i}>{p.t}</em>
    : <React.Fragment key={i}>{p.t}</React.Fragment>,
  );
}

export default function StatsStrip() {
  return (
    <section className="ab-stats" aria-labelledby="ab-stats-h">
      <h2 id="ab-stats-h" className="ab-stats-title">
        {renderTitle(ABOUT_STATS.title)}
      </h2>
      <div className="ab-stats-grid" role="list">
        {ABOUT_STATS.items.map((s) => (
          <div key={s.label} className="ab-stat" role="listitem">
            <div className="ab-stat-value">{s.value}</div>
            <div className="ab-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
