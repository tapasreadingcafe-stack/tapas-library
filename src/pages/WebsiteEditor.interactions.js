// =====================================================================
// InteractionsPanel — Phase 8 MVP right-panel Interactions tab.
//
// Edits data-tapas-* attributes on the selected node via the existing
// setNodeAttribute mutation. That means undo/redo, autosave, and the
// Settings Attributes list all keep working without special-casing.
//
// Two sections: Entrance (scroll-into-view) and Hover. Click / page /
// timed triggers and multi-step timelines stay deferred — each is its
// own careful session.
// =====================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  ENTRANCE_PRESETS, HOVER_PRESETS,
} from './WebsiteEditor.anim';
import { EasingField } from './WebsiteEditor.bezier';
import {
  TIMELINE_PROPERTIES, TIMELINE_TARGETS, TIMELINE_TRIGGERS,
  makeStep, parseTimelineAttr, stringifyTimeline, timelineAttrName,
  isDriveTrigger,
} from './WebsiteEditor.timeline';

const W = {
  panelBorder: '#2a2a2a',
  text:        '#e5e5e5',
  textDim:     '#a0a0a0',
  textFaint:   '#6a6a6a',
  accent:      '#146ef5',
  accentDim:   '#146ef522',
  input:       '#1a1a1a',
  inputBorder: '#3a3a3a',
  labelSize:   '11px',
  labelLetter: '0.05em',
};

function Section({ title, children }) {
  return (
    <div style={{ borderTop: `1px solid ${W.panelBorder}` }}>
      <div style={{
        padding: '10px 12px 4px',
        color: W.textDim, fontSize: W.labelSize, fontWeight: 700,
        letterSpacing: W.labelLetter, textTransform: 'uppercase',
      }}>{title}</div>
      <div style={{ padding: '0 12px 10px' }}>{children}</div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      gap: '8px', padding: '4px 0',
    }}>
      <span style={{ width: '64px', flexShrink: 0, color: W.textDim, fontSize: '11px' }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%', height: '22px',
        background: W.input, color: W.text,
        border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
        fontSize: '11px',
      }}
    >
      <option value="">{placeholder || 'None'}</option>
      {options.map((o) => (
        <option key={o.key || o.value} value={o.key || o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function DurationInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', height: '22px',
        padding: '0 6px',
        background: W.input, color: W.text,
        border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
        fontSize: '11px', fontFamily: 'ui-monospace, monospace',
      }}
    />
  );
}

// Buffered input — the timeline step editor writes JSON back to the
// attribute on every change, which (through applyEdit) coalesces
// rapid edits into one history entry but still burns a Supabase
// round-trip per keystroke. Committing on blur / Enter instead lets
// the user type "600" without three intermediate saves, AND gives
// us a single point to apply clamping / parsing.
function CommitInput({ value, onCommit, placeholder, parse }) {
  const [draft, setDraft] = useState(String(value ?? ''));
  const lastCommittedRef = useRef(String(value ?? ''));
  // If the external value changes (reorder, reset), sync in.
  useEffect(() => {
    const next = String(value ?? '');
    if (next !== lastCommittedRef.current) {
      setDraft(next);
      lastCommittedRef.current = next;
    }
  }, [value]);
  const commit = () => {
    const parsed = typeof parse === 'function' ? parse(draft) : draft;
    const normalised = String(parsed ?? '');
    if (normalised === lastCommittedRef.current) return;
    lastCommittedRef.current = normalised;
    setDraft(normalised);
    onCommit(parsed);
  };
  return (
    <input
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.currentTarget.blur(); }
        if (e.key === 'Escape') {
          setDraft(lastCommittedRef.current);
          e.currentTarget.blur();
        }
      }}
      style={{
        width: '100%', height: '22px',
        padding: '0 6px',
        background: W.input, color: W.text,
        border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
        fontSize: '11px', fontFamily: 'ui-monospace, monospace',
      }}
    />
  );
}

// Clamp string input to 0..1 inclusive. Non-numeric input falls back
// to "0" so the stored JSON always deserialises cleanly.
function parseProgress(raw) {
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return '0';
  return String(Math.max(0, Math.min(1, n)));
}

export default function InteractionsPanel({ node, onSetAttribute, onPlayTimeline }) {
  if (!node) {
    return (
      <div style={{ padding: '24px 12px', color: W.textFaint, fontSize: '11px', textAlign: 'center' }}>
        Select an element to add interactions.
      </div>
    );
  }
  const attrs = node.attributes || {};
  const hasEntrance = !!attrs['data-tapas-anim'];
  const hasHover    = !!attrs['data-tapas-hover'];
  const hasClick    = !!attrs['data-tapas-click-anim'];
  const hasLoad     = !!attrs['data-tapas-load-anim'];

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {/* Entrance (scroll-in) */}
      <Section title="Entrance">
        <Row label="Effect">
          <Select
            value={attrs['data-tapas-anim']}
            onChange={(v) => {
              onSetAttribute('data-tapas-anim', v);
              // When turning off, also clear timing attributes so a
              // later re-enable starts from clean defaults.
              if (!v) {
                onSetAttribute('data-tapas-anim-duration', '');
                onSetAttribute('data-tapas-anim-delay', '');
                onSetAttribute('data-tapas-anim-easing', '');
              }
            }}
            options={ENTRANCE_PRESETS}
            placeholder="None"
          />
        </Row>
        {hasEntrance && (
          <>
            <Row label="Duration">
              <DurationInput
                value={attrs['data-tapas-anim-duration']}
                onChange={(v) => onSetAttribute('data-tapas-anim-duration', v)}
                placeholder="600ms"
              />
            </Row>
            <Row label="Delay">
              <DurationInput
                value={attrs['data-tapas-anim-delay']}
                onChange={(v) => onSetAttribute('data-tapas-anim-delay', v)}
                placeholder="0ms"
              />
            </Row>
            <Row label="Easing">
              <EasingField
                value={attrs['data-tapas-anim-easing']}
                onChange={(v) => onSetAttribute('data-tapas-anim-easing', v)}
              />
            </Row>
            <div style={{
              marginTop: '6px', padding: '6px 8px',
              background: W.accentDim, color: W.accent,
              border: `1px solid ${W.accent}`, borderRadius: '3px',
              fontSize: '10.5px', lineHeight: 1.4,
            }}>
              Fires once when the element enters the viewport.
            </div>
          </>
        )}
      </Section>

      {/* Hover */}
      <Section title="Hover">
        <Row label="Effect">
          <Select
            value={attrs['data-tapas-hover']}
            onChange={(v) => onSetAttribute('data-tapas-hover', v)}
            options={HOVER_PRESETS}
            placeholder="None"
          />
        </Row>
        {hasHover && (
          <div style={{
            marginTop: '6px', padding: '6px 8px',
            color: W.textFaint, fontSize: '10.5px', lineHeight: 1.4,
          }}>
            Hover a rendered element in the canvas to preview.
          </div>
        )}
      </Section>

      {/* Click — one-shot animation on click */}
      <Section title="Click">
        <Row label="Effect">
          <Select
            value={attrs['data-tapas-click-anim']}
            onChange={(v) => {
              onSetAttribute('data-tapas-click-anim', v);
              if (!v) {
                onSetAttribute('data-tapas-click-duration', '');
                onSetAttribute('data-tapas-click-easing', '');
              }
            }}
            options={ENTRANCE_PRESETS}
            placeholder="None"
          />
        </Row>
        {hasClick && (
          <>
            <Row label="Duration">
              <DurationInput
                value={attrs['data-tapas-click-duration']}
                onChange={(v) => onSetAttribute('data-tapas-click-duration', v)}
                placeholder="400ms"
              />
            </Row>
            <Row label="Easing">
              <EasingField
                value={attrs['data-tapas-click-easing']}
                onChange={(v) => onSetAttribute('data-tapas-click-easing', v)}
              />
            </Row>
            <div style={{
              marginTop: '6px', padding: '6px 8px',
              background: W.accentDim, color: W.accent,
              border: `1px solid ${W.accent}`, borderRadius: '3px',
              fontSize: '10.5px', lineHeight: 1.4,
            }}>
              Fires every time the element is clicked.
            </div>
          </>
        )}
      </Section>

      {/* Page-load — fires once per render */}
      <Section title="Page load">
        <Row label="Effect">
          <Select
            value={attrs['data-tapas-load-anim']}
            onChange={(v) => {
              onSetAttribute('data-tapas-load-anim', v);
              if (!v) {
                onSetAttribute('data-tapas-load-duration', '');
                onSetAttribute('data-tapas-load-delay', '');
                onSetAttribute('data-tapas-load-easing', '');
              }
            }}
            options={ENTRANCE_PRESETS}
            placeholder="None"
          />
        </Row>
        {hasLoad && (
          <>
            <Row label="Duration">
              <DurationInput
                value={attrs['data-tapas-load-duration']}
                onChange={(v) => onSetAttribute('data-tapas-load-duration', v)}
                placeholder="600ms"
              />
            </Row>
            <Row label="Delay">
              <DurationInput
                value={attrs['data-tapas-load-delay']}
                onChange={(v) => onSetAttribute('data-tapas-load-delay', v)}
                placeholder="0ms"
              />
            </Row>
            <Row label="Easing">
              <EasingField
                value={attrs['data-tapas-load-easing']}
                onChange={(v) => onSetAttribute('data-tapas-load-easing', v)}
              />
            </Row>
            <div style={{
              marginTop: '6px', padding: '6px 8px',
              background: W.accentDim, color: W.accent,
              border: `1px solid ${W.accent}`, borderRadius: '3px',
              fontSize: '10.5px', lineHeight: 1.4,
            }}>
              Fires once when the page finishes rendering. Stagger
              hero elements by giving each a different delay.
            </div>
          </>
        )}
      </Section>

      <TimelineEditor
        node={node}
        onSetAttribute={onSetAttribute}
        onPlayTimeline={onPlayTimeline}
      />

      <div style={{
        padding: '16px 12px', borderTop: `1px solid ${W.panelBorder}`,
        color: W.textFaint, fontSize: '10.5px', lineHeight: 1.5,
      }}>
        Timed, mouse-move, and while-scrolling triggers land in a
        follow-up phase.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// TimelineEditor — Phase G multi-step timeline UI.
//
// A single Section that lets staff pick a trigger (scroll / load /
// click / hover) and edit its step list. The list is stored JSON-
// encoded on data-tapas-timeline-<trigger>; every mutation writes
// through onSetAttribute so undo / redo already works.
// ---------------------------------------------------------------------
function TimelineEditor({ node, onSetAttribute, onPlayTimeline }) {
  const [trigger, setTrigger] = useState('scroll');
  const attrs = node?.attributes || {};
  const rawAttr = attrs[timelineAttrName(trigger)];
  const steps = parseTimelineAttr(rawAttr);

  const writeSteps = (next) => {
    onSetAttribute(timelineAttrName(trigger), stringifyTimeline(next));
  };

  const updateStep = (index, patch) => {
    const next = steps.slice();
    next[index] = { ...next[index], ...patch };
    writeSteps(next);
  };

  const removeStep = (index) => {
    const next = steps.slice();
    next.splice(index, 1);
    writeSteps(next);
  };

  const moveStep = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= steps.length) return;
    const next = steps.slice();
    [next[index], next[target]] = [next[target], next[index]];
    writeSteps(next);
  };

  const addStep = () => {
    const next = steps.slice();
    next.push(makeStep({ trigger }));
    writeSteps(next);
  };
  const drive = isDriveTrigger(trigger);

  return (
    <Section title="Timeline">
      <Row label="Trigger">
        <select
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          style={{
            width: '100%', height: '22px',
            background: W.input, color: W.text,
            border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
            fontSize: '11px',
          }}
        >
          {TIMELINE_TRIGGERS.map((t) => (
            <option key={t} value={t}>{triggerLabel(t)}</option>
          ))}
        </select>
      </Row>

      {steps.length === 0 ? (
        <div style={{
          padding: '10px 0', color: W.textFaint, fontSize: '11px',
          lineHeight: 1.5,
        }}>
          No steps yet. Add one below to build a multi-step animation.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '6px 0' }}>
          {steps.map((step, i) => (
            <StepCard
              key={step.id || i}
              index={i}
              step={step}
              trigger={trigger}
              canMoveUp={i > 0}
              canMoveDown={i < steps.length - 1}
              onChange={(patch) => updateStep(i, patch)}
              onRemove={() => removeStep(i)}
              onMoveUp={() => moveStep(i, -1)}
              onMoveDown={() => moveStep(i, 1)}
            />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
        <button
          onClick={addStep}
          style={{
            flex: 1, padding: '6px', fontSize: '11px', fontWeight: 600,
            background: W.accentDim, color: W.accent,
            border: `1px solid ${W.accent}`, borderRadius: '3px',
            cursor: 'pointer',
          }}
        >+ Add step</button>
        <button
          onClick={() => onPlayTimeline?.(trigger)}
          disabled={steps.length === 0 || drive}
          title={
            drive ? 'Drive triggers run live — scroll or move the mouse over the element'
            : steps.length === 0 ? 'Add a step first' : 'Preview on canvas'
          }
          style={{
            flex: 1, padding: '6px', fontSize: '11px', fontWeight: 600,
            background: (steps.length && !drive) ? '#146ef5' : '#222',
            color: (steps.length && !drive) ? '#fff' : W.textFaint,
            border: `1px solid ${(steps.length && !drive) ? '#146ef5' : W.inputBorder}`,
            borderRadius: '3px',
            cursor: (steps.length && !drive) ? 'pointer' : 'not-allowed',
          }}
        >▶ Play preview</button>
      </div>
      {drive && (
        <div style={{
          marginTop: '6px', padding: '6px 8px',
          background: W.accentDim, color: W.accent,
          border: `1px solid ${W.accent}`, borderRadius: '3px',
          fontSize: '10.5px', lineHeight: 1.4,
        }}>
          {trigger === 'scroll-drive'
            ? 'Properties interpolate between From and To as the element scrolls through the viewport. Use the progress window (0–1) to pick the active range.'
            : 'Properties track the cursor position over the element. From = pointer at left/top edge, To = right/bottom edge.'}
        </div>
      )}
    </Section>
  );
}

function triggerLabel(key) {
  switch (key) {
    case 'scroll': return 'Scroll into view';
    case 'load':   return 'Page load';
    case 'click':  return 'Click';
    case 'hover':  return 'Hover';
    default:       return key;
  }
}

function StepCard({ index, step, trigger, canMoveUp, canMoveDown, onChange, onRemove, onMoveUp, onMoveDown }) {
  const prop = TIMELINE_PROPERTIES.find((p) => p.key === step.property) || TIMELINE_PROPERTIES[0];
  const isScrollDrive = trigger === 'scroll-drive';
  const isMouse       = trigger === 'mouse';
  return (
    <div style={{
      border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
      padding: '8px', background: '#1f1f1f',
      display: 'flex', flexDirection: 'column', gap: '6px',
    }}>
      {/* Header row — index + reorder + delete */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        paddingBottom: '4px', borderBottom: `1px solid ${W.panelBorder}`,
      }}>
        <span style={{ color: W.textDim, fontSize: '10.5px', fontWeight: 700 }}>
          STEP {index + 1}
        </span>
        <span style={{ flex: 1 }} />
        <MiniBtn onClick={onMoveUp}   disabled={!canMoveUp}   title="Move up">↑</MiniBtn>
        <MiniBtn onClick={onMoveDown} disabled={!canMoveDown} title="Move down">↓</MiniBtn>
        <MiniBtn onClick={onRemove} title="Remove step">×</MiniBtn>
      </div>

      <Row label="Target">
        <select
          value={step.target || 'self'}
          onChange={(e) => onChange({ target: e.target.value, targetValue: e.target.value === 'self' ? '' : step.targetValue })}
          style={{
            width: '100%', height: '22px',
            background: W.input, color: W.text,
            border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
            fontSize: '11px',
          }}
        >
          {TIMELINE_TARGETS.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      </Row>
      {step.target && step.target !== 'self' && (
        <Row label={step.target === 'class' ? 'Class' : 'Selector'}>
          <CommitInput
            value={step.targetValue}
            onCommit={(v) => onChange({ targetValue: v })}
            placeholder={step.target === 'class' ? '.card' : '.hero > h1'}
          />
        </Row>
      )}

      <Row label="Property">
        <select
          value={step.property}
          onChange={(e) => {
            const nextProp = TIMELINE_PROPERTIES.find((p) => p.key === e.target.value);
            onChange({
              property: e.target.value,
              unit: nextProp?.unit || '',
            });
          }}
          style={{
            width: '100%', height: '22px',
            background: W.input, color: W.text,
            border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
            fontSize: '11px',
          }}
        >
          {TIMELINE_PROPERTIES.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
      </Row>

      <div style={{ display: 'flex', gap: '6px' }}>
        <Row label="From">
          <CommitInput
            value={step.from}
            onCommit={(v) => onChange({ from: v })}
            placeholder="0"
          />
        </Row>
        <Row label="To">
          <CommitInput
            value={step.to}
            onCommit={(v) => onChange({ to: v })}
            placeholder="0"
          />
        </Row>
      </div>

      {prop.unit && (
        <Row label="Unit">
          <CommitInput
            value={step.unit}
            onCommit={(v) => onChange({ unit: v })}
            placeholder={prop.unit}
          />
        </Row>
      )}

      {!isScrollDrive && !isMouse && (
        <>
          <div style={{ display: 'flex', gap: '6px' }}>
            <Row label="Duration">
              <CommitInput
                value={step.duration}
                onCommit={(v) => onChange({ duration: clampMs(v) })}
                placeholder="600"
              />
            </Row>
            <Row label="Delay">
              <CommitInput
                value={step.delay}
                onCommit={(v) => onChange({ delay: clampMs(v) })}
                placeholder="0"
              />
            </Row>
          </div>
          <Row label="Easing">
            <EasingField
              value={step.easing}
              onChange={(v) => onChange({ easing: v })}
            />
          </Row>
        </>
      )}

      {isScrollDrive && (
        <div style={{ display: 'flex', gap: '6px' }}>
          <Row label="Start">
            <CommitInput
              value={step.fromProgress}
              parse={parseProgress}
              onCommit={(v) => onChange({ fromProgress: v })}
              placeholder="0"
            />
          </Row>
          <Row label="End">
            <CommitInput
              value={step.toProgress}
              parse={parseProgress}
              onCommit={(v) => onChange({ toProgress: v })}
              placeholder="1"
            />
          </Row>
        </div>
      )}

      {isMouse && (
        <Row label="Axis">
          <select
            value={step.axis || 'x'}
            onChange={(e) => onChange({ axis: e.target.value })}
            style={{
              width: '100%', height: '22px',
              background: W.input, color: W.text,
              border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
              fontSize: '11px',
            }}
          >
            <option value="x">X (horizontal)</option>
            <option value="y">Y (vertical)</option>
          </select>
        </Row>
      )}
    </div>
  );
}

function clampMs(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function MiniBtn({ children, onClick, disabled, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: '22px', height: '22px', padding: 0,
        background: disabled ? 'transparent' : '#2a2a2a',
        color: disabled ? W.textFaint : W.text,
        border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '12px', fontWeight: 700, lineHeight: 1,
      }}
    >{children}</button>
  );
}
