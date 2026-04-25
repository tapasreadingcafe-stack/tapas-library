import React from 'react';
import { ABOUT_MANIFESTO } from '../../data/aboutContent';
import { useAbout } from '../../cms/hooks';
import { adaptAbout } from '../../cms/adapters';

function renderTitle(parts) {
  return parts.map((p, i) => p.em
    ? <em key={i}>{p.t}</em>
    : <React.Fragment key={i}>{p.t}</React.Fragment>,
  );
}

export default function Manifesto() {
  const { data } = useAbout();
  const adapted = adaptAbout(data);
  const m = adapted?.manifesto || ABOUT_MANIFESTO;
  return (
    <section className="ab-manifesto" aria-labelledby="ab-manifesto-h">
      <div>
        <div className="ab-section-kicker">{m.kicker}</div>
        <h2 id="ab-manifesto-h" className="ab-section-title">{renderTitle(m.title)}</h2>
      </div>
      <div className="ab-manifesto-body">
        {m.paragraphs.map((p, i) => (
          // The CSS ::first-letter selector paints whichever character
          // starts the paragraph. Each body intentionally omits the
          // drop-cap letter — we prepend it here so the glyph that gets
          // styled is the one the spec asks for.
          <p key={i} className="ab-paragraph">{p.dropCap}{p.body}</p>
        ))}
      </div>
    </section>
  );
}
