import React from 'react';
import { LIBRARY_HOUSE_RULES } from '../../data/libraryBooks';
import { usePage } from '../../cms/hooks';

export default function HouseRules() {
  const { data: page } = usePage('library');
  const rules = page?.stats_jsonb?.houseRules || LIBRARY_HOUSE_RULES;
  return (
    <section className="library-rules" aria-labelledby="library-rules-h">
      <div>
        <div className="library-rules-kicker">House Rules</div>
        <h2 id="library-rules-h" className="library-rules-title">
          How the lending works.
        </h2>
        <p className="library-rules-body">
          No library card, no paperwork. Just a signature in the
          ledger by the door and a promise to bring them back.
        </p>
      </div>
      <ol className="library-rules-list">
        {rules.map((r) => (
          <li key={r.n} className="library-rules-item">
            <span className="library-rules-num">{r.n}</span>
            <div>
              <h4 className="library-rules-item-title">{r.title}</h4>
              <p className="library-rules-item-body">{r.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
