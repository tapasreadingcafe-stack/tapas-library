import React from 'react';
import { LIBRARY_STATS } from '../../data/libraryBooks';
import { usePage } from '../../cms/hooks';

export default function StatsRow() {
  const { data: page } = usePage('library');
  const stats = page?.stats_jsonb?.stats || LIBRARY_STATS;
  return (
    <div className="library-stats" role="list">
      {stats.map((s) => (
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
