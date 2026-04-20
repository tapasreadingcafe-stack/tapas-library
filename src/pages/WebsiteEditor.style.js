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

// ---------------------------------------------------------------------
// Selector (spec § 3.1)
// ---------------------------------------------------------------------
const STATE_TABS = [
  { key: 'base',    label: 'None' },
  { key: 'hover',   label: 'Hover' },
  { key: 'pressed', label: 'Pressed' },
  { key: 'focused', label: 'Focused' },
];

function Selector({ node, className, classDef, onRenameClass, onCreateClass, state, onStateChange }) {
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

      {/* State tabs — only meaningful when a class exists */}
      {className && (
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
// StylePanel — top-level composition
// ---------------------------------------------------------------------
export default function StylePanel({
  node,
  className,
  classDef,
  state,
  onStateChange,
  onCreateClass,
  onRenameClass,
  onSetStyle,
}) {
  const [open, setOpen] = useState({ layout: true, spacing: true, size: true, position: true });

  if (!node) {
    return (
      <div style={{ padding: '24px 12px', color: W.textFaint, fontSize: '11px', textAlign: 'center' }}>
        Select an element on the canvas.
      </div>
    );
  }

  // The bucket of declarations we read FROM and write TO is dictated by
  // the active state tab. 'base' reads from styles.base; pseudo-states
  // layer overrides on top. We still display only the selected tab's
  // own declarations so users can edit per-state without the base
  // leaking into the form.
  const styles = classDef?.styles?.[state] || {};

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      <Selector
        node={node}
        className={className}
        classDef={classDef}
        state={state}
        onStateChange={onStateChange}
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

      <div style={{
        padding: '16px 12px', borderTop: `1px solid ${W.panelBorder}`,
        color: W.textFaint, fontSize: '10.5px', lineHeight: 1.5,
      }}>
        Typography · Backgrounds · Borders · Effects land in Phase 4.
      </div>
    </div>
  );
}
