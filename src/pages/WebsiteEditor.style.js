// =====================================================================
// StylePanel — the Phase-3 right-panel Style tab contents.
//
// Sections shipped this session (spec § 3.1, 3.3, 3.4):
//   1. Selector       — class badge, rename input, state tabs
//   2. Layout         — Display, Direction, Gap
//   3. Spacing        — 4-side margin/padding box-model diagram
//
// Sections deferred to the next Phase-3 session: Variable modes (3.2),
// Size (3.5), Position (3.6), plus Align 2D grid under Layout.
//
// All edits route through the mutations layer. Class-only rule (§ 7):
// if the selected node has no class yet, the first write auto-creates
// one via ensureNodeClass; subsequent writes target that class.
// =====================================================================

import React, { useState, useRef, useEffect } from 'react';

const W = {
  panelBg:     '#252525',
  panelBorder: '#2a2a2a',
  hoverBg:     '#333',
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

// ---------------------------------------------------------------------
// Small shared UI atoms
// ---------------------------------------------------------------------
function SectionHeader({ label, collapsed, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%', height: '32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px',
        background: 'transparent', border: 'none', cursor: 'pointer',
        borderTop: `1px solid ${W.panelBorder}`,
        color: W.textDim, fontSize: W.labelSize, fontWeight: 700,
        letterSpacing: W.labelLetter, textTransform: 'uppercase',
      }}
    >
      <span>{label}</span>
      <span style={{ color: W.textFaint, fontSize: '10px' }}>{collapsed ? '▸' : '▾'}</span>
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px' }}>
      <span style={{ width: '64px', flexShrink: 0, color: W.textDim, fontSize: '11px' }}>{label}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function SegButtons({ options, value, onChange }) {
  return (
    <div style={{
      display: 'inline-flex',
      background: W.input, border: `1px solid ${W.inputBorder}`,
      borderRadius: '3px', overflow: 'hidden',
    }}>
      {options.map((opt, i) => {
        const isActive = opt.value === value;
        return (
          <button key={opt.value ?? i}
            onClick={() => onChange(opt.value)}
            title={opt.title || opt.label}
            style={{
              minWidth: '32px', height: '24px', padding: '0 8px',
              background: isActive ? W.accent : 'transparent',
              color: isActive ? '#fff' : W.textDim,
              border: 'none',
              borderLeft: i === 0 ? 'none' : `1px solid ${W.inputBorder}`,
              cursor: 'pointer', fontSize: '11px',
            }}
          >{opt.label}</button>
        );
      })}
    </div>
  );
}

function TextInput({ value, onChange, onCommit, placeholder }) {
  return (
    <input
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.currentTarget.blur(); }
      }}
      placeholder={placeholder}
      style={{
        width: '100%', height: '24px',
        padding: '0 6px',
        background: W.input, color: W.text,
        border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
        fontSize: '11px', fontFamily: 'ui-monospace, monospace',
        outline: 'none',
      }}
    />
  );
}

// Unit-aware numeric input. Keeps string form so users can type "auto",
// "10%", "calc(...)", etc. Arrow Up / Down / Shift+Arrow adjust when
// the value parses to a number with a known unit.
function DimensionInput({ value, onChange, placeholder }) {
  const onKeyDown = (e) => {
    const step = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const sign = e.key === 'ArrowUp' ? 1 : -1;
      const m = /^(-?\d*\.?\d+)(\D*)$/.exec(value || '');
      if (!m) return;
      const next = Number(m[1]) + sign * step;
      const unit = m[2] || 'px';
      onChange(`${Math.round(next * 1000) / 1000}${unit}`);
      e.preventDefault();
    }
  };
  return (
    <input
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder || '0'}
      style={{
        width: '100%', height: '22px',
        padding: '0 5px',
        background: W.input, color: W.text,
        border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
        fontSize: '11px', fontFamily: 'ui-monospace, monospace',
        textAlign: 'center', outline: 'none',
      }}
    />
  );
}

// Color picker — native swatch + hex text input. Accepts any CSS color
// string on read, round-trips hex to the swatch and leaves other forms
// (rgba, hsl, var(…), named) untouched in the text input.
function ColorInput({ value, onChange }) {
  // The native swatch only understands #rrggbb. If the current value
  // isn't that form, fall back to #000000 for the swatch but preserve
  // the real value in the text input.
  const hex = /^#[0-9a-fA-F]{6}$/.test((value || '').trim()) ? value.trim() : '#000000';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '22px', height: '22px', padding: 0,
          background: W.input, border: `1px solid ${W.inputBorder}`,
          borderRadius: '3px', cursor: 'pointer',
        }}
      />
      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        style={{
          flex: 1, height: '22px',
          padding: '0 5px',
          background: W.input, color: W.text,
          border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
          fontSize: '11px', fontFamily: 'ui-monospace, monospace',
          outline: 'none',
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------
// Selector (spec § 3.1)
// ---------------------------------------------------------------------
const STATE_TABS = [
  { key: 'base',    label: 'None' },
  { key: 'hover',   label: 'Hover' },
  { key: 'pressed', label: 'Pressed' },
  { key: 'focused', label: 'Focused' },
];

function Selector({ node, className, classDef, onRenameClass, onCreateClass, state, onStateChange, isBaseBreakpoint = true }) {
  const [draft, setDraft] = useState(className || '');
  useEffect(() => { setDraft(className || ''); }, [className]);

  const commitRename = () => {
    const next = draft.trim();
    if (!next || next === className) { setDraft(className || ''); return; }
    if (!/^[a-zA-Z][\w-]*$/.test(next)) { setDraft(className || ''); return; }
    onRenameClass(next);
  };

  return (
    <div style={{ padding: '10px 12px', borderBottom: `1px solid ${W.panelBorder}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ color: W.textDim, fontSize: W.labelSize, fontWeight: 700, letterSpacing: W.labelLetter, textTransform: 'uppercase' }}>
          Style selector
        </span>
        <span style={{ color: W.textFaint, fontSize: '10px' }}>
          {classDef ? '1 selector' : 'No class'}
        </span>
      </div>
      {className ? (
        <TextInput
          value={draft}
          onChange={setDraft}
          onCommit={commitRename}
          placeholder="class-name"
        />
      ) : (
        <button
          onClick={onCreateClass}
          disabled={!node}
          style={{
            width: '100%', height: '26px',
            background: W.input, color: W.textDim,
            border: `1px dashed ${W.inputBorder}`, borderRadius: '3px',
            cursor: node ? 'pointer' : 'not-allowed',
            fontSize: '11px',
          }}
          onMouseEnter={(e) => { if (node) e.currentTarget.style.borderColor = W.accent; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = W.inputBorder; }}
        >+ Give this element a class</button>
      )}

      {/* State tabs — only on desktop base breakpoint. The v2 schema
          doesn't carry per-state styles inside a media query, so Hover
          / Pressed / Focused are hidden when editing a breakpoint. */}
      {className && isBaseBreakpoint && (
        <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
          {STATE_TABS.map((t) => {
            const isActive = t.key === state;
            const hasOverrides = !!classDef?.styles?.[t.key] && Object.keys(classDef.styles[t.key]).length > 0;
            return (
              <button key={t.key}
                onClick={() => onStateChange(t.key)}
                style={{
                  height: '22px', padding: '0 8px',
                  background: isActive ? W.accentDim : 'transparent',
                  color: isActive ? W.accent : W.textDim,
                  border: `1px solid ${isActive ? W.accent : W.inputBorder}`,
                  borderRadius: '3px', cursor: 'pointer',
                  fontSize: '10.5px', position: 'relative',
                }}
              >
                {t.label}
                {hasOverrides && t.key !== 'base' && (
                  <span style={{
                    position: 'absolute', top: '-3px', right: '-3px',
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: '#f5a623',
                  }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Layout (spec § 3.3, minus Align 2D grid — deferred)
// ---------------------------------------------------------------------
function Layout({ styles, onSet }) {
  const display = styles.display || '';
  const isFlex = display === 'flex';
  const isGrid = display === 'grid';
  return (
    <>
      <Field label="Display">
        <SegButtons
          value={display || 'block'}
          onChange={(v) => onSet('display', v === 'block' ? '' : v)}
          options={[
            { label: 'Block', value: 'block' },
            { label: 'Flex',  value: 'flex' },
            { label: 'Grid',  value: 'grid' },
            { label: 'None',  value: 'none' },
          ]}
        />
      </Field>
      {(isFlex || isGrid) && (
        <Field label="Direction">
          <SegButtons
            value={styles['flex-direction'] || 'row'}
            onChange={(v) => onSet('flex-direction', v === 'row' ? '' : v)}
            options={[
              { label: '→', value: 'row',            title: 'Row' },
              { label: '↓', value: 'column',         title: 'Column' },
              { label: '⇄', value: 'row-reverse',    title: 'Row reverse' },
              { label: '⇅', value: 'column-reverse', title: 'Column reverse' },
            ]}
          />
        </Field>
      )}
      {(isFlex || isGrid) && (
        <Field label="Align">
          <AlignGrid
            justify={styles['justify-content'] || 'flex-start'}
            align={styles['align-items'] || 'stretch'}
            direction={styles['flex-direction'] || 'row'}
            onChange={(justify, align) => {
              onSet('justify-content', justify === 'flex-start' ? '' : justify);
              onSet('align-items',    align   === 'stretch'     ? '' : align);
            }}
          />
        </Field>
      )}
      {(isFlex || isGrid) && (
        <Field label="Gap">
          <DimensionInput
            value={styles.gap || ''}
            onChange={(v) => onSet('gap', v)}
          />
        </Field>
      )}
    </>
  );
}

// 3×3 picker — clicking a cell writes justify-content (X) + align-items
// (Y) at once. Column direction flips which axis is main vs. cross,
// which is exactly what Webflow's picker does behind the scenes, but we
// keep the semantic CSS properties the same — the visual orientation
// just gets rotated when direction is column.
const ALIGN_JUSTIFY = ['flex-start', 'center', 'flex-end'];
const ALIGN_ALIGN   = ['flex-start', 'center', 'flex-end'];

function AlignGrid({ justify, align, direction, onChange }) {
  const isColumn = direction === 'column' || direction === 'column-reverse';
  // Map justify/align to a (col, row) index in the grid. For row layout
  // justify is main-axis (horizontal) → x; align is cross-axis → y.
  // For column layout axes flip, so we swap.
  const xAxis = isColumn ? align   : justify;
  const yAxis = isColumn ? justify : align;
  const xi = ALIGN_JUSTIFY.indexOf(xAxis === 'stretch' ? 'flex-start' : xAxis);
  const yi = ALIGN_ALIGN.indexOf(yAxis === 'stretch' ? 'flex-start' : yAxis);

  const set = (col, row) => {
    const x = ALIGN_JUSTIFY[col];
    const y = ALIGN_ALIGN[row];
    if (isColumn) onChange(y, x); else onChange(x, y);
  };

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3, 20px)', gridTemplateRows: 'repeat(3, 20px)',
      gap: '2px', padding: '2px',
      background: W.input, border: `1px solid ${W.inputBorder}`,
      borderRadius: '3px', width: 'fit-content',
    }}>
      {Array.from({ length: 9 }).map((_, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const isActive = col === xi && row === yi;
        return (
          <button key={i}
            onClick={() => set(col, row)}
            title={`${ALIGN_JUSTIFY[col]} / ${ALIGN_ALIGN[row]}`}
            style={{
              width: '20px', height: '20px', padding: 0,
              background: isActive ? W.accent : 'transparent',
              border: 'none', borderRadius: '2px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = W.hoverBg; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          >
            {/* dot marker */}
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: isActive ? '#fff' : W.textFaint,
            }} />
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------
// Size (spec § 3.5)
// ---------------------------------------------------------------------
function Size({ styles, onSet }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <Field label="Width">
        <DimensionInput value={styles.width || ''} onChange={(v) => onSet('width', v)} placeholder="auto" />
      </Field>
      <Field label="Height">
        <DimensionInput value={styles.height || ''} onChange={(v) => onSet('height', v)} placeholder="auto" />
      </Field>
      <Field label="Min W">
        <DimensionInput value={styles['min-width'] || ''} onChange={(v) => onSet('min-width', v)} placeholder="0" />
      </Field>
      <Field label="Min H">
        <DimensionInput value={styles['min-height'] || ''} onChange={(v) => onSet('min-height', v)} placeholder="0" />
      </Field>
      <Field label="Max W">
        <DimensionInput value={styles['max-width'] || ''} onChange={(v) => onSet('max-width', v)} placeholder="none" />
      </Field>
      <Field label="Max H">
        <DimensionInput value={styles['max-height'] || ''} onChange={(v) => onSet('max-height', v)} placeholder="none" />
      </Field>
      <Field label="Overflow">
        <SegButtons
          value={styles.overflow || 'visible'}
          onChange={(v) => onSet('overflow', v === 'visible' ? '' : v)}
          options={[
            { label: 'Visible', value: 'visible' },
            { label: 'Hidden',  value: 'hidden' },
            { label: 'Scroll',  value: 'scroll' },
            { label: 'Auto',    value: 'auto' },
          ]}
        />
      </Field>
      <Field label="Fit">
        <SegButtons
          value={styles['object-fit'] || 'fill'}
          onChange={(v) => onSet('object-fit', v === 'fill' ? '' : v)}
          options={[
            { label: 'Fill',    value: 'fill' },
            { label: 'Contain', value: 'contain' },
            { label: 'Cover',   value: 'cover' },
            { label: 'None',    value: 'none' },
            { label: 'Scale',   value: 'scale-down' },
          ]}
        />
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------------
// Position (spec § 3.6)
// ---------------------------------------------------------------------
function Position({ styles, onSet }) {
  const position = styles.position || 'static';
  const showOffsets = position !== 'static';
  return (
    <div style={{ padding: '4px 0' }}>
      <Field label="Position">
        <SegButtons
          value={position}
          onChange={(v) => onSet('position', v === 'static' ? '' : v)}
          options={[
            { label: 'Static',   value: 'static' },
            { label: 'Relative', value: 'relative' },
            { label: 'Absolute', value: 'absolute' },
            { label: 'Fixed',    value: 'fixed' },
            { label: 'Sticky',   value: 'sticky' },
          ]}
        />
      </Field>
      {showOffsets && (
        <div style={{ padding: '8px 12px' }}>
          <div style={{
            position: 'relative',
            padding: '28px', borderRadius: '4px',
            background: '#2b2b2b', border: `1px dashed #555`,
          }}>
            <BoxLabel text="OFFSETS" />
            <SideCell position="top"    value={styles.top    || ''} onChange={(v) => onSet('top', v)} />
            <SideCell position="right"  value={styles.right  || ''} onChange={(v) => onSet('right', v)} />
            <SideCell position="bottom" value={styles.bottom || ''} onChange={(v) => onSet('bottom', v)} />
            <SideCell position="left"   value={styles.left   || ''} onChange={(v) => onSet('left', v)} />
            <div style={{
              height: '26px', borderRadius: '2px',
              background: W.accentDim, border: `1px solid ${W.accent}`,
              color: W.accent, fontSize: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{position}</div>
          </div>
        </div>
      )}
      <Field label="Z-index">
        <DimensionInput value={styles['z-index'] || ''} onChange={(v) => onSet('z-index', v)} placeholder="auto" />
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------------
// Spacing (spec § 3.4) — box-model diagram
// ---------------------------------------------------------------------
const SIDES = ['top', 'right', 'bottom', 'left'];

function Spacing({ styles, onSet }) {
  const get = (k) => styles[k] || '';
  const setSide = (prefix, side, val) => onSet(`${prefix}-${side}`, val);

  return (
    <div style={{ padding: '8px 12px' }}>
      {/* MARGIN box */}
      <div style={{
        position: 'relative',
        padding: '28px', borderRadius: '4px',
        background: '#2b2b2b', border: `1px dashed #555`,
      }}>
        <BoxLabel text="MARGIN" />
        <SideCell position="top"    value={get('margin-top')}    onChange={(v) => setSide('margin', 'top', v)} />
        <SideCell position="right"  value={get('margin-right')}  onChange={(v) => setSide('margin', 'right', v)} />
        <SideCell position="bottom" value={get('margin-bottom')} onChange={(v) => setSide('margin', 'bottom', v)} />
        <SideCell position="left"   value={get('margin-left')}   onChange={(v) => setSide('margin', 'left', v)} />

        {/* PADDING box nested */}
        <div style={{
          position: 'relative',
          padding: '28px', borderRadius: '3px',
          background: '#1e1e1e', border: `1px dashed #555`,
        }}>
          <BoxLabel text="PADDING" />
          <SideCell position="top"    value={get('padding-top')}    onChange={(v) => setSide('padding', 'top', v)} />
          <SideCell position="right"  value={get('padding-right')}  onChange={(v) => setSide('padding', 'right', v)} />
          <SideCell position="bottom" value={get('padding-bottom')} onChange={(v) => setSide('padding', 'bottom', v)} />
          <SideCell position="left"   value={get('padding-left')}   onChange={(v) => setSide('padding', 'left', v)} />
          {/* Content placeholder */}
          <div style={{
            height: '26px', borderRadius: '2px',
            background: W.accentDim, border: `1px solid ${W.accent}`,
            color: W.accent, fontSize: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>content</div>
        </div>
      </div>
    </div>
  );
}

// Small top-left caption that sits inside the dashed box chrome. Uses
// negative top + tiny padding so the text visually sits on the border,
// matching the DevTools / Webflow box-model rendering.
function BoxLabel({ text }) {
  return (
    <span style={{
      position: 'absolute', top: '4px', left: '8px',
      fontSize: '9px', fontWeight: 700,
      letterSpacing: '0.06em',
      color: W.textFaint,
      pointerEvents: 'none',
    }}>{text}</span>
  );
}

// Side cell: an absolutely-placed small numeric input on one of the 4
// sides of the parent rect. Parent provides `padding: 28px` to make room.
function SideCell({ position, value, onChange }) {
  const base = {
    position: 'absolute',
    width: '42px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
  let box;
  if (position === 'top')    box = { ...base, top: 4,   left: '50%', transform: 'translateX(-50%)' };
  if (position === 'bottom') box = { ...base, bottom: 4, left: '50%', transform: 'translateX(-50%)' };
  if (position === 'left')   box = { ...base, top: '50%', left: 4,    transform: 'translateY(-50%)' };
  if (position === 'right')  box = { ...base, top: '50%', right: 4,   transform: 'translateY(-50%)' };
  return (
    <div style={box}>
      <DimensionInput value={value} onChange={onChange} placeholder="0" />
    </div>
  );
}

// ---------------------------------------------------------------------
// Typography (spec § 3.7)
// ---------------------------------------------------------------------
// Common font stacks. Users can type anything here — the Select just
// offers one-click defaults, the text input is the source of truth.
const FONT_FAMILIES = [
  'Inter, sans-serif',
  'system-ui, sans-serif',
  'Georgia, serif',
  'ui-monospace, monospace',
  'Helvetica, Arial, sans-serif',
  'Playfair Display, serif',
];

function Typography({ styles, onSet }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <Field label="Font">
        <select
          value={styles['font-family'] || ''}
          onChange={(e) => onSet('font-family', e.target.value)}
          style={{
            width: '100%', height: '24px',
            padding: '0 4px',
            background: W.input, color: W.text,
            border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
            fontSize: '11px',
          }}
        >
          <option value="">Inherit</option>
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f}>{f.split(',')[0]}</option>
          ))}
        </select>
      </Field>
      <Field label="Weight">
        <SegButtons
          value={String(styles['font-weight'] || '400')}
          onChange={(v) => onSet('font-weight', v === '400' ? '' : v)}
          options={[
            { label: '300', value: '300' },
            { label: '400', value: '400' },
            { label: '500', value: '500' },
            { label: '600', value: '600' },
            { label: '700', value: '700' },
            { label: '800', value: '800' },
          ]}
        />
      </Field>
      <Field label="Size">
        <DimensionInput value={styles['font-size'] || ''} onChange={(v) => onSet('font-size', v)} placeholder="16px" />
      </Field>
      <Field label="Line">
        <DimensionInput value={styles['line-height'] || ''} onChange={(v) => onSet('line-height', v)} placeholder="1.5" />
      </Field>
      <Field label="Letter">
        <DimensionInput value={styles['letter-spacing'] || ''} onChange={(v) => onSet('letter-spacing', v)} placeholder="0" />
      </Field>
      <Field label="Color">
        <ColorInput value={styles.color || ''} onChange={(v) => onSet('color', v)} />
      </Field>
      <Field label="Align">
        <SegButtons
          value={styles['text-align'] || 'left'}
          onChange={(v) => onSet('text-align', v === 'left' ? '' : v)}
          options={[
            { label: '⇤', value: 'left',    title: 'Left' },
            { label: '↔', value: 'center',  title: 'Center' },
            { label: '⇥', value: 'right',   title: 'Right' },
            { label: '≡', value: 'justify', title: 'Justify' },
          ]}
        />
      </Field>
      <Field label="Style">
        <SegButtons
          value={styles['font-style'] || 'normal'}
          onChange={(v) => onSet('font-style', v === 'normal' ? '' : v)}
          options={[
            { label: 'N', value: 'normal', title: 'Normal' },
            { label: 'I', value: 'italic', title: 'Italic' },
          ]}
        />
      </Field>
      <Field label="Decor">
        <SegButtons
          value={styles['text-decoration'] || 'none'}
          onChange={(v) => onSet('text-decoration', v === 'none' ? '' : v)}
          options={[
            { label: '–',  value: 'none',         title: 'None' },
            { label: 'U',  value: 'underline',    title: 'Underline' },
            { label: 'S',  value: 'line-through', title: 'Strike' },
            { label: 'O',  value: 'overline',     title: 'Overline' },
          ]}
        />
      </Field>
      <Field label="Case">
        <SegButtons
          value={styles['text-transform'] || 'none'}
          onChange={(v) => onSet('text-transform', v === 'none' ? '' : v)}
          options={[
            { label: '—',   value: 'none',       title: 'As-is' },
            { label: 'AA',  value: 'uppercase',  title: 'UPPER' },
            { label: 'aa',  value: 'lowercase',  title: 'lower' },
            { label: 'Aa',  value: 'capitalize', title: 'Capitalize' },
          ]}
        />
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------------
// Backgrounds (spec § 3.8 + Lane D2 gradient editor + D3 multi-layer)
// ---------------------------------------------------------------------
// background-image is stored as a single comma-separated string. Each
// top-level comma-separated chunk is one layer: either a url(…) image
// or a linear-gradient(…). Radial / conic gradients pass through as
// opaque strings (editor shows them but doesn't parse into fields).
//
// Color stays separate on background-color and stacks beneath every
// image layer as the ultimate fallback — matching the CSS spec.

function parseBackgroundLayers(s) {
  return splitTopLevelCommas(s).map(parseBackgroundLayer).filter(Boolean);
}
function parseBackgroundLayer(raw) {
  const s = raw.trim();
  if (!s) return null;
  const urlMatch = /^url\((['"]?)(.*)\1\)$/.exec(s);
  if (urlMatch) return { type: 'image', url: urlMatch[2] };
  if (/^linear-gradient\(/i.test(s)) {
    const inner = s.replace(/^linear-gradient\(/i, '').replace(/\)$/, '');
    // First part is (optionally) the angle if it ends with deg/turn/etc.
    const parts = splitTopLevelCommas(inner);
    let angle = '135deg';
    let stops = parts;
    if (parts.length && /^(-?\d*\.?\d+)(deg|turn|rad|grad)$/i.test(parts[0].trim())) {
      angle = parts[0].trim();
      stops = parts.slice(1);
    } else if (parts.length && /^to\s/i.test(parts[0].trim())) {
      angle = parts[0].trim();
      stops = parts.slice(1);
    }
    const parsedStops = stops.map((p) => {
      const m = /^(.+?)\s+(-?\d*\.?\d+(?:%|px))$/.exec(p.trim());
      if (m) return { color: m[1].trim(), pos: m[2].trim() };
      return { color: p.trim(), pos: '' };
    });
    return { type: 'gradient', angle, stops: parsedStops };
  }
  // Radial / conic / other — pass through unparsed. UI will show a
  // read-only card with the raw string + a remove button.
  return { type: 'raw', raw: s };
}
function composeBackgroundLayer(layer) {
  if (!layer) return '';
  if (layer.type === 'image') {
    if (!layer.url) return '';
    return `url("${layer.url}")`;
  }
  if (layer.type === 'gradient') {
    const stops = (layer.stops || []).map((s) => {
      if (!s.color) return '';
      return s.pos ? `${s.color} ${s.pos}` : s.color;
    }).filter(Boolean);
    if (stops.length < 2) return '';
    return `linear-gradient(${layer.angle || '135deg'}, ${stops.join(', ')})`;
  }
  if (layer.type === 'raw') return layer.raw || '';
  return '';
}
function composeBackgroundLayers(layers) {
  return layers.map(composeBackgroundLayer).filter(Boolean).join(', ');
}

function GradientLayerCard({ layer, onChange, onRemove }) {
  const set = (patch) => onChange({ ...layer, ...patch });
  const setStop = (i, patch) => {
    const next = [...(layer.stops || [])];
    next[i] = { ...next[i], ...patch };
    onChange({ ...layer, stops: next });
  };
  const addStop = () => {
    const next = [...(layer.stops || [])];
    next.push({ color: '#ffffff', pos: '50%' });
    onChange({ ...layer, stops: next });
  };
  const removeStop = (i) => {
    if ((layer.stops || []).length <= 2) return; // need ≥ 2
    const next = (layer.stops || []).filter((_, j) => j !== i);
    onChange({ ...layer, stops: next });
  };
  return (
    <div style={{
      padding: '6px 8px', marginBottom: '6px',
      background: '#1e1e1e', border: `1px solid ${W.inputBorder}`,
      borderRadius: '3px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: W.accent, fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Gradient</span>
        <button onClick={onRemove} title="Remove layer" style={removeBtnStyle}>×</button>
      </div>
      {/* Live gradient preview bar */}
      <div style={{
        height: '18px', borderRadius: '2px', marginBottom: '6px',
        background: composeBackgroundLayer(layer) || 'transparent',
        border: `1px solid ${W.inputBorder}`,
      }} />
      <Field label="Angle">
        <DimensionInput value={layer.angle} onChange={(v) => set({ angle: v })} placeholder="135deg" />
      </Field>
      {(layer.stops || []).map((stop, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 50px 22px', gap: '4px', padding: '2px 12px', alignItems: 'center' }}>
          <ColorInput value={stop.color} onChange={(v) => setStop(i, { color: v })} />
          <DimensionInput value={stop.pos} onChange={(v) => setStop(i, { pos: v })} placeholder="0%" />
          <button
            onClick={() => removeStop(i)}
            disabled={(layer.stops || []).length <= 2}
            title="Remove stop"
            style={{ ...removeBtnStyle, opacity: (layer.stops || []).length <= 2 ? 0.3 : 1 }}
          >×</button>
        </div>
      ))}
      <button
        onClick={addStop}
        style={{
          width: '100%', height: '22px', marginTop: '4px',
          background: 'transparent', color: W.textDim,
          border: `1px dashed ${W.inputBorder}`, borderRadius: '3px',
          cursor: 'pointer', fontSize: '10.5px',
        }}
      >+ Stop</button>
    </div>
  );
}

function ImageLayerCard({ layer, onChange, onRemove }) {
  return (
    <div style={{
      padding: '6px 8px', marginBottom: '6px',
      background: '#1e1e1e', border: `1px solid ${W.inputBorder}`,
      borderRadius: '3px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: W.accent, fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Image</span>
        <button onClick={onRemove} title="Remove layer" style={removeBtnStyle}>×</button>
      </div>
      <TextInput
        value={layer.url || ''}
        onChange={(v) => onChange({ ...layer, url: v })}
        onCommit={() => {}}
        placeholder="https://…/image.jpg"
      />
    </div>
  );
}

function RawLayerCard({ layer, onRemove }) {
  return (
    <div style={{
      padding: '6px 8px', marginBottom: '6px',
      background: '#1e1e1e', border: `1px solid ${W.inputBorder}`,
      borderRadius: '3px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: W.textDim, fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Raw</span>
        <button onClick={onRemove} title="Remove layer" style={removeBtnStyle}>×</button>
      </div>
      <code style={{
        display: 'block', fontSize: '10px', color: W.textFaint,
        fontFamily: 'ui-monospace, monospace',
        wordBreak: 'break-all',
      }}>{layer.raw}</code>
    </div>
  );
}

const removeBtnStyle = {
  width: '18px', height: '18px', padding: 0,
  background: 'transparent', color: '#a0a0a0',
  border: `1px solid #3a3a3a`, borderRadius: '3px',
  cursor: 'pointer', fontSize: '11px',
};

function Backgrounds({ styles, onSet }) {
  const bgImageRaw = styles['background-image'] || '';
  const layers = parseBackgroundLayers(bgImageRaw);

  const commit = (nextLayers) => onSet('background-image', composeBackgroundLayers(nextLayers));
  const updateLayer = (i, nl) => {
    const next = [...layers];
    next[i] = nl;
    commit(next);
  };
  const removeLayer = (i) => commit(layers.filter((_, j) => j !== i));
  const addGradient = () => commit([...layers, {
    type: 'gradient',
    angle: '135deg',
    stops: [
      { color: '#cff389', pos: '0%' },
      { color: '#ef3d7b', pos: '100%' },
    ],
  }]);
  const addImage = () => commit([...layers, { type: 'image', url: '' }]);

  return (
    <div style={{ padding: '4px 0' }}>
      <Field label="Color">
        <ColorInput
          value={styles['background-color'] || ''}
          onChange={(v) => onSet('background-color', v)}
        />
      </Field>
      <Field label="Size">
        <SegButtons
          value={styles['background-size'] || 'auto'}
          onChange={(v) => onSet('background-size', v === 'auto' ? '' : v)}
          options={[
            { label: 'Auto',    value: 'auto' },
            { label: 'Cover',   value: 'cover' },
            { label: 'Contain', value: 'contain' },
          ]}
        />
      </Field>
      <Field label="Position">
        <SegButtons
          value={styles['background-position'] || 'center'}
          onChange={(v) => onSet('background-position', v === 'center' ? '' : v)}
          options={[
            { label: 'Left',   value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right',  value: 'right' },
          ]}
        />
      </Field>
      <Field label="Repeat">
        <SegButtons
          value={styles['background-repeat'] || 'repeat'}
          onChange={(v) => onSet('background-repeat', v === 'repeat' ? '' : v)}
          options={[
            { label: 'Repeat', value: 'repeat'    },
            { label: 'None',   value: 'no-repeat' },
            { label: 'X',      value: 'repeat-x'  },
            { label: 'Y',      value: 'repeat-y'  },
          ]}
        />
      </Field>

      {/* Layer stack */}
      <div style={{
        padding: '10px 12px 4px',
        color: W.textFaint, fontSize: '10px', fontWeight: 700,
        letterSpacing: '0.05em', textTransform: 'uppercase',
      }}>Layers ({layers.length})</div>
      <div style={{ padding: '0 12px' }}>
        {layers.map((layer, i) => {
          if (layer.type === 'gradient') {
            return <GradientLayerCard
              key={i}
              layer={layer}
              onChange={(nl) => updateLayer(i, nl)}
              onRemove={() => removeLayer(i)}
            />;
          }
          if (layer.type === 'image') {
            return <ImageLayerCard
              key={i}
              layer={layer}
              onChange={(nl) => updateLayer(i, nl)}
              onRemove={() => removeLayer(i)}
            />;
          }
          return <RawLayerCard key={i} layer={layer} onRemove={() => removeLayer(i)} />;
        })}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={addGradient}
            style={{
              flex: 1, height: '24px',
              background: W.accentDim, color: W.accent,
              border: `1px dashed ${W.accent}`, borderRadius: '3px',
              cursor: 'pointer', fontSize: '11px', fontWeight: 600,
            }}
          >+ Gradient</button>
          <button
            onClick={addImage}
            style={{
              flex: 1, height: '24px',
              background: W.accentDim, color: W.accent,
              border: `1px dashed ${W.accent}`, borderRadius: '3px',
              cursor: 'pointer', fontSize: '11px', fontWeight: 600,
            }}
          >+ Image</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Borders (spec § 3.9) — per-side width, per-corner radius
// ---------------------------------------------------------------------
function Borders({ styles, onSet }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <Field label="Color">
        <ColorInput
          value={styles['border-color'] || ''}
          onChange={(v) => onSet('border-color', v)}
        />
      </Field>
      <Field label="Style">
        <SegButtons
          value={styles['border-style'] || 'none'}
          onChange={(v) => onSet('border-style', v === 'none' ? '' : v)}
          options={[
            { label: 'None',   value: 'none' },
            { label: 'Solid',  value: 'solid' },
            { label: 'Dashed', value: 'dashed' },
            { label: 'Dotted', value: 'dotted' },
          ]}
        />
      </Field>
      {/* Per-side width — 4-edge diagram */}
      <div style={{ padding: '8px 12px' }}>
        <div style={{
          position: 'relative',
          padding: '28px', borderRadius: '3px',
          background: '#1e1e1e', border: `1px dashed #555`,
        }}>
          <BoxLabel text="BORDER WIDTH" />
          <SideCell position="top"    value={styles['border-top-width']    || ''} onChange={(v) => onSet('border-top-width', v)} />
          <SideCell position="right"  value={styles['border-right-width']  || ''} onChange={(v) => onSet('border-right-width', v)} />
          <SideCell position="bottom" value={styles['border-bottom-width'] || ''} onChange={(v) => onSet('border-bottom-width', v)} />
          <SideCell position="left"   value={styles['border-left-width']   || ''} onChange={(v) => onSet('border-left-width', v)} />
          <div style={{
            height: '20px', borderRadius: '2px',
            background: '#2a2a2a',
          }} />
        </div>
      </div>
      {/* Per-corner radius — 2×2 grid */}
      <Field label="Radius">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          <DimensionInput
            value={styles['border-top-left-radius']     || ''}
            onChange={(v) => onSet('border-top-left-radius', v)}
            placeholder="TL"
          />
          <DimensionInput
            value={styles['border-top-right-radius']    || ''}
            onChange={(v) => onSet('border-top-right-radius', v)}
            placeholder="TR"
          />
          <DimensionInput
            value={styles['border-bottom-left-radius']  || ''}
            onChange={(v) => onSet('border-bottom-left-radius', v)}
            placeholder="BL"
          />
          <DimensionInput
            value={styles['border-bottom-right-radius'] || ''}
            onChange={(v) => onSet('border-bottom-right-radius', v)}
            placeholder="BR"
          />
        </div>
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------------
// Effects (spec § 3.10) — Phase 4b expansion
// Ships: multi-layer box-shadow, multi-layer text-shadow, filter,
// backdrop-filter, transform (translate/rotate/scale/skew), transition,
// mix-blend-mode, cursor. Gradients + multi-layer bg still deferred.
// ---------------------------------------------------------------------

// Split a CSS property value at TOP-LEVEL commas only. Needed because
// background-image / box-shadow / etc. use commas as layer separators
// but may also contain commas inside rgba(…) or gradient stops.
function splitTopLevelCommas(s) {
  if (!s) return [];
  const out = [];
  let depth = 0, start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) {
      out.push(s.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = s.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

// Parse ONE shadow layer — used for both box-shadow and text-shadow.
// kind: 'box' or 'text'. text-shadow has no spread or inset.
function parseShadowLayer(s, kind = 'box') {
  const empty = { x: '', y: '', blur: '', spread: '', color: '', inset: false };
  if (!s) return empty;
  const inset = kind === 'box' ? /\binset\b/.test(s) : false;
  const body = (kind === 'box' ? s.replace(/\binset\b/, '') : s).trim();
  const colorMatch = body.match(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/);
  const color = colorMatch ? colorMatch[0] : '';
  const rest = (colorMatch ? body.replace(colorMatch[0], '') : body).trim().split(/\s+/).filter(Boolean);
  if (kind === 'box') {
    return { x: rest[0] || '', y: rest[1] || '', blur: rest[2] || '', spread: rest[3] || '', color, inset };
  }
  return { x: rest[0] || '', y: rest[1] || '', blur: rest[2] || '', spread: '', color, inset: false };
}

function composeShadowLayer({ x, y, blur, spread, color, inset }, kind = 'box') {
  const parts = [];
  if (kind === 'box' && inset) parts.push('inset');
  const hasAny = x || y || blur || spread || color;
  if (!hasAny) return '';
  parts.push(x || '0', y || '0');
  if (blur || spread) parts.push(blur || '0');
  if (kind === 'box' && spread) parts.push(spread);
  if (color) parts.push(color);
  return parts.join(' ');
}

function parseShadowLayers(s, kind = 'box') {
  return splitTopLevelCommas(s).map((p) => parseShadowLayer(p, kind)).filter((l) => l.x || l.y || l.blur || l.spread || l.color);
}
function composeShadowLayers(layers, kind = 'box') {
  return layers.map((l) => composeShadowLayer(l, kind)).filter(Boolean).join(', ');
}

// Transform — supports 2D + basic 3D. Order matters: perspective must
// come first in the transform chain for its effect to be honored by
// the subsequent rotations / translations, so compose always emits
// in this order: perspective → translate → translateZ → rotate →
// rotateX/Y → scale → skew.
function parseTransform(s) {
  const out = {
    tx: '', ty: '', tz: '',
    rot: '', rx: '', ry: '',
    sx: '', sy: '',
    kx: '', ky: '',
    perspective: '',
  };
  if (!s) return out;
  const pv = /perspective\(([^)]+)\)/.exec(s);
  if (pv) out.perspective = pv[1].trim();
  const tr = /(?<!\w)translate\(([^)]+)\)/.exec(s);
  if (tr) {
    const parts = tr[1].split(',').map((p) => p.trim());
    out.tx = parts[0] || '';
    out.ty = parts[1] || '';
  }
  const tz = /translateZ\(([^)]+)\)/.exec(s);
  if (tz) out.tz = tz[1].trim();
  const ro = /(?<!\w)rotate\(([^)]+)\)/.exec(s);
  if (ro) out.rot = ro[1].trim();
  const rx = /rotateX\(([^)]+)\)/.exec(s);
  if (rx) out.rx = rx[1].trim();
  const ry = /rotateY\(([^)]+)\)/.exec(s);
  if (ry) out.ry = ry[1].trim();
  const sc = /(?<!\w)scale\(([^)]+)\)/.exec(s);
  if (sc) {
    const parts = sc[1].split(',').map((p) => p.trim());
    out.sx = parts[0] || '';
    out.sy = parts[1] || parts[0] || '';
  }
  const sk = /skew\(([^)]+)\)/.exec(s);
  if (sk) {
    const parts = sk[1].split(',').map((p) => p.trim());
    out.kx = parts[0] || '';
    out.ky = parts[1] || '';
  }
  return out;
}
function composeTransform({ tx, ty, tz, rot, rx, ry, sx, sy, kx, ky, perspective }) {
  const parts = [];
  if (perspective) parts.push(`perspective(${perspective})`);
  if (tx || ty) parts.push(`translate(${tx || '0'}, ${ty || '0'})`);
  if (tz) parts.push(`translateZ(${tz})`);
  if (rot) parts.push(`rotate(${rot})`);
  if (rx)  parts.push(`rotateX(${rx})`);
  if (ry)  parts.push(`rotateY(${ry})`);
  if (sx || sy) parts.push(`scale(${sx || '1'}${sy ? `, ${sy}` : ''})`);
  if (kx || ky) parts.push(`skew(${kx || '0'}, ${ky || '0'})`);
  return parts.join(' ');
}

// Filter chain: blur(), brightness(), contrast(), saturate(), hue-rotate().
const FILTER_KEYS = ['blur', 'brightness', 'contrast', 'saturate', 'hue-rotate'];
function parseFilters(s) {
  const out = { blur: '', brightness: '', contrast: '', saturate: '', 'hue-rotate': '' };
  if (!s) return out;
  for (const k of FILTER_KEYS) {
    const re = new RegExp(`${k}\\(([^)]+)\\)`);
    const m = re.exec(s);
    if (m) out[k] = m[1].trim();
  }
  return out;
}
function composeFilters(obj) {
  const parts = [];
  for (const k of FILTER_KEYS) {
    const v = obj[k];
    if (v && v !== '0' && v !== '0px' && v !== '100%' && v !== '1' && v !== '0deg') {
      parts.push(`${k}(${v})`);
    }
  }
  return parts.join(' ');
}

// One shadow layer card. Used by both box-shadow and text-shadow
// sections via the `kind` prop.
function ShadowLayerCard({ layer, kind, onChange, onRemove }) {
  const set = (patch) => onChange({ ...layer, ...patch });
  return (
    <div style={{
      padding: '6px 8px', marginBottom: '6px',
      background: '#1e1e1e', border: `1px solid ${W.inputBorder}`,
      borderRadius: '3px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: W.textFaint, fontSize: '10px', fontFamily: 'ui-monospace, monospace' }}>
          {composeShadowLayer(layer, kind) || '(empty)'}
        </span>
        <button
          onClick={onRemove}
          title="Remove layer"
          style={{
            width: '18px', height: '18px', padding: 0,
            background: 'transparent', color: W.textDim,
            border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
            cursor: 'pointer', fontSize: '11px',
          }}
        >×</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '4px' }}>
        <DimensionInput value={layer.x} onChange={(v) => set({ x: v })} placeholder="X" />
        <DimensionInput value={layer.y} onChange={(v) => set({ y: v })} placeholder="Y" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: kind === 'box' ? '1fr 1fr' : '1fr', gap: '4px', marginBottom: '4px' }}>
        <DimensionInput value={layer.blur} onChange={(v) => set({ blur: v })} placeholder="Blur" />
        {kind === 'box' && (
          <DimensionInput value={layer.spread} onChange={(v) => set({ spread: v })} placeholder="Spread" />
        )}
      </div>
      <div style={{ marginBottom: kind === 'box' ? '4px' : 0 }}>
        <ColorInput value={layer.color} onChange={(v) => set({ color: v })} />
      </div>
      {kind === 'box' && (
        <SegButtons
          value={layer.inset ? 'on' : 'off'}
          onChange={(v) => set({ inset: v === 'on' })}
          options={[
            { label: 'Outer', value: 'off' },
            { label: 'Inset', value: 'on' },
          ]}
        />
      )}
    </div>
  );
}

// Multi-layer shadow editor. `cssProp` is 'box-shadow' or 'text-shadow'.
function ShadowStack({ cssProp, kind, value, onSet }) {
  const layers = parseShadowLayers(value || '', kind);
  const commit = (next) => onSet(cssProp, composeShadowLayers(next, kind));
  const addLayer = () => {
    const defaultLayer = kind === 'box'
      ? { x: '0', y: '2px', blur: '4px', spread: '', color: 'rgba(0,0,0,0.12)', inset: false }
      : { x: '0', y: '1px', blur: '2px', spread: '', color: 'rgba(0,0,0,0.3)', inset: false };
    commit([...layers, defaultLayer]);
  };
  return (
    <div style={{ padding: '4px 12px' }}>
      {layers.length === 0 && (
        <div style={{ color: W.textFaint, fontSize: '11px', padding: '4px 0' }}>
          No layers.
        </div>
      )}
      {layers.map((layer, i) => (
        <ShadowLayerCard
          key={i}
          layer={layer}
          kind={kind}
          onChange={(nl) => {
            const next = [...layers];
            next[i] = nl;
            commit(next);
          }}
          onRemove={() => {
            const next = layers.filter((_, j) => j !== i);
            commit(next);
          }}
        />
      ))}
      <button
        onClick={addLayer}
        style={{
          width: '100%', height: '24px',
          background: W.accentDim, color: W.accent,
          border: `1px dashed ${W.accent}`, borderRadius: '3px',
          cursor: 'pointer', fontSize: '11px', fontWeight: 600,
        }}
      >+ Add layer</button>
    </div>
  );
}

// Filter slider row. Unit-aware DimensionInput, same ArrowUp/Down nudging.
function FilterChain({ property, value, onSet }) {
  const parsed = parseFilters(value || '');
  const commit = (patch) => {
    const next = composeFilters({ ...parsed, ...patch });
    onSet(property, next);
  };
  return (
    <>
      <Field label="Blur">
        <DimensionInput value={parsed.blur} onChange={(v) => commit({ blur: v })} placeholder="0" />
      </Field>
      <Field label="Bright">
        <DimensionInput value={parsed.brightness} onChange={(v) => commit({ brightness: v })} placeholder="100%" />
      </Field>
      <Field label="Contrast">
        <DimensionInput value={parsed.contrast} onChange={(v) => commit({ contrast: v })} placeholder="100%" />
      </Field>
      <Field label="Saturate">
        <DimensionInput value={parsed.saturate} onChange={(v) => commit({ saturate: v })} placeholder="100%" />
      </Field>
      <Field label="Hue">
        <DimensionInput value={parsed['hue-rotate']} onChange={(v) => commit({ 'hue-rotate': v })} placeholder="0deg" />
      </Field>
    </>
  );
}

// Sub-header inside Effects — visual break between shadow / transform / etc.
function SubHead({ text }) {
  return (
    <div style={{
      padding: '8px 12px 4px',
      color: W.textFaint, fontSize: '10px', fontWeight: 700,
      letterSpacing: '0.05em', textTransform: 'uppercase',
      borderTop: `1px solid ${W.panelBorder}`,
      marginTop: '4px',
    }}>{text}</div>
  );
}

const BLEND_MODES = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light',
  'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
];
const CURSOR_VALUES = [
  'auto', 'default', 'pointer', 'text', 'move', 'grab', 'grabbing',
  'not-allowed', 'wait', 'help', 'crosshair', 'zoom-in', 'zoom-out',
  'col-resize', 'row-resize', 'nesw-resize', 'nwse-resize',
];

function Effects({ styles, onSet }) {
  const xform = parseTransform(styles.transform || '');
  const setXform = (patch) => onSet('transform', composeTransform({ ...xform, ...patch }));

  return (
    <div style={{ padding: '4px 0' }}>
      <Field label="Opacity">
        <DimensionInput value={styles.opacity || ''} onChange={(v) => onSet('opacity', v)} placeholder="1" />
      </Field>

      <SubHead text="Box shadow" />
      <ShadowStack
        cssProp="box-shadow"
        kind="box"
        value={styles['box-shadow'] || ''}
        onSet={onSet}
      />

      <SubHead text="Text shadow" />
      <ShadowStack
        cssProp="text-shadow"
        kind="text"
        value={styles['text-shadow'] || ''}
        onSet={onSet}
      />

      <SubHead text="Filter" />
      <FilterChain
        property="filter"
        value={styles.filter || ''}
        onSet={onSet}
      />

      <SubHead text="Backdrop filter" />
      <FilterChain
        property="backdrop-filter"
        value={styles['backdrop-filter'] || ''}
        onSet={onSet}
      />

      <SubHead text="Transform" />
      <Field label="Translate">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          <DimensionInput value={xform.tx} onChange={(v) => setXform({ tx: v })} placeholder="X" />
          <DimensionInput value={xform.ty} onChange={(v) => setXform({ ty: v })} placeholder="Y" />
        </div>
      </Field>
      <Field label="Rotate">
        <DimensionInput value={xform.rot} onChange={(v) => setXform({ rot: v })} placeholder="0deg" />
      </Field>
      <Field label="Scale">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          <DimensionInput value={xform.sx} onChange={(v) => setXform({ sx: v })} placeholder="X" />
          <DimensionInput value={xform.sy} onChange={(v) => setXform({ sy: v })} placeholder="Y" />
        </div>
      </Field>
      <Field label="Skew">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          <DimensionInput value={xform.kx} onChange={(v) => setXform({ kx: v })} placeholder="X" />
          <DimensionInput value={xform.ky} onChange={(v) => setXform({ ky: v })} placeholder="Y" />
        </div>
      </Field>
      <Field label="3D">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          <DimensionInput value={xform.tz} onChange={(v) => setXform({ tz: v })} placeholder="Z" />
          <DimensionInput value={xform.perspective} onChange={(v) => setXform({ perspective: v })} placeholder="persp." />
        </div>
      </Field>
      <Field label="Rot X/Y">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          <DimensionInput value={xform.rx} onChange={(v) => setXform({ rx: v })} placeholder="X deg" />
          <DimensionInput value={xform.ry} onChange={(v) => setXform({ ry: v })} placeholder="Y deg" />
        </div>
      </Field>

      <SubHead text="Transition" />
      <Field label="Property">
        <TextInput
          value={styles['transition-property'] || ''}
          onChange={(v) => onSet('transition-property', v)}
          onCommit={() => {}}
          placeholder="all"
        />
      </Field>
      <Field label="Duration">
        <DimensionInput
          value={styles['transition-duration'] || ''}
          onChange={(v) => onSet('transition-duration', v)}
          placeholder="0.2s"
        />
      </Field>
      <Field label="Easing">
        <select
          value={styles['transition-timing-function'] || ''}
          onChange={(e) => onSet('transition-timing-function', e.target.value)}
          style={{
            width: '100%', height: '22px',
            background: W.input, color: W.text,
            border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
            fontSize: '11px',
          }}
        >
          <option value="">ease</option>
          <option value="linear">linear</option>
          <option value="ease-in">ease-in</option>
          <option value="ease-out">ease-out</option>
          <option value="ease-in-out">ease-in-out</option>
          <option value="cubic-bezier(0.4, 0, 0.2, 1)">standard</option>
        </select>
      </Field>

      <SubHead text="Misc" />
      <Field label="Blend">
        <select
          value={styles['mix-blend-mode'] || ''}
          onChange={(e) => onSet('mix-blend-mode', e.target.value)}
          style={{
            width: '100%', height: '22px',
            background: W.input, color: W.text,
            border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
            fontSize: '11px',
          }}
        >
          <option value="">normal</option>
          {BLEND_MODES.filter((m) => m !== 'normal').map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </Field>
      <Field label="Cursor">
        <select
          value={styles.cursor || ''}
          onChange={(e) => onSet('cursor', e.target.value)}
          style={{
            width: '100%', height: '22px',
            background: W.input, color: W.text,
            border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
            fontSize: '11px',
          }}
        >
          <option value="">inherit</option>
          {CURSOR_VALUES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------------
// StylePanel — top-level composition
// ---------------------------------------------------------------------
export default function StylePanel({
  node,
  className,
  classDef,
  state,
  onStateChange,
  device,
  onCreateClass,
  onRenameClass,
  onSetStyle,
}) {
  const [open, setOpen] = useState({
    layout: true, spacing: true, size: true, position: true,
    typography: true, backgrounds: true, borders: true, effects: true,
  });

  if (!node) {
    return (
      <div style={{ padding: '24px 12px', color: W.textFaint, fontSize: '11px', textAlign: 'center' }}>
        Select an element on the canvas.
      </div>
    );
  }

  // The bucket we read FROM / write TO depends on two axes:
  //   - device (desktop / tablet / mobileL / mobileP)
  //   - state  (base / hover / pressed / focused)
  //
  // At desktop + state → classDef.styles.<state> (full per-state bucket)
  // At non-desktop     → classDef.breakpoints.<device> (flat StyleBlock)
  //
  // State tabs are meaningless on non-desktop in this schema, so the
  // Selector force-hides them. Breakpoint banner tells the user which
  // bucket edits land in.
  const isBaseBreakpoint = !device || device === 'desktop';
  const styles = isBaseBreakpoint
    ? (classDef?.styles?.[state] || {})
    : (classDef?.breakpoints?.[device] || {});

  // Human-readable label + CSS max-width for the banner. Kept in sync
  // with BREAKPOINT_MEDIA over in WebsiteEditor.css.js.
  const BP_META = {
    tablet:  { label: 'Tablet',        max: '991px' },
    mobileL: { label: 'Mobile L',      max: '767px' },
    mobileP: { label: 'Mobile P',      max: '479px' },
  };
  const bp = BP_META[device];

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {bp && (
        <div style={{
          padding: '8px 12px',
          background: '#1d2a3a', color: '#9ccfff',
          borderBottom: `1px solid ${W.panelBorder}`,
          fontSize: '10.5px', lineHeight: 1.4,
        }}>
          <div style={{ fontWeight: 700, letterSpacing: '0.03em' }}>
            Editing at {bp.label} (≤ {bp.max})
          </div>
          <div style={{ color: '#7ea9c7' }}>
            Changes here override the Desktop base inside @media only.
          </div>
        </div>
      )}
      <Selector
        node={node}
        className={className}
        classDef={classDef}
        state={state}
        onStateChange={onStateChange}
        isBaseBreakpoint={isBaseBreakpoint}
        onCreateClass={onCreateClass}
        onRenameClass={onRenameClass}
      />

      <SectionHeader
        label="Layout"
        collapsed={!open.layout}
        onToggle={() => setOpen({ ...open, layout: !open.layout })}
      />
      {open.layout && (
        <div style={{ paddingBottom: '8px' }}>
          <Layout styles={styles} onSet={onSetStyle} />
        </div>
      )}

      <SectionHeader
        label="Spacing"
        collapsed={!open.spacing}
        onToggle={() => setOpen({ ...open, spacing: !open.spacing })}
      />
      {open.spacing && <Spacing styles={styles} onSet={onSetStyle} />}

      <SectionHeader
        label="Size"
        collapsed={!open.size}
        onToggle={() => setOpen({ ...open, size: !open.size })}
      />
      {open.size && <Size styles={styles} onSet={onSetStyle} />}

      <SectionHeader
        label="Position"
        collapsed={!open.position}
        onToggle={() => setOpen({ ...open, position: !open.position })}
      />
      {open.position && <Position styles={styles} onSet={onSetStyle} />}

      <SectionHeader
        label="Typography"
        collapsed={!open.typography}
        onToggle={() => setOpen({ ...open, typography: !open.typography })}
      />
      {open.typography && <Typography styles={styles} onSet={onSetStyle} />}

      <SectionHeader
        label="Backgrounds"
        collapsed={!open.backgrounds}
        onToggle={() => setOpen({ ...open, backgrounds: !open.backgrounds })}
      />
      {open.backgrounds && <Backgrounds styles={styles} onSet={onSetStyle} />}

      <SectionHeader
        label="Borders"
        collapsed={!open.borders}
        onToggle={() => setOpen({ ...open, borders: !open.borders })}
      />
      {open.borders && <Borders styles={styles} onSet={onSetStyle} />}

      <SectionHeader
        label="Effects"
        collapsed={!open.effects}
        onToggle={() => setOpen({ ...open, effects: !open.effects })}
      />
      {open.effects && <Effects styles={styles} onSet={onSetStyle} />}

      <div style={{
        padding: '16px 12px', borderTop: `1px solid ${W.panelBorder}`,
        color: W.textFaint, fontSize: '10.5px', lineHeight: 1.5,
      }}>
        Multi-layer backgrounds, gradients, multi-layer shadows,
        filters, 3D transforms, and text shadow land in Phase 4b.
      </div>
    </div>
  );
}
