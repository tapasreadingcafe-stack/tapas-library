import React, { useEffect, useRef } from 'react';
import {
  PACE_OPTIONS, ATTENTION_OPTIONS, FORMAT_OPTIONS,
  REREAD_OPTIONS, SPOILER_CHIPS,
} from '../../data/signUpConfig';

function Seg({ label, options, value, onChange }) {
  return (
    <div className="su-field">
      <label>{label}</label>
      <div className="su-seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === o}
            className={value === o ? 'is-on' : ''}
            onClick={() => onChange(o)}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function StepYourReading({ state, dispatch }) {
  const topRef = useRef(null);
  useEffect(() => { topRef.current?.focus({ preventScroll: true }); }, []);

  const r = state.yourReading;
  const patch = (p) => dispatch({ type: 'PATCH_READING', patch: p });

  return (
    <>
      <h2 ref={topRef} tabIndex={-1} className="su-step-title">
        How do you <em>read best?</em>
      </h2>
      <p className="su-step-sub">
        This helps Ava pick your quarterly book. All optional.
      </p>

      <div className="su-fields">
        <Seg label="Pace"            options={PACE_OPTIONS}       value={r.pace}      onChange={(v) => patch({ pace: v })} />
        <Seg label="Attention span"  options={ATTENTION_OPTIONS}  value={r.attention} onChange={(v) => patch({ attention: v })} />

        <div className="su-field">
          <label>Format preference</label>
          <div className="su-chip-row">
            {FORMAT_OPTIONS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={r.format === f}
                className={`su-chip${r.format === f ? ' is-on' : ''}`}
                onClick={() => patch({ format: r.format === f ? '' : f })}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="su-field">
          <label>Re-reading</label>
          <div className="su-radio-row">
            {REREAD_OPTIONS.map((o) => (
              <label key={o} className="su-radio">
                <input
                  type="radio"
                  name="su-reread"
                  value={o}
                  checked={r.reread === o}
                  onChange={() => patch({ reread: o })}
                />
                {o}
              </label>
            ))}
          </div>
        </div>

        <div className="su-field">
          <label>Which of these spoils your week if it’s bad</label>
          <div className="su-chip-row">
            {SPOILER_CHIPS.map((s) => {
              const on = r.spoilers.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  className={`su-chip${on ? ' is-on' : ''}`}
                  onClick={() => dispatch({ type: 'TOGGLE_SPOILER', tag: s })}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="su-field">
          <label htmlFor="su-rec">The book you recommend most often (optional)</label>
          <input
            id="su-rec"
            type="text"
            className="su-input"
            placeholder="e.g. The Magic Mountain"
            value={r.mostRecommendedBook}
            onChange={(e) => patch({ mostRecommendedBook: e.target.value })}
          />
        </div>
      </div>
    </>
  );
}
