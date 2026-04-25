import React from 'react';
import { LIBRARY_STATS } from '../../data/libraryBooks';

export default function StatsRow() {
  return (
    <div className="library-stats" role="list">
      {LIBRARY_STATS.map((s) => (
        <div
          key={s.label}
          role="listitem"
          className={`library-stat${s.accent ? ' is-accent' : ''}`}
        >
          <div className="library-stat-value">{s.value}</div>
          <div className="library-stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
