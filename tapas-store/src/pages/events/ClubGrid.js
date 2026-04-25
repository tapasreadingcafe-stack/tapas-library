import React from 'react';
import { CLUBS } from '../../data/eventsData';
import { useClubs } from '../../cms/hooks';
import { adaptClubs } from '../../cms/adapters';

function ClubCard({ club }) {
  return (
    <article className="ev-club">
      <div className="ev-club-head">
        <span className="ev-club-dot" aria-hidden="true" />
        {club.schedule.toUpperCase()}
      </div>
      <h3 className="ev-club-title">
        {club.title}
        <em>{club.titleItalic}</em>
        {club.titleTail || ''}
      </h3>
      <p className="ev-club-body">{club.body}</p>
      <div className="ev-club-foot">
        {club.seats ? (
          <span className="ev-club-seats">
            <span className="ev-club-seats-n">{club.seats}</span> seats
          </span>
        ) : (
          <span className="ev-club-seats">—</span>
        )}
        <span className="ev-club-status">{club.status}</span>
      </div>
    </article>
  );
}

export default function ClubGrid({ category }) {
  const { data: rows } = useClubs();
  const adapted = adaptClubs(rows || []);
  const list = adapted.length > 0 ? adapted : CLUBS;
  // The CMS schema doesn't carry per-club category; show all clubs
  // when 'all', and keep the legacy filter behaviour against fallback
  // hardcoded data for back-compat.
  const visible = adapted.length > 0
    ? list
    : list.filter((c) => category === 'all' ? true : c.category === category);
  if (visible.length === 0) {
    return (
      <div className="ev-empty">
        <h3>No clubs matching that filter.</h3>
        <p>Try another category.</p>
      </div>
    );
  }
  return (
    <div className="ev-clubs">
      {visible.map((c) => <ClubCard key={c.id} club={c} />)}
    </div>
  );
}
