import React, { useEffect, useRef } from 'react';
import {
  PREFERRED_CLUBS, READING_CHIPS,
} from '../../data/signUpConfig';

const DEFAULT_CHIPS = new Set(['Literary fiction', 'In translation']);

export default function StepAboutYou({ state, dispatch, errors }) {
  const firstRef = useRef(null);
  useEffect(() => { firstRef.current?.focus({ preventScroll: true }); }, []);

  const a = state.aboutYou;
  const patch = (p) => dispatch({ type: 'PATCH_ABOUT', patch: p });

  return (
    <>
      <h2 className="su-step-title">Tell us <em>who you are.</em></h2>
      <p className="su-step-sub">
        We keep this short. You can fill out the rest at the counter
        if you\u2019d rather.
      </p>

      <div className="su-fields">
        <div className="su-row-2">
          <div className="su-field">
            <label htmlFor="su-firstName">First name</label>
            <input
              id="su-firstName"
              ref={firstRef}
              type="text"
              className="su-input"
              required
              value={a.firstName}
              onChange={(e) => patch({ firstName: e.target.value })}
              autoComplete="given-name"
            />
            {errors.firstName && <div className="su-error">{errors.firstName}</div>}
          </div>
          <div className="su-field">
            <label htmlFor="su-lastName">Last name</label>
            <input
              id="su-lastName"
              type="text"
              className="su-input"
              required
              value={a.lastName}
              onChange={(e) => patch({ lastName: e.target.value })}
              autoComplete="family-name"
            />
            {errors.lastName && <div className="su-error">{errors.lastName}</div>}
          </div>
        </div>

        <div className="su-field">
          <label htmlFor="su-email">Email</label>
          <input
            id="su-email"
            type="email"
            className="su-input"
            placeholder="you@example.com"
            required
            value={a.email}
            onChange={(e) => patch({ email: e.target.value })}
            autoComplete="email"
          />
          <span className="su-help">
            We\u2019ll send one dispatch a month and nothing else.
          </span>
          {errors.email && <div className="su-error">{errors.email}</div>}
        </div>

        <div className="su-row-2">
          <div className="su-field">
            <label htmlFor="su-phone">Phone (optional)</label>
            <input
              id="su-phone"
              type="tel"
              className="su-input"
              placeholder="(555) 123 4567"
              value={a.phone}
              onChange={(e) => patch({ phone: e.target.value })}
              autoComplete="tel"
            />
          </div>
          <div className="su-field">
            <label htmlFor="su-password">Password</label>
            <input
              id="su-password"
              type="password"
              className="su-input"
              placeholder="At least 8 characters"
              required
              minLength={8}
              value={a.password}
              onChange={(e) => patch({ password: e.target.value })}
              autoComplete="new-password"
            />
            {errors.password && <div className="su-error">{errors.password}</div>}
          </div>
        </div>

        <div className="su-field">
          <label htmlFor="su-preferredClub">Preferred club to try first</label>
          <select
            id="su-preferredClub"
            className="su-select"
            value={a.preferredClub}
            onChange={(e) => patch({ preferredClub: e.target.value })}
          >
            {PREFERRED_CLUBS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="su-field">
          <label>What do you read lately?</label>
          <div className="su-chip-row">
            {READING_CHIPS.map((chip) => {
              const on = a.readingTags.includes(chip);
              const isDefault = DEFAULT_CHIPS.has(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  aria-pressed={on}
                  className={`su-chip${on ? ' is-on' : ''}${isDefault && on ? ' is-default' : ''}`}
                  onClick={() => dispatch({ type: 'TOGGLE_READING_TAG', tag: chip })}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>

        <div className="su-field">
          <label htmlFor="su-reading">One sentence \u2014 what are you reading right now? (optional)</label>
          <textarea
            id="su-reading"
            className="su-textarea"
            rows={4}
            placeholder="Middlemarch, slowly, on the train."
            value={a.currentlyReading}
            onChange={(e) => patch({ currentlyReading: e.target.value })}
          />
        </div>
      </div>
    </>
  );
}
