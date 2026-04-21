// =====================================================================
// CubicBezierPicker — B4 easing curve widget.
//
// Drag-handle SVG picker used by the Transition and Interactions
// easing dropdowns. P0 and P3 are pinned at (0,0) and (1,1); P1 and
// P2 are draggable. The curve drawn through them is the same cubic
// that CSS uses for cubic-bezier(x1, y1, x2, y2), so "what you see"
// really is what the browser animates.
//
// Usage:
//   <CubicBezierPicker value="cubic-bezier(0.4,0,0.2,1)" onChange={v => …} />
//
// value strings that don't parse cleanly fall back to Webflow's
// "standard" curve. onChange fires on pointer-up (not continuously)
// so applyEdit's coalescing doesn't flood the history.
// =====================================================================

import React, { useRef, useState, useCallback, useMemo } from 'react';

const PRESETS = [
  { key: 'cubic-bezier(0.25, 0.1, 0.25, 1)',  label: 'Ease' },
  { key: 'cubic-bezier(0.42, 0, 1, 1)',        label: 'Ease-in' },
  { key: 'cubic-bezier(0, 0, 0.58, 1)',        label: 'Ease-out' },
  { key: 'cubic-bezier(0.42, 0, 0.58, 1)',     label: 'Ease-in-out' },
  { key: 'cubic-bezier(0.4, 0, 0.2, 1)',       label: 'Standard' },
  { key: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)', label: 'Bounce' },
];

const SIZE = 200;     // SVG canvas edge
const PAD = 20;       // gutter so handles at 0/1 aren't clipped

function parseCubic(value) {
  if (!value) return [0.4, 0, 0.2, 1];
  const m = /^cubic-bezier\(([^)]+)\)$/.exec(String(value).trim());
  if (!m) return [0.4, 0, 0.2, 1];
  const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return [0.4, 0, 0.2, 1];
  return parts;
}

function formatCubic(x1, y1, x2, y2) {
  const r = (n) => Math.round(n * 1000) / 1000;
  return `cubic-bezier(${r(x1)}, ${r(y1)}, ${r(x2)}, ${r(y2)})`;
}

// Convert between normalized 0..1 space and SVG pixels. Y is flipped
// because CSS time (y-axis) increases DOWNWARD in the SVG, but up is
// "100% progress" in conventional bezier notation.
const toPx = (nx, ny) => ({
  x: PAD + nx * (SIZE - 2 * PAD),
  y: (SIZE - PAD) - ny * (SIZE - 2 * PAD),
});
const toN = (px, py) => ({
  nx: (px - PAD) / (SIZE - 2 * PAD),
  ny: ((SIZE - PAD) - py) / (SIZE - 2 * PAD),
});

export default function CubicBezierPicker({ value, onChange }) {
  const [x1, y1, x2, y2] = useMemo(() => parseCubic(value), [value]);
  const [draft, setDraft] = useState([x1, y1, x2, y2]);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [dragging, setDragging] = useState(null);
  const svgRef = useRef(null);

  // Sync external value changes (e.g. preset click, undo) into draft.
  // Use a ref guard so our own onChange doesn't fight itself.
  const lastPushedRef = useRef(value);
  if (lastPushedRef.current !== value) {
    lastPushedRef.current = value;
    setDraft([x1, y1, x2, y2]);
  }

  const commit = (next) => {
    const s = formatCubic(next[0], next[1], next[2], next[3]);
    lastPushedRef.current = s;
    onChange?.(s);
  };

  const onPointerDown = (which) => (e) => {
    setDragging(which);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = useCallback((e) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * SIZE;
    const py = ((e.clientY - rect.top) / rect.height) * SIZE;
    // X is clamped to [0,1]; Y is free so curves like Bounce can
    // overshoot (Webflow allows this too).
    const { nx, ny } = toN(px, py);
    const clampedX = Math.max(0, Math.min(1, nx));
    const next = [...draftRef.current];
    if (dragging === 'p1') { next[0] = clampedX; next[1] = ny; }
    else                   { next[2] = clampedX; next[3] = ny; }
    setDraft(next);
  }, [dragging]);
  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(null);
    commit(draftRef.current);
  };

  const [dx1, dy1, dx2, dy2] = draft;
  const p0 = toPx(0, 0);
  const p1 = toPx(dx1, dy1);
  const p2 = toPx(dx2, dy2);
  const p3 = toPx(1, 1);

  const border = '#3a3a3a';
  const accent = '#146ef5';
  const guide  = '#2a2a2a';

  return (
    <div style={{ padding: '6px 0' }}>
      <svg
        ref={svgRef}
        width={SIZE} height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          background: '#1a1a1a',
          border: `1px solid ${border}`,
          borderRadius: '4px',
          display: 'block',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        {/* grid guides every 25% */}
        {[0.25, 0.5, 0.75].map((t) => {
          const v = toPx(0, t);
          const h = toPx(t, 0);
          return (
            <g key={t}>
              <line x1={PAD} x2={SIZE - PAD} y1={v.y} y2={v.y} stroke={guide} strokeWidth="1" />
              <line x1={h.x} x2={h.x} y1={PAD} y2={SIZE - PAD} stroke={guide} strokeWidth="1" />
            </g>
          );
        })}
        {/* box */}
        <rect x={PAD} y={PAD} width={SIZE - 2 * PAD} height={SIZE - 2 * PAD}
          fill="none" stroke={border} strokeWidth="1" />
        {/* handle rays */}
        <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={accent} strokeWidth="1" opacity="0.4" />
        <line x1={p3.x} y1={p3.y} x2={p2.x} y2={p2.y} stroke={accent} strokeWidth="1" opacity="0.4" />
        {/* the bezier itself */}
        <path
          d={`M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`}
          fill="none" stroke={accent} strokeWidth="2"
        />
        {/* P0, P3 fixed */}
        <circle cx={p0.x} cy={p0.y} r="3" fill="#666" />
        <circle cx={p3.x} cy={p3.y} r="3" fill="#666" />
        {/* P1, P2 draggable */}
        <circle cx={p1.x} cy={p1.y} r="7" fill={accent}
          onPointerDown={onPointerDown('p1')}
          style={{ cursor: 'grab' }} />
        <circle cx={p2.x} cy={p2.y} r="7" fill={accent}
          onPointerDown={onPointerDown('p2')}
          style={{ cursor: 'grab' }} />
      </svg>

      {/* Numeric readout — also editable */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px', marginTop: '6px' }}>
        {['x1', 'y1', 'x2', 'y2'].map((name, i) => (
          <input
            key={name}
            value={String(Math.round(draft[i] * 1000) / 1000)}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isNaN(v)) return;
              const next = [...draft];
              next[i] = v;
              setDraft(next);
              commit(next);
            }}
            style={{
              width: '100%', height: '22px', textAlign: 'center',
              background: '#1a1a1a', color: '#e5e5e5',
              border: `1px solid ${border}`, borderRadius: '3px',
              fontSize: '11px', fontFamily: 'ui-monospace, monospace',
            }}
          />
        ))}
      </div>

      {/* Preset quick-set */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px',
      }}>
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => { setDraft(parseCubic(p.key)); commit(parseCubic(p.key)); }}
            style={{
              padding: '3px 7px',
              background: 'transparent', color: '#a0a0a0',
              border: `1px solid ${border}`, borderRadius: '3px',
              cursor: 'pointer', fontSize: '10.5px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = accent; e.currentTarget.style.borderColor = accent; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#a0a0a0'; e.currentTarget.style.borderColor = border; }}
          >{p.label}</button>
        ))}
      </div>
    </div>
  );
}

// Detect a cubic-bezier() value for dropdown-as-"Custom" wiring.
export function isCubicBezier(value) {
  return /^cubic-bezier\(/i.test(String(value || '').trim());
}

// Shared easing field — keyword dropdown + Custom… that reveals the
// bezier picker. Used by both the Style-panel Transition row and
// every Interactions easing row. Accepts an `options` override so
// callers that ship their own preset list (with labels) can use it.
const DEFAULT_EASINGS = [
  { value: '',            label: 'ease' },
  { value: 'linear',      label: 'linear' },
  { value: 'ease-in',     label: 'ease-in' },
  { value: 'ease-out',    label: 'ease-out' },
  { value: 'ease-in-out', label: 'ease-in-out' },
];

export function EasingField({ value, onChange, options = DEFAULT_EASINGS }) {
  const isCustom = isCubicBezier(value);
  const onSelect = (e) => {
    const v = e.target.value;
    if (v === '__custom__') {
      onChange(isCustom ? value : 'cubic-bezier(0.4, 0, 0.2, 1)');
    } else {
      onChange(v);
    }
  };
  return (
    <>
      <select
        value={isCustom ? '__custom__' : (value || '')}
        onChange={onSelect}
        style={{
          width: '100%', height: '22px',
          background: '#1a1a1a', color: '#e5e5e5',
          border: `1px solid #3a3a3a`, borderRadius: '3px',
          fontSize: '11px',
        }}
      >
        {options.map((o) => (
          <option key={o.value || o.key || o.label} value={o.value ?? o.key ?? ''}>
            {o.label}
          </option>
        ))}
        <option value="__custom__">Custom…</option>
      </select>
      {isCustom && (
        <div style={{ marginTop: '6px' }}>
          <CubicBezierPicker value={value} onChange={onChange} />
        </div>
      )}
    </>
  );
}
