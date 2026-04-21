// =====================================================================
// ClassBrowser — Lane G4 left-rail panel listing every class in the v2
// content blob with usage counts. Helps staff spot dead classes that
// linger after page deletes or element restructures, and provides a
// one-click cleanup.
//
// Each row shows: name, usage count, rename, delete. Header has a
// "Clean up unused" button that removes every 0-usage class at once.
// =====================================================================

import React, { useMemo, useState } from 'react';

const W = {
  navBg:       '#2a2a2a',
  topbarBorder:'#2a2a2a',
  hoverBg:     '#333',
  text:        '#e5e5e5',
  textDim:     '#a0a0a0',
  textFaint:   '#6a6a6a',
  accent:      '#146ef5',
  danger:      '#ef4444',
  labelSize:   '11px',
  labelLetter: '0.05em',
};

export default function ClassBrowser({
  classes,      // content.classes
  usage,        // usageMap { name: count }
  onRename,     // (name) => …
  onDelete,     // (name) => …
  onCleanup,    // () => … (deletes all zero-usage)
}) {
  const [query, setQuery] = useState('');
  const [hoverName, setHoverName] = useState(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = Object.keys(classes || {})
      .map((name) => ({ name, count: usage?.[name] || 0 }))
      .filter((r) => !q || r.name.toLowerCase().includes(q))
      // Unused first so cleanup candidates are visible without scrolling.
      .sort((a, b) => (a.count - b.count) || a.name.localeCompare(b.name));
    return all;
  }, [classes, usage, query]);

  const unusedCount = useMemo(
    () => Object.keys(classes || {}).filter((n) => !usage?.[n]).length,
    [classes, usage]
  );

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
      }}>Classes</div>

      {/* Search + cleanup */}
      <div style={{ padding: '8px 10px', display: 'flex', gap: '6px' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search classes…"
          style={{
            flex: 1, minWidth: 0, height: '24px',
            padding: '0 8px',
            background: '#1a1a1a', color: W.text,
            border: `1px solid #3a3a3a`, borderRadius: '3px',
            fontSize: '11px', outline: 'none',
          }}
        />
        <button
          onClick={() => {
            if (!unusedCount) return;
            // eslint-disable-next-line no-alert
            if (window.confirm(`Delete ${unusedCount} unused class${unusedCount === 1 ? '' : 'es'}?`)) {
              onCleanup();
            }
          }}
          disabled={!unusedCount}
          title={unusedCount ? `Delete ${unusedCount} unused class${unusedCount === 1 ? '' : 'es'}` : 'No unused classes'}
          style={{
            height: '24px', padding: '0 8px',
            background: unusedCount ? W.danger : 'transparent',
            color: unusedCount ? '#fff' : W.textFaint,
            border: `1px solid ${unusedCount ? W.danger : '#3a3a3a'}`,
            borderRadius: '3px',
            cursor: unusedCount ? 'pointer' : 'not-allowed',
            fontSize: '10.5px', fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >Clean up</button>
      </div>

      {/* Class list */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '6px' }}>
        {rows.length === 0 && (
          <div style={{ padding: '16px 12px', color: W.textFaint, fontSize: '11px', textAlign: 'center' }}>
            {Object.keys(classes || {}).length === 0 ? 'No classes yet.' : 'No matches.'}
          </div>
        )}
        {rows.map((r) => {
          const isHovered = r.name === hoverName;
          const isZero = r.count === 0;
          return (
            <div key={r.name}
              onMouseEnter={() => setHoverName(r.name)}
              onMouseLeave={() => setHoverName((n) => n === r.name ? null : n)}
              style={{
                display: 'flex', alignItems: 'center',
                padding: '6px 6px 6px 12px',
                background: isHovered ? W.hoverBg : 'transparent',
                fontSize: '11.5px',
              }}
            >
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <span style={{
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: isZero ? W.textFaint : W.text,
                  fontFamily: 'ui-monospace, monospace',
                }}>.{r.name}</span>
                <span style={{
                  fontSize: '10px',
                  color: isZero ? W.danger : W.textFaint,
                }}>{r.count} use{r.count === 1 ? '' : 's'}{isZero ? ' · unused' : ''}</span>
              </div>
              {isHovered && (
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button
                    title="Rename"
                    onClick={() => onRename(r.name)}
                    style={iconBtn}
                  >✎</button>
                  <button
                    title="Delete class (strips from every node that uses it)"
                    onClick={() => {
                      // eslint-disable-next-line no-alert
                      if (r.count === 0 || window.confirm(`Delete .${r.name}? This strips it from ${r.count} node${r.count === 1 ? '' : 's'}.`)) {
                        onDelete(r.name);
                      }
                    }}
                    style={iconBtn}
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

const iconBtn = {
  width: '22px', height: '22px', padding: 0,
  background: 'transparent',
  color: W.textDim,
  border: 'none', borderRadius: '3px',
  cursor: 'pointer', fontSize: '11px', lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
