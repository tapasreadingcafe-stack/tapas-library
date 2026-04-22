// =====================================================================
// AccessibilityPanel — Phase "bug sweep 6" (#51 + #58).
//
// Scans the current tree for the two most common a11y regressions
// staff introduce while iterating on the design:
//   * images without meaningful `alt` text
//   * links without an accessible name (empty text + no aria-label)
//
// Doubles as a bulk alt editor — each missing-alt row includes an
// inline input so staff can knock out the set without having to
// click each image on the canvas individually. Selecting a row also
// picks the node on the canvas so the Style panel stays in sync.
// =====================================================================

import React, { useMemo, useRef } from 'react';

const P = {
  bg:          '#2a2a2a',
  border:      '#2a2a2a',
  text:        '#e5e5e5',
  textDim:     '#a0a0a0',
  textFaint:   '#6a6a6a',
  rowHover:    '#333',
  accent:      '#146ef5',
  accentDim:   '#146ef522',
  danger:      '#ff9a9a',
  input:       '#1a1a1a',
  inputBorder: '#3a3a3a',
};

function walkIssues(node, out, path = '') {
  if (!node || typeof node !== 'object') return;
  const here = node.id ? `${path}/${node.id}` : path;

  if (node.tag === 'img') {
    const alt = node.attributes?.alt;
    if (typeof alt !== 'string' || !alt.trim()) {
      out.push({
        kind: 'missing-alt',
        nodeId: node.id,
        preview: node.attributes?.src || '',
      });
    }
  }
  if (node.tag === 'a') {
    const hasAria = (node.attributes?.['aria-label'] || '').trim();
    const kids = node.children || [];
    const flatText = flattenText(kids);
    if (!hasAria && !flatText.trim()) {
      out.push({
        kind: 'empty-link',
        nodeId: node.id,
        preview: node.attributes?.href || '',
      });
    }
  }

  for (const c of node.children || []) walkIssues(c, out, here);
}

function flattenText(children) {
  let s = '';
  for (const c of children || []) {
    if (!c) continue;
    if (typeof c.text === 'string' && !c.tag) { s += c.text; continue; }
    if (typeof c.textContent === 'string') { s += c.textContent; continue; }
    s += flattenText(c.children);
  }
  return s;
}

export default function AccessibilityPanel({ tree, onSelect, onSetAttributeOn }) {
  const issues = useMemo(() => {
    const out = [];
    walkIssues(tree, out);
    return out;
  }, [tree]);

  const missingAlt = issues.filter((i) => i.kind === 'missing-alt');
  const emptyLinks = issues.filter((i) => i.kind === 'empty-link');

  return (
    <div style={{
      width: '240px', flexShrink: 0,
      background: P.bg,
      borderRight: `1px solid ${P.border}`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        height: '32px', flexShrink: 0, padding: '0 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${P.border}`,
        color: P.textDim, fontSize: '11px', fontWeight: 600,
        letterSpacing: '0.05em', textTransform: 'uppercase',
      }}>
        <span>Accessibility</span>
        <span style={{ color: issues.length ? P.danger : '#86e08b', fontSize: '10.5px' }}>
          {issues.length === 0 ? '✓ clean' : `${issues.length} issue${issues.length === 1 ? '' : 's'}`}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        <GroupHeader>Missing alt text</GroupHeader>
        {missingAlt.length === 0 ? (
          <Empty>All images have alt text.</Empty>
        ) : missingAlt.map((issue) => (
          <AltRow
            key={issue.nodeId}
            issue={issue}
            onSelect={() => onSelect?.(issue.nodeId)}
            onSetAlt={(v) => onSetAttributeOn?.(issue.nodeId, 'alt', v)}
          />
        ))}

        <GroupHeader>Links without a label</GroupHeader>
        {emptyLinks.length === 0 ? (
          <Empty>Every link has visible text or an aria-label.</Empty>
        ) : emptyLinks.map((issue) => (
          <button
            key={issue.nodeId}
            onClick={() => onSelect?.(issue.nodeId)}
            style={{
              display: 'flex', gap: '8px', padding: '6px 8px',
              width: '100%', background: 'transparent', border: 'none',
              color: P.text, cursor: 'pointer', textAlign: 'left',
              alignItems: 'center', fontSize: '11px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = P.rowHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ color: P.danger, fontSize: '12px' }}>⚠</span>
            <span style={{
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', fontFamily: 'ui-monospace, monospace',
              color: P.textDim,
            }}>
              {issue.preview || '(empty href)'}
            </span>
          </button>
        ))}
      </div>

      <div style={{
        flexShrink: 0, padding: '8px 12px',
        borderTop: `1px solid ${P.border}`,
        color: P.textFaint, fontSize: '10.5px', lineHeight: 1.5,
      }}>
        Scans the current page only. Colour-contrast checks land in
        a follow-up pass.
      </div>
    </div>
  );
}

function GroupHeader({ children }) {
  return (
    <div style={{
      padding: '6px 4px',
      color: P.textDim, fontSize: '10px', fontWeight: 700,
      letterSpacing: '0.05em', textTransform: 'uppercase',
    }}>{children}</div>
  );
}

function Empty({ children }) {
  return (
    <div style={{ padding: '6px 4px', color: P.textFaint, fontSize: '10.5px' }}>
      {children}
    </div>
  );
}

function AltRow({ issue, onSelect, onSetAlt }) {
  const inputRef = useRef(null);
  const commit = () => {
    const v = inputRef.current?.value.trim();
    if (v) onSetAlt(v);
  };
  return (
    <div style={{
      display: 'flex', gap: '6px', alignItems: 'center',
      padding: '4px',
    }}>
      <button
        onClick={onSelect}
        title="Select this image on the canvas"
        style={{
          flexShrink: 0, width: '40px', height: '40px', padding: 0,
          background: '#1a1a1a', color: P.textFaint,
          border: `1px solid ${P.inputBorder}`, borderRadius: '3px',
          cursor: 'pointer', overflow: 'hidden',
        }}
      >
        {issue.preview ? (
          <img
            src={issue.preview}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span style={{ fontSize: '16px' }}>▤</span>
        )}
      </button>
      <input
        ref={inputRef}
        placeholder="Describe this image…"
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        style={{
          flex: 1, height: '22px',
          padding: '0 6px',
          background: P.input, color: P.text,
          border: `1px solid ${P.inputBorder}`, borderRadius: '3px',
          fontSize: '11px',
        }}
      />
    </div>
  );
}
