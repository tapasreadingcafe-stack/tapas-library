// =====================================================================
// AddPanel — Phase 7 (spec § 6).
//
// Left-rail "Add" panel. Replaces the Navigator when the rail's Add
// icon is active. Search bar at the top, collapsible groups of
// draggable tiles below. Clicking a tile inserts the block at the
// end of the current page's root; dragging it is click-equivalent
// for now (drag-to-precise-position lands in Phase 7b).
//
// Props:
//   - onInsert(blockKey): caller decides parent + index; currently
//     always appends to page root.
//
// Kept parallel in look to Navigator so the rail swap feels natural.
// =====================================================================

import React, { useMemo, useState } from 'react';
import { BLOCK_CATALOGUE, BLOCK_GROUPS } from './WebsiteEditor.library';

const W = {
  navBg:       '#2a2a2a',
  topbarBorder:'#2a2a2a',
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

export default function AddPanel({ onInsert }) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState({});

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filter = (b) => !q || b.label.toLowerCase().includes(q) || (b.keywords || '').toLowerCase().includes(q);
    const byGroup = {};
    for (const g of BLOCK_GROUPS) byGroup[g] = [];
    for (const b of BLOCK_CATALOGUE) {
      if (!filter(b)) continue;
      (byGroup[b.group] || (byGroup[b.group] = [])).push(b);
    }
    return byGroup;
  }, [query]);

  const toggle = (g) => setCollapsed((c) => ({ ...c, [g]: !c[g] }));

  const onTileDragStart = (e, blockKey) => {
    // Populate both a MIME type and a fallback — Firefox wants a string.
    e.dataTransfer.setData('application/x-tapas-block', blockKey);
    e.dataTransfer.setData('text/plain', blockKey);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div style={{
      width: '240px', flexShrink: 0,
      background: W.navBg,
      borderRight: `1px solid ${W.topbarBorder}`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        height: '32px', flexShrink: 0,
        padding: '0 12px',
        display: 'flex', alignItems: 'center',
        borderBottom: `1px solid ${W.topbarBorder}`,
        color: W.textDim, fontSize: W.labelSize, fontWeight: 600,
        letterSpacing: W.labelLetter, textTransform: 'uppercase',
      }}>Add</div>

      {/* Search */}
      <div style={{ padding: '8px 10px' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search elements…"
          style={{
            width: '100%', height: '24px',
            padding: '0 8px',
            background: W.input, color: W.text,
            border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
            fontSize: '11px', outline: 'none',
          }}
        />
      </div>

      {/* Groups */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '8px' }}>
        {BLOCK_GROUPS.map((g) => {
          const items = groups[g] || [];
          if (items.length === 0) return null;
          const isCollapsed = !!collapsed[g];
          return (
            <div key={g}>
              <button
                onClick={() => toggle(g)}
                style={{
                  width: '100%', height: '26px',
                  padding: '0 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'transparent',
                  color: W.textDim, fontSize: '10.5px', fontWeight: 700,
                  letterSpacing: W.labelLetter, textTransform: 'uppercase',
                  border: 'none', cursor: 'pointer',
                }}
              >
                <span>{g}</span>
                <span style={{ color: W.textFaint, fontSize: '10px' }}>
                  {isCollapsed ? '▸' : '▾'}
                </span>
              </button>
              {!isCollapsed && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '4px',
                  padding: '4px 8px',
                }}>
                  {items.map((b) => (
                    <button
                      key={b.key}
                      draggable
                      onDragStart={(e) => onTileDragStart(e, b.key)}
                      onClick={() => onInsert(b.key)}
                      title={b.label}
                      style={{
                        height: '56px',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        gap: '4px',
                        background: W.input, color: W.textDim,
                        border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
                        cursor: 'grab',
                        fontSize: '10.5px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = W.accentDim;
                        e.currentTarget.style.borderColor = W.accent;
                        e.currentTarget.style.color = W.accent;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = W.input;
                        e.currentTarget.style.borderColor = W.inputBorder;
                        e.currentTarget.style.color = W.textDim;
                      }}
                    >
                      <span style={{ fontSize: '16px', lineHeight: 1 }}>{b.glyph}</span>
                      <span>{b.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {Object.values(groups).every((g) => g.length === 0) && (
          <div style={{ padding: '16px 12px', color: W.textFaint, fontSize: '11px', textAlign: 'center' }}>
            No matching blocks.
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 12px',
        borderTop: `1px solid ${W.panelBorder}`,
        color: W.textFaint, fontSize: '10.5px', lineHeight: 1.4,
      }}>
        Click to append · drag to canvas.<br />
        Forms · CMS · Ecommerce in Phase 7b.
      </div>
    </div>
  );
}
