// =====================================================================
// ComponentsPanel — Phase E, Lane G2.
//
// Left-rail slot 4. Lists every component saved in
// content.components, with:
//   * usage count (how many instances exist across all pages)
//   * Insert → drops a fresh instance on the current page root
//   * Edit    → opens the component-scope editor (def.root becomes
//               the canvas tree; all edits write via updateComponentRoot)
//   * Rename  → inline prompt
//   * Delete  → blocked while usage > 0 (staff must detach first)
//
// The panel shows a different empty-state when the user hasn't saved
// anything yet so the right-click flow is discoverable.
// =====================================================================

import React from 'react';

const P = {
  bg:          '#2a2a2a',
  border:      '#2a2a2a',
  text:        '#e5e5e5',
  textDim:     '#a0a0a0',
  textFaint:   '#6a6a6a',
  rowHover:    '#333',
  accent:      '#146ef5',
  accentDim:   '#146ef522',
  danger:      '#c0443a',
  labelSize:   '11px',
  labelLetter: '0.05em',
};

export default function ComponentsPanel({
  content, usage,
  editingComponentId,
  onInsert, onEdit, onRename, onDelete,
}) {
  const entries = Object.entries(content?.components || {});

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
        color: P.textDim, fontSize: P.labelSize, fontWeight: 600,
        letterSpacing: P.labelLetter, textTransform: 'uppercase',
      }}>
        <span>Components</span>
        <span style={{ color: P.textFaint, fontSize: '10.5px' }}>{entries.length}</span>
      </div>

      {entries.length === 0 ? (
        <div style={{ padding: '24px 16px', color: P.textDim, fontSize: '11.5px', lineHeight: 1.55, textAlign: 'center' }}>
          <div style={{ color: P.text, fontWeight: 600, marginBottom: '6px' }}>No components yet</div>
          <div>
            Select any element on the canvas, then right-click → <span style={{ color: P.text }}>Save as component</span> (or press ⌘⌥C) to start one.
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {entries.map(([id, def]) => (
            <Row
              key={id}
              id={id}
              def={def}
              count={usage?.[id] || 0}
              editing={editingComponentId === id}
              onInsert={onInsert}
              onEdit={onEdit}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      <div style={{
        flexShrink: 0, padding: '6px 12px',
        borderTop: `1px solid ${P.border}`,
        color: P.textFaint, fontSize: '10.5px', lineHeight: 1.5,
      }}>
        Editing a component updates every instance on reload.
      </div>
    </div>
  );
}

function Row({ id, def, count, editing, onInsert, onEdit, onRename, onDelete }) {
  const confirmDelete = () => {
    if (count > 0) {
      window.alert(`"${def.name}" is still used by ${count} instance${count === 1 ? '' : 's'}. Detach them first.`);
      return;
    }
    if (window.confirm(`Delete component "${def.name}"?`)) onDelete?.(id);
  };
  const rename = () => {
    const next = window.prompt('Rename component:', def.name || '');
    if (next === null) return;
    const trimmed = next.trim();
    if (trimmed && trimmed !== def.name) onRename?.(id, trimmed);
  };
  return (
    <div
      style={{
        padding: '6px 10px 8px',
        borderLeft: editing ? `2px solid ${P.accent}` : '2px solid transparent',
        background: editing ? P.accentDim : 'transparent',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        color: P.text, fontSize: '12px', fontWeight: 600,
      }}>
        <span style={{ color: P.accent, fontSize: '10px' }}>◆</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {def.name || '(unnamed)'}
        </span>
        <span style={{ color: P.textFaint, fontSize: '10.5px', fontWeight: 500 }}>
          {count}×
        </span>
      </div>
      <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
        <ActionBtn onClick={() => onInsert?.(id)} title="Insert instance on current page">
          + Insert
        </ActionBtn>
        <ActionBtn primary={editing} onClick={() => onEdit?.(editing ? null : id)} title={editing ? 'Close component editor' : 'Open in canvas'}>
          {editing ? '✓ Editing' : 'Edit'}
        </ActionBtn>
        <ActionBtn onClick={rename} title="Rename">
          Rename
        </ActionBtn>
        <ActionBtn
          danger={count === 0}
          disabled={count > 0}
          onClick={confirmDelete}
          title={count > 0 ? 'Detach all instances first' : 'Delete component'}
        >
          Delete
        </ActionBtn>
      </div>
    </div>
  );
}

function ActionBtn({ children, onClick, primary, danger, disabled, title }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      title={title}
      style={{
        padding: '3px 8px', fontSize: '10.5px', fontWeight: 600,
        background: primary ? P.accentDim : 'transparent',
        color:      primary ? P.accent
                  : danger  ? '#ff9a9a'
                  : disabled ? P.textFaint
                  : P.text,
        border: `1px solid ${primary ? P.accent : '#3a3a3a'}`,
        borderRadius: '3px',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >{children}</button>
  );
}
