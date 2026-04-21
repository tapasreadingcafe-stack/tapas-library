// =====================================================================
// PagesPanel — Lane A3 left-rail panel listing every v2 page.
//
// Sits in the same 240 px slot as AddPanel and Navigator (the left rail
// swaps whichever panel is active). Click a row to switch pageKey;
// hover a row to reveal rename / delete actions. A + New button at
// the top creates a new page using the same prompt flow as the
// top-bar button so both entry points behave identically.
//
// home page can't be deleted but can be renamed (consistent with the
// top-bar buttons). All actions route through the existing handlers
// so undo/redo and autosave apply.
// =====================================================================

import React, { useState } from 'react';

const W = {
  navBg:       '#2a2a2a',
  topbarBorder:'#2a2a2a',
  panelBorder: '#2a2a2a',
  hoverBg:     '#333',
  text:        '#e5e5e5',
  textDim:     '#a0a0a0',
  textFaint:   '#6a6a6a',
  accent:      '#146ef5',
  selectionBg: '#2b6fd6',
  labelSize:   '11px',
  labelLetter: '0.05em',
};

export default function PagesPanel({
  pages,          // [{ key, name, slug }]
  activeKey,
  onPick,
  onCreate,
  onRename,       // (key) => …
  onDelete,       // (key) => …
}) {
  const [hoverKey, setHoverKey] = useState(null);

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
        padding: '0 8px 0 12px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${W.topbarBorder}`,
        color: W.textDim, fontSize: W.labelSize, fontWeight: 600,
        letterSpacing: W.labelLetter, textTransform: 'uppercase',
      }}>
        <span>Pages</span>
        <button
          onClick={onCreate}
          title="New page"
          style={{
            height: '22px', padding: '0 7px',
            background: 'transparent', color: W.textDim,
            border: `1px solid ${W.topbarBorder}`, borderRadius: '3px',
            cursor: 'pointer', fontSize: '12px', lineHeight: 1,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = W.accent; e.currentTarget.style.borderColor = W.accent; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = W.textDim; e.currentTarget.style.borderColor = W.topbarBorder; }}
        >+</button>
      </div>

      {/* Page list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {pages.length === 0 && (
          <div style={{ padding: '16px 12px', color: W.textFaint, fontSize: '11px', textAlign: 'center' }}>
            No pages yet.
          </div>
        )}
        {pages.map((p) => {
          const isActive = p.key === activeKey;
          const isHovered = p.key === hoverKey;
          const isHome = p.key === 'home';
          return (
            <div key={p.key}
              onMouseEnter={() => setHoverKey(p.key)}
              onMouseLeave={() => setHoverKey((k) => k === p.key ? null : k)}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center',
                paddingLeft: '12px', paddingRight: '6px',
                background: isActive ? W.selectionBg : (isHovered ? W.hoverBg : 'transparent'),
                color: isActive ? '#fff' : W.text,
                cursor: 'pointer',
              }}
            >
              <button
                onClick={() => onPick(p.key)}
                style={{
                  flex: 1, minWidth: 0,
                  padding: '8px 0',
                  background: 'transparent', border: 'none',
                  color: 'inherit', cursor: 'pointer', textAlign: 'left',
                  fontSize: '11.5px',
                  display: 'flex', flexDirection: 'column', gap: '1px',
                }}
              >
                <span style={{
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontWeight: isActive ? 700 : 500,
                }}>{p.name || p.key}</span>
                <span style={{
                  fontSize: '10px',
                  color: isActive ? 'rgba(255,255,255,0.7)' : W.textFaint,
                  fontFamily: 'ui-monospace, monospace',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{p.slug || `/${p.key}`}</span>
              </button>
              {/* Row actions, visible on hover. Click must stop-propagate
                  so it doesn't also switch pageKey via the button above. */}
              {isHovered && (
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button
                    title="Rename"
                    onClick={(e) => { e.stopPropagation(); onRename(p.key); }}
                    style={iconBtn(isActive)}
                  >✎</button>
                  <button
                    title={isHome ? 'Home cannot be deleted' : 'Delete'}
                    disabled={isHome}
                    onClick={(e) => { e.stopPropagation(); if (!isHome) onDelete(p.key); }}
                    style={{ ...iconBtn(isActive), opacity: isHome ? 0.3 : 1, cursor: isHome ? 'not-allowed' : 'pointer' }}
                  >🗑</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function iconBtn(isActive) {
  return {
    width: '22px', height: '22px', padding: 0,
    background: 'transparent',
    color: isActive ? '#fff' : W.textDim,
    border: 'none', borderRadius: '3px',
    cursor: 'pointer', fontSize: '11px', lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}
