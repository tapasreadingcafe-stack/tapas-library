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

import React from 'react';
import {
  ENTRANCE_PRESETS, HOVER_PRESETS,
} from './WebsiteEditor.anim';
import { EasingField } from './WebsiteEditor.bezier';

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

export default function InteractionsPanel({ node, onSetAttribute }) {
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

      <div style={{
        padding: '16px 12px', borderTop: `1px solid ${W.panelBorder}`,
        color: W.textFaint, fontSize: '10.5px', lineHeight: 1.5,
      }}>
        Timed, mouse-move, and while-scrolling triggers — plus
        multi-step timelines with custom cubic-bezier — land in
        Phase 8b.
      </div>
    </div>
  );
}
