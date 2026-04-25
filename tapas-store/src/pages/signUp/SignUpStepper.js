import React from 'react';
import { STEP_LABELS } from '../../data/signUpConfig';

export default function SignUpStepper({ step, onGoto }) {
  return (
    <div className="su-stepper" role="list" aria-label="Sign-up progress">
      {STEP_LABELS.map((label, i) => {
        const idx = i + 1;
        const state = idx === step ? 'active' : idx < step ? 'done' : 'upcoming';
        const clickable = idx < step;
        return (
          <React.Fragment key={label}>
            <button
              type="button"
              role="listitem"
              className={`su-step is-${state}`}
              data-clickable={clickable ? 'true' : 'false'}
              disabled={!clickable}
              onClick={clickable ? () => onGoto(idx) : undefined}
              aria-current={state === 'active' ? 'step' : undefined}
            >
              <span className="su-step-circle">
                {state === 'done' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="5 12 10 17 19 7" />
                  </svg>
                ) : idx}
              </span>
              <span className="su-step-label">{label.toUpperCase()}</span>
            </button>
            {idx < STEP_LABELS.length && <span className="su-step-rule" aria-hidden="true" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
