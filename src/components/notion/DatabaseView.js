import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import {
  uid,
  PROPERTY_TYPES,
  VIEW_TYPES,
  SELECT_COLORS,
  COLOR_STYLES,
  formatDateDisplay,
  N,
} from './shared';

// ── Staff cache for Person property ────────────────────────────────
// Loaded once, shared across all PersonCell instances.
let _staffCache = null;
let _staffLoading = false;
let _staffListeners = [];

function getStaffList() {
  if (_staffCache) return Promise.resolve(_staffCache);
  if (_staffLoading) {
    return new Promise(resolve => { _staffListeners.push(resolve); });
  }
  _staffLoading = true;
  return supabase
    .from('staff')
    .select('id, name, email, role, avatar_url')
    .eq('is_active', true)
    .order('name')
    .then(({ data }) => {
      _staffCache = data || [];
      _staffLoading = false;
      _staffListeners.forEach(fn => fn(_staffCache));
      _staffListeners = [];
      return _staffCache;
    });
}

// =====================================================================
// DatabaseView — Notion-style database with Table / Board / Gallery / List
// ---------------------------------------------------------------------
// Props:
//   database       tasks_pages row where is_database = true
//   rows           child tasks_pages rows (parent_id = database.id)
//   onUpdateSchema (schema) => void       save db_schema
//   onCreateRow    (initialProperties) => Promise<row>
//   onUpdateRow    (rowId, patch) => void patch can be {title, properties}
//   onDeleteRow    (rowId) => void
//   onOpenRow      (row) => void          open row as full page editor
// =====================================================================

export default function DatabaseView({
  database, rows,
  onUpdateSchema, onCreateRow, onUpdateRow, onDeleteRow, onOpenRow,
}) {
  const schema = useMemo(() => {
    const s = database?.db_schema || { properties: [], views: [] };
    return {
      properties: s.properties || [],
      views: s.views && s.views.length ? s.views : [{ id: 'default', name: 'Table', type: 'table' }],
    };
  }, [database]);

  const [activeViewId, setActiveViewId] = useState(schema.views[0]?.id);
  useEffect(() => {
    if (!schema.views.find(v => v.id === activeViewId)) {
      setActiveViewId(schema.views[0]?.id);
    }
  }, [schema.views, activeViewId]);

  const activeView = schema.views.find(v => v.id === activeViewId) || schema.views[0];

  // ── Schema mutations ─────────────────────────────────────────────
  const addProperty = (type = 'text') => {
    const prop = {
      id: uid(),
      name: `${PROPERTY_TYPES.find(p => p.type === type)?.label || 'Property'} ${schema.properties.length + 1}`,
      type,
      options: type === 'select' ? [] : undefined,
    };
    onUpdateSchema({ ...schema, properties: [...schema.properties, prop] });
  };

  const updateProperty = (propId, patch) => {
    onUpdateSchema({
      ...schema,
      properties: schema.properties.map(p => p.id === propId ? { ...p, ...patch } : p),
    });
  };

  const deleteProperty = (propId) => {
    if (!window.confirm('Delete this column? Values in every row will be lost.')) return;
    onUpdateSchema({
      ...schema,
      properties: schema.properties.filter(p => p.id !== propId),
    });
  };

  // ── View mutations ───────────────────────────────────────────────
  const addView = (type) => {
    const view = {
      id: uid(),
      name: VIEW_TYPES.find(v => v.type === type)?.label || 'View',
      type,
    };
    if (type === 'board') {
      view.group_by = schema.properties.find(p => p.type === 'select')?.id;
    }
    onUpdateSchema({ ...schema, views: [...schema.views, view] });
    setActiveViewId(view.id);
  };

  const updateView = (viewId, patch) => {
    onUpdateSchema({
      ...schema,
      views: schema.views.map(v => v.id === viewId ? { ...v, ...patch } : v),
    });
  };

  const deleteView = (viewId) => {
    if (schema.views.length <= 1) return;
    if (!window.confirm('Delete this view?')) return;
    onUpdateSchema({
      ...schema,
      views: schema.views.filter(v => v.id !== viewId),
    });
  };

  // ── CSV Export ─────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    const headers = ['Name', ...schema.properties.map(p => p.name)];
    const csvRows = [headers.join(',')];
    for (const row of rows) {
      const cells = [
        `"${(row.title || '').replace(/"/g, '""')}"`,
        ...schema.properties.map(p => {
          let val = row.properties?.[p.id] ?? '';
          if (p.type === 'select') {
            const opt = p.options?.find(o => o.id === val);
            val = opt?.name || '';
          }
          if (p.type === 'person') {
            const person = (_staffCache || []).find(s => s.id === val);
            val = person?.name || '';
          }
          if (p.type === 'checkbox') val = val ? 'Yes' : 'No';
          return `"${String(val).replace(/"/g, '""')}"`;
        }),
      ];
      csvRows.push(cells.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${database?.title || 'database'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows, schema, database]);

  // ── CSV Import ─────────────────────────────────────────────────
  const importRef = useRef(null);
  const handleImport = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return alert('CSV needs a header row + at least one data row.');
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].match(/(".*?"|[^,]*)/g)?.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim()) || [];
      const title = cells[0] || 'Untitled';
      const props = {};
      schema.properties.forEach((prop, pi) => {
        const raw = cells[pi + 1] || '';
        if (!raw) return;
        if (prop.type === 'select') {
          let opt = prop.options?.find(o => o.name.toLowerCase() === raw.toLowerCase());
          if (!opt) {
            opt = { id: uid(), name: raw, color: SELECT_COLORS[(prop.options?.length || 0) % SELECT_COLORS.length] };
            prop.options = [...(prop.options || []), opt];
          }
          props[prop.id] = opt.id;
        } else if (prop.type === 'checkbox') {
          props[prop.id] = ['yes','true','1','✓'].includes(raw.toLowerCase());
        } else if (prop.type === 'number') {
          props[prop.id] = Number(raw) || null;
        } else {
          props[prop.id] = raw;
        }
      });
      await onCreateRow({ title, properties: props });
      imported++;
    }
    // Update schema if new select options were added
    onUpdateSchema(schema);
    alert(`Imported ${imported} row(s).`);
    if (importRef.current) importRef.current.value = '';
  }, [schema, onCreateRow, onUpdateSchema]);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div>
      {/* View switcher toolbar */}
      <div style={styles.toolbar}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
          {schema.views.map(view => {
            const active = view.id === activeViewId;
            const vt = VIEW_TYPES.find(v => v.type === view.type);
            return (
              <div key={view.id} style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => setActiveViewId(view.id)}
                  style={{
                    ...styles.tab,
                    color: active ? N.text : N.textMuted,
                    borderBottom: active ? `2px solid ${N.accent}` : '2px solid transparent',
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  <span style={{ fontSize: '13px', marginRight: '6px' }}>{vt?.icon}</span>
                  {view.name}
                </button>
              </div>
            );
          })}
          <AddViewButton onAdd={addView} />
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* Export / Import */}
          <button onClick={exportCSV} style={styles.toolBtn} title="Export as CSV (opens in Excel)">
            📥 Export
          </button>
          <label style={{ ...styles.toolBtn, cursor: 'pointer' }} title="Import from CSV">
            📤 Import
            <input ref={importRef} type="file" accept=".csv" onChange={handleImport}
              style={{ display: 'none' }} />
          </label>

          {activeView?.type === 'board' && (
            <GroupBySelect
              schema={schema}
              value={activeView.group_by}
              onChange={(propId) => updateView(activeView.id, { group_by: propId })}
            />
          )}
          {schema.views.length > 1 && (
            <button
              onClick={() => deleteView(activeView.id)}
              style={styles.iconBtn}
              title="Delete this view"
            >
              🗑
            </button>
          )}
        </div>
      </div>

      {/* Active view body */}
      {activeView?.type === 'table' && (
        <TableView
          schema={schema}
          rows={rows}
          onAddProperty={addProperty}
          onUpdateProperty={updateProperty}
          onDeleteProperty={deleteProperty}
          onCreateRow={onCreateRow}
          onUpdateRow={onUpdateRow}
          onDeleteRow={onDeleteRow}
          onOpenRow={onOpenRow}
        />
      )}
      {activeView?.type === 'board' && (
        <BoardView
          schema={schema}
          rows={rows}
          groupBy={activeView.group_by}
          onCreateRow={onCreateRow}
          onUpdateRow={onUpdateRow}
          onOpenRow={onOpenRow}
        />
      )}
      {activeView?.type === 'gallery' && (
        <GalleryView
          schema={schema}
          rows={rows}
          onCreateRow={onCreateRow}
          onOpenRow={onOpenRow}
        />
      )}
      {activeView?.type === 'list' && (
        <ListView
          schema={schema}
          rows={rows}
          onCreateRow={onCreateRow}
          onOpenRow={onOpenRow}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// TABLE VIEW
// ─────────────────────────────────────────────────────────────────────

function TableView({
  schema, rows,
  onAddProperty, onUpdateProperty, onDeleteProperty,
  onCreateRow, onUpdateRow, onDeleteRow, onOpenRow,
}) {
  const titleColWidth = 260;
  const colWidth = 180;

  return (
    <div style={styles.tableWrap}>
      <div style={{ display: 'inline-flex', flexDirection: 'column', minWidth: '100%' }}>
        {/* Header row */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${N.border}`, background: N.bgAlt }}>
          <div style={{
            ...styles.cell,
            width: titleColWidth,
            fontWeight: 700,
            color: N.textMuted,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            borderRight: `1px solid ${N.border}`,
          }}>
            <span style={{ marginRight: '6px' }}>𝗧</span> Name
          </div>
          {schema.properties.map(prop => (
            <div
              key={prop.id}
              style={{
                ...styles.cell,
                width: colWidth,
                borderRight: `1px solid ${N.border}`,
              }}
            >
              <PropertyHeader
                prop={prop}
                onUpdate={(patch) => onUpdateProperty(prop.id, patch)}
                onDelete={() => onDeleteProperty(prop.id)}
              />
            </div>
          ))}
          <div style={{ width: '48px', ...styles.cell, borderRight: 'none' }}>
            <AddPropertyButton onAdd={onAddProperty} />
          </div>
        </div>

        {/* Data rows */}
        {rows.length === 0 ? (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            color: N.textFaint,
            fontSize: '13px',
            borderBottom: `1px solid ${N.border}`,
          }}>
            No rows yet. Click "+ New row" below.
          </div>
        ) : rows.map(row => (
          <div
            key={row.id}
            style={{
              display: 'flex',
              borderBottom: `1px solid ${N.borderSoft}`,
              transition: 'background 100ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = N.bgAlt; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{
              ...styles.cell,
              width: titleColWidth,
              borderRight: `1px solid ${N.borderSoft}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '14px' }}>{row.icon || '📄'}</span>
              <input
                value={row.title}
                onChange={e => onUpdateRow(row.id, { title: e.target.value })}
                placeholder="Untitled"
                style={styles.cellInput}
              />
              <button
                onClick={() => onOpenRow(row)}
                style={styles.openBtn}
                title="Open as page"
              >
                ↗
              </button>
            </div>
            {schema.properties.map(prop => (
              <div
                key={prop.id}
                style={{
                  ...styles.cell,
                  width: colWidth,
                  borderRight: `1px solid ${N.borderSoft}`,
                  padding: 0,
                }}
              >
                <PropertyCell
                  prop={prop}
                  value={row.properties?.[prop.id]}
                  onChange={(v) => onUpdateRow(row.id, {
                    properties: { ...(row.properties || {}), [prop.id]: v },
                  })}
                  onUpdateProperty={(patch) => onUpdateProperty(prop.id, patch)}
                />
              </div>
            ))}
            <div style={{ width: '48px', ...styles.cell, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button
                onClick={() => onDeleteRow(row.id)}
                style={styles.rowDeleteBtn}
                title="Delete row"
              >
                🗑
              </button>
            </div>
          </div>
        ))}

        {/* New-row button */}
        <div
          onClick={() => onCreateRow({})}
          style={{
            padding: '10px 14px',
            color: N.textFaint,
            fontSize: '13px',
            cursor: 'pointer',
            borderBottom: `1px solid ${N.borderSoft}`,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = N.bgAlt; e.currentTarget.style.color = N.textMuted; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = N.textFaint; }}
        >
          + New row
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// BOARD VIEW
// ─────────────────────────────────────────────────────────────────────

function BoardView({ schema, rows, groupBy, onCreateRow, onUpdateRow, onOpenRow }) {
  const prop = schema.properties.find(p => p.id === groupBy);

  if (!prop) {
    return (
      <div style={styles.emptyView}>
        <div style={{ fontSize: '32px', marginBottom: '10px' }}>▥</div>
        <div style={{ fontWeight: 700, marginBottom: '4px' }}>Pick a property to group by</div>
        <div style={{ fontSize: '12px', color: N.textFaint }}>
          Use the "Group by" dropdown in the toolbar to pick a select property.
        </div>
      </div>
    );
  }
  if (prop.type !== 'select') {
    return (
      <div style={styles.emptyView}>
        <div style={{ fontWeight: 700, marginBottom: '4px' }}>
          Board needs a Select property
        </div>
        <div style={{ fontSize: '12px', color: N.textFaint }}>
          "{prop.name}" is a {prop.type}. Pick a select property in the toolbar to group.
        </div>
      </div>
    );
  }

  const groups = [
    ...(prop.options || []),
    { id: '__none__', name: 'No ' + prop.name, color: 'gray' },
  ];
  const byGroup = Object.fromEntries(groups.map(g => [g.id, []]));
  rows.forEach(r => {
    const v = r.properties?.[prop.id];
    if (v && byGroup[v]) byGroup[v].push(r);
    else byGroup.__none__.push(r);
  });

  const [dragOverGroup, setDragOverGroup] = useState(null);

  const handleDragStart = (e, rowId) => {
    e.dataTransfer.setData('text/plain', rowId);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDragOverGroup(null);
  };

  const handleDrop = (e, groupId) => {
    e.preventDefault();
    setDragOverGroup(null);
    const rowId = e.dataTransfer.getData('text/plain');
    if (!rowId) return;
    const newValue = groupId === '__none__' ? null : groupId;
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    onUpdateRow(rowId, {
      properties: { ...(row.properties || {}), [prop.id]: newValue },
    });
  };

  return (
    <div style={styles.boardWrap}>
      {groups.map(g => {
        const color = COLOR_STYLES[g.color] || COLOR_STYLES.gray;
        const items = byGroup[g.id];
        const isOver = dragOverGroup === g.id;
        return (
          <div
            key={g.id}
            style={{
              ...styles.boardColumn,
              background: isOver ? '#dbeafe' : N.bgAlt,
              border: isOver ? '2px dashed #3b82f6' : '2px solid transparent',
              transition: 'background 150ms, border 150ms',
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOverGroup(g.id); }}
            onDragLeave={() => setDragOverGroup(null)}
            onDrop={(e) => handleDrop(e, g.id)}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              marginBottom: '10px', padding: '4px 6px',
            }}>
              <span style={{
                display: 'inline-block', padding: '3px 10px',
                borderRadius: '99px', background: color.bg,
                color: color.fg, fontSize: '11px', fontWeight: 700,
              }}>{g.name}</span>
              <span style={{ color: N.textFaint, fontSize: '11px' }}>{items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '60px' }}>
              {items.map(row => (
                <BoardCard
                  key={row.id}
                  row={row}
                  schema={schema}
                  onClick={() => onOpenRow(row)}
                  onDragStart={(e) => handleDragStart(e, row.id)}
                  onDragEnd={handleDragEnd}
                />
              ))}
              <button
                onClick={() => onCreateRow({
                  properties: { [prop.id]: g.id === '__none__' ? null : g.id },
                })}
                style={styles.addCardBtn}
              >
                + New
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BoardCard({ row, schema, onClick, onDragStart, onDragEnd }) {
  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        background: 'white',
        borderRadius: '8px',
        padding: '12px',
        border: `1px solid ${N.border}`,
        cursor: 'grab',
        transition: 'all 150ms',
        boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 16px rgba(15,23,42,0.10)'; e.currentTarget.style.borderColor = N.accent; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(15,23,42,0.03)'; e.currentTarget.style.borderColor = N.border; }}
    >
      <div style={{ fontSize: '14px', fontWeight: 600, color: N.text, marginBottom: '6px' }}>
        {row.icon || '📄'} {row.title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {schema.properties.slice(0, 3).map(prop => (
          <CardPropertyChip key={prop.id} prop={prop} value={row.properties?.[prop.id]} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// GALLERY VIEW
// ─────────────────────────────────────────────────────────────────────

function GalleryView({ schema, rows, onCreateRow, onOpenRow }) {
  return (
    <div style={styles.galleryWrap}>
      {rows.map(row => (
        <div
          key={row.id}
          onClick={() => onOpenRow(row)}
          style={{
            background: 'white',
            borderRadius: '10px',
            border: `1px solid ${N.border}`,
            padding: '16px',
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 10px 28px rgba(15,23,42,0.1)'; e.currentTarget.style.borderColor = N.accent; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = N.border; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{ fontSize: '30px', marginBottom: '10px' }}>{row.icon || '📄'}</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: N.text, marginBottom: '10px' }}>
            {row.title || 'Untitled'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {schema.properties.slice(0, 4).map(prop => (
              <div key={prop.id} style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                <span style={{ color: N.textFaint, minWidth: '70px' }}>{prop.name}</span>
                <CardPropertyChip prop={prop} value={row.properties?.[prop.id]} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={() => onCreateRow({})}
        style={{
          ...styles.galleryAddBtn,
        }}
      >
        + New card
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// LIST VIEW
// ─────────────────────────────────────────────────────────────────────

function ListView({ schema, rows, onCreateRow, onOpenRow }) {
  return (
    <div>
      {rows.length === 0 && (
        <div style={{ padding: '24px', color: N.textFaint, fontSize: '13px', textAlign: 'center' }}>
          No rows yet.
        </div>
      )}
      {rows.map(row => (
        <div
          key={row.id}
          onClick={() => onOpenRow(row)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderBottom: `1px solid ${N.borderSoft}`,
            cursor: 'pointer',
            transition: 'background 100ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = N.bgAlt; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <span style={{ fontSize: '15px' }}>{row.icon || '📄'}</span>
          <span style={{ flex: 1, fontSize: '14px', color: N.text, fontWeight: 500 }}>
            {row.title || 'Untitled'}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {schema.properties.slice(0, 3).map(prop => (
              <CardPropertyChip key={prop.id} prop={prop} value={row.properties?.[prop.id]} />
            ))}
          </div>
        </div>
      ))}
      <div
        onClick={() => onCreateRow({})}
        style={{
          padding: '10px 14px',
          color: N.textFaint,
          fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        + New row
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Property cells (inline editable)
// ─────────────────────────────────────────────────────────────────────

function PropertyCell({ prop, value, onChange, onUpdateProperty }) {
  switch (prop.type) {
    case 'text':
      return <TextCell value={value} onChange={onChange} />;
    case 'number':
      return <NumberCell value={value} onChange={onChange} />;
    case 'checkbox':
      return <CheckboxCell value={value} onChange={onChange} />;
    case 'date':
      return <DateCell value={value} onChange={onChange} />;
    case 'url':
      return <UrlCell value={value} onChange={onChange} />;
    case 'email':
      return <TextCell value={value} onChange={onChange} placeholder="email" />;
    case 'phone':
      return <TextCell value={value} onChange={onChange} placeholder="phone" />;
    case 'person':
      return <PersonCell value={value} onChange={onChange} />;
    case 'select':
      return (
        <SelectCell
          prop={prop}
          value={value}
          onChange={onChange}
          onUpdateProperty={onUpdateProperty}
        />
      );
    default:
      return <TextCell value={value} onChange={onChange} />;
  }
}

function TextCell({ value, onChange, placeholder }) {
  return (
    <input
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || ''}
      style={styles.cellInput}
    />
  );
}

function NumberCell({ value, onChange }) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
      placeholder="0"
      style={styles.cellInput}
    />
  );
}

function CheckboxCell({ value, onChange }) {
  return (
    <div style={{ padding: '0 12px', display: 'flex', alignItems: 'center', height: '100%' }}>
      <input
        type="checkbox"
        checked={!!value}
        onChange={e => onChange(e.target.checked)}
        style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: N.accent }}
      />
    </div>
  );
}

function DateCell({ value, onChange }) {
  return (
    <input
      type="date"
      value={value || ''}
      onChange={e => onChange(e.target.value || null)}
      style={{ ...styles.cellInput, fontFamily: 'inherit', color: value ? N.text : N.textFaint }}
    />
  );
}

function UrlCell({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  if (editing || !value) {
    return (
      <input
        autoFocus={editing}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        placeholder="https://…"
        style={styles.cellInput}
      />
    );
  }
  return (
    <a
      href={value}
      target="_blank"
      rel="noreferrer"
      onClick={e => { e.stopPropagation(); }}
      onDoubleClick={() => setEditing(true)}
      style={{
        ...styles.cellInput,
        color: N.accent,
        textDecoration: 'underline',
        display: 'block',
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      }}
    >
      {value}
    </a>
  );
}

function PersonCell({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState(_staffCache || []);

  useEffect(() => {
    if (!_staffCache) {
      getStaffList().then(setStaff);
    }
  }, []);

  const selected = staff.find(s => s.id === value);
  const initials = (name) => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        onClick={() => setOpen(true)}
        style={{ padding: '6px 10px', cursor: 'pointer', minHeight: '28px', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        {selected ? (
          <>
            <span style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #D4A853, #C49040)',
              color: '#fff', fontSize: '10px', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {initials(selected.name)}
            </span>
            <span style={{ fontSize: '12px', color: N.text, fontWeight: 500 }}>{selected.name}</span>
          </>
        ) : (
          <span style={{ color: N.textFaint, fontSize: '12px' }}>—</span>
        )}
      </div>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 21,
            minWidth: '220px', background: 'white',
            border: `1px solid ${N.border}`, borderRadius: '8px',
            boxShadow: '0 14px 34px rgba(15,23,42,0.14)',
            padding: '6px', marginTop: '4px',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: N.textFaint, textTransform: 'uppercase', padding: '4px 8px' }}>
              Assign to
            </div>
            {staff.length === 0 && (
              <div style={{ padding: '8px', fontSize: '12px', color: N.textFaint }}>No staff found</div>
            )}
            {staff.map(s => (
              <div
                key={s.id}
                onClick={() => { onChange(s.id); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '6px 8px', borderRadius: '4px', cursor: 'pointer',
                  background: s.id === value ? N.hover : 'transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.background = N.hover}
                onMouseLeave={e => e.currentTarget.style.background = s.id === value ? N.hover : 'transparent'}
              >
                <span style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #D4A853, #C49040)',
                  color: '#fff', fontSize: '10px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {initials(s.name)}
                </span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: N.text }}>{s.name}</div>
                  <div style={{ fontSize: '10px', color: N.textFaint }}>{s.role}</div>
                </div>
              </div>
            ))}
            {value && (
              <div
                onClick={() => { onChange(null); setOpen(false); }}
                style={{
                  padding: '6px 8px', borderTop: `1px solid ${N.border}`,
                  marginTop: '6px', fontSize: '12px', color: N.textMuted,
                  cursor: 'pointer',
                }}
              >
                Clear assignee
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SelectCell({ prop, value, onChange, onUpdateProperty }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = prop.options?.find(o => o.id === value);

  const addOption = (name) => {
    const newOpt = {
      id: uid(),
      name: name.trim(),
      color: SELECT_COLORS[(prop.options?.length || 0) % SELECT_COLORS.length],
    };
    onUpdateProperty({ options: [...(prop.options || []), newOpt] });
    onChange(newOpt.id);
    setQuery('');
    setOpen(false);
  };

  const filtered = (prop.options || []).filter(o =>
    !query || o.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        onClick={() => setOpen(true)}
        style={{
          padding: '6px 10px',
          cursor: 'pointer',
          minHeight: '28px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {selected ? (
          <Chip color={selected.color}>{selected.name}</Chip>
        ) : (
          <span style={{ color: N.textFaint, fontSize: '12px' }}>—</span>
        )}
      </div>
      {open && (
        <>
          <div onClick={() => { setOpen(false); setQuery(''); }} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 21,
            minWidth: '220px',
            background: 'white',
            border: `1px solid ${N.border}`,
            borderRadius: '8px',
            boxShadow: '0 14px 34px rgba(15,23,42,0.14)',
            padding: '8px',
            marginTop: '4px',
          }}>
            <input
              autoFocus
              placeholder="Search or create…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && query.trim()) {
                  const match = filtered[0];
                  if (match) {
                    onChange(match.id);
                    setOpen(false);
                    setQuery('');
                  } else {
                    addOption(query);
                  }
                }
              }}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: `1px solid ${N.border}`,
                borderRadius: '4px',
                fontSize: '12px',
                outline: 'none',
                marginBottom: '6px',
              }}
            />
            <div style={{ fontSize: '10px', fontWeight: 700, color: N.textFaint, textTransform: 'uppercase', padding: '4px 8px' }}>
              Options
            </div>
            {filtered.map(opt => (
              <div
                key={opt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = N.hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => { onChange(opt.id); setOpen(false); setQuery(''); }}
              >
                <Chip color={opt.color}>{opt.name}</Chip>
              </div>
            ))}
            {value && (
              <div
                style={{
                  padding: '6px 8px',
                  borderTop: `1px solid ${N.border}`,
                  marginTop: '6px',
                  fontSize: '12px',
                  color: N.textMuted,
                  cursor: 'pointer',
                }}
                onClick={() => { onChange(null); setOpen(false); }}
              >
                Clear selection
              </div>
            )}
            {query && !filtered.find(o => o.name.toLowerCase() === query.toLowerCase()) && (
              <div
                style={{
                  padding: '6px 8px',
                  borderTop: `1px solid ${N.border}`,
                  marginTop: '6px',
                  fontSize: '12px',
                  color: N.accent,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                onClick={() => addOption(query)}
              >
                + Create "{query}"
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CardPropertyChip({ prop, value }) {
  if (value === null || value === undefined || value === '') return null;
  if (prop.type === 'select') {
    const opt = prop.options?.find(o => o.id === value);
    if (!opt) return null;
    return <Chip color={opt.color}>{opt.name}</Chip>;
  }
  if (prop.type === 'person') {
    const person = (_staffCache || []).find(s => s.id === value);
    if (!person) return null;
    const initials = (person.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: N.textMuted }}>
        <span style={{
          width: '16px', height: '16px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #D4A853, #C49040)',
          color: '#fff', fontSize: '8px', fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>{initials}</span>
        {person.name}
      </span>
    );
  }
  if (prop.type === 'checkbox') {
    return (
      <span style={{ fontSize: '11px', color: value ? '#166534' : N.textFaint }}>
        {value ? '✓ done' : '○ open'}
      </span>
    );
  }
  if (prop.type === 'date') {
    return <span style={{ fontSize: '11px', color: N.textMuted }}>{formatDateDisplay(value)}</span>;
  }
  return <span style={{ fontSize: '11px', color: N.textMuted }}>{String(value)}</span>;
}

function Chip({ color = 'gray', children }) {
  const c = COLOR_STYLES[color] || COLOR_STYLES.gray;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '99px',
      background: c.bg,
      color: c.fg,
      fontSize: '11px',
      fontWeight: 600,
    }}>{children}</span>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Property header (clickable → rename + change type + delete)
// ─────────────────────────────────────────────────────────────────────

function PropertyHeader({ prop, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(prop.name);
  useEffect(() => setName(prop.name), [prop.name]);

  const typeMeta = PROPERTY_TYPES.find(t => t.type === prop.type);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 700,
          color: N.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontFamily: 'ui-monospace, monospace', color: N.textFaint }}>{typeMeta?.icon}</span>
        {prop.name}
      </button>
      {open && (
        <>
          <div onClick={() => { setOpen(false); if (name !== prop.name) onUpdate({ name }); }} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
          <div style={{
            position: 'absolute',
            top: '24px',
            left: 0,
            zIndex: 21,
            background: 'white',
            border: `1px solid ${N.border}`,
            borderRadius: '8px',
            boxShadow: '0 14px 34px rgba(15,23,42,0.14)',
            padding: '10px',
            width: '260px',
          }}>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { onUpdate({ name }); setOpen(false); }
                if (e.key === 'Escape') { setOpen(false); }
              }}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: `1px solid ${N.border}`,
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
                marginBottom: '10px',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ fontSize: '10px', fontWeight: 700, color: N.textFaint, textTransform: 'uppercase', marginBottom: '6px' }}>
              Type
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
              {PROPERTY_TYPES.map(pt => {
                const active = pt.type === prop.type;
                return (
                  <button
                    key={pt.type}
                    onClick={() => { onUpdate({ type: pt.type, options: pt.type === 'select' ? (prop.options || []) : undefined }); setOpen(false); }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: `1px solid ${active ? N.accent : N.border}`,
                      background: active ? N.accentSoft : 'transparent',
                      fontSize: '11px',
                      color: N.text,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ fontFamily: 'ui-monospace, monospace', marginRight: '4px' }}>{pt.icon}</span>
                    {pt.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => { onDelete(); setOpen(false); }}
              style={{
                width: '100%',
                padding: '6px',
                background: 'transparent',
                border: `1px solid ${N.border}`,
                borderRadius: '6px',
                color: N.danger,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Delete property
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Add property + add view + group by controls
// ─────────────────────────────────────────────────────────────────────

function AddPropertyButton({ onAdd }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '32px',
          height: '28px',
          background: 'transparent',
          border: `1px dashed ${N.border}`,
          borderRadius: '4px',
          cursor: 'pointer',
          color: N.textMuted,
          fontFamily: 'inherit',
        }}
      >+</button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
          <div style={{
            position: 'absolute',
            top: '32px',
            right: 0,
            zIndex: 21,
            background: 'white',
            border: `1px solid ${N.border}`,
            borderRadius: '8px',
            boxShadow: '0 14px 34px rgba(15,23,42,0.14)',
            padding: '6px',
            width: '180px',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: N.textFaint, textTransform: 'uppercase', padding: '4px 8px' }}>
              Add property
            </div>
            {PROPERTY_TYPES.map(pt => (
              <button
                key={pt.type}
                onClick={() => { onAdd(pt.type); setOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '6px 10px',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: N.text,
                  fontSize: '12px',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => e.currentTarget.style.background = N.hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontFamily: 'ui-monospace, monospace', color: N.textMuted, width: '16px' }}>{pt.icon}</span>
                {pt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AddViewButton({ onAdd }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(true)}
        style={{
          ...styles.tab,
          color: N.textFaint,
          fontSize: '13px',
        }}
      >+ Add view</button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
          <div style={{
            position: 'absolute',
            top: '32px',
            left: 0,
            zIndex: 21,
            background: 'white',
            border: `1px solid ${N.border}`,
            borderRadius: '8px',
            boxShadow: '0 14px 34px rgba(15,23,42,0.14)',
            padding: '6px',
            minWidth: '160px',
          }}>
            {VIEW_TYPES.map(vt => (
              <button
                key={vt.type}
                onClick={() => { onAdd(vt.type); setOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '6px 10px',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: N.text,
                  fontSize: '12px',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => e.currentTarget.style.background = N.hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: '13px' }}>{vt.icon}</span>
                {vt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function GroupBySelect({ schema, value, onChange }) {
  const selectProps = schema.properties.filter(p => p.type === 'select');
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value || null)}
      style={{
        padding: '5px 8px',
        borderRadius: '6px',
        border: `1px solid ${N.border}`,
        background: 'white',
        color: N.textMuted,
        fontSize: '12px',
        fontFamily: 'inherit',
        cursor: 'pointer',
      }}
    >
      <option value="">Group by…</option>
      {selectProps.map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────

const styles = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 80px',
    borderBottom: `1px solid ${N.border}`,
    gap: '12px',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '10px 12px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'inherit',
    color: N.textMuted,
    marginBottom: '-1px',
    borderBottom: '2px solid transparent',
  },
  toolBtn: {
    padding: '5px 12px',
    background: N.bgAlt,
    border: `1px solid ${N.border}`,
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: N.textDim,
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  iconBtn: {
    background: 'transparent',
    border: `1px solid ${N.border}`,
    borderRadius: '6px',
    padding: '5px 10px',
    cursor: 'pointer',
    fontSize: '13px',
    color: N.textMuted,
    fontFamily: 'inherit',
  },
  tableWrap: {
    padding: '16px 80px 40px',
    overflowX: 'auto',
  },
  cell: {
    padding: '8px 14px',
    fontSize: '13px',
    color: N.text,
    minHeight: '36px',
    display: 'flex',
    alignItems: 'center',
  },
  cellInput: {
    width: '100%',
    padding: '6px 10px',
    border: 'none',
    background: 'transparent',
    fontSize: '13px',
    fontFamily: 'inherit',
    color: N.text,
    outline: 'none',
  },
  openBtn: {
    width: '22px',
    height: '22px',
    background: 'transparent',
    border: `1px solid ${N.border}`,
    borderRadius: '4px',
    cursor: 'pointer',
    color: N.textMuted,
    fontSize: '11px',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowDeleteBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: N.textFaint,
    fontSize: '12px',
    padding: '4px',
  },
  boardWrap: {
    display: 'flex',
    gap: '16px',
    padding: '20px 80px 40px',
    overflowX: 'auto',
  },
  boardColumn: {
    flex: '0 0 280px',
    background: N.bgAlt,
    borderRadius: '10px',
    padding: '10px',
  },
  addCardBtn: {
    width: '100%',
    padding: '8px',
    background: 'transparent',
    border: `1px dashed ${N.border}`,
    borderRadius: '6px',
    color: N.textFaint,
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  galleryWrap: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px',
    padding: '20px 80px 40px',
  },
  galleryAddBtn: {
    background: 'transparent',
    border: `1px dashed ${N.border}`,
    borderRadius: '10px',
    padding: '40px',
    fontSize: '13px',
    color: N.textFaint,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  emptyView: {
    padding: '60px 20px',
    textAlign: 'center',
    color: N.textMuted,
    fontSize: '14px',
  },
};
