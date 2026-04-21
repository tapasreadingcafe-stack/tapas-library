// =====================================================================
// CMSPanel — Phase I1 left-rail panel.
//
// Three views in a single panel:
//   * root         — list of collections + "+ New collection"
//   * schema       — edit field definitions on a collection
//   * items        — list + create / edit / publish items
//
// Every mutation writes straight to Supabase through ../utils/cms.js
// and refetches; no optimistic UI for simplicity. The panel is scoped
// to 240px so field editors intentionally stay tight and terse.
//
// Dynamic bindings (collection_list block + `{{field}}` binding
// pickers) land in the follow-up pass. This file sets up the data
// layer and the authoring surface.
// =====================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  listCollections, createCollection, deleteCollection, updateCollection,
  listItems, createItem, updateItem, deleteItem,
  makeField, coerceFieldValue, FIELD_TYPES,
} from '../utils/cms';

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
  input:       '#1a1a1a',
  inputBorder: '#3a3a3a',
  labelSize:   '11px',
  labelLetter: '0.05em',
};

export default function CMSPanel() {
  const [view, setView] = useState({ kind: 'root' });
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setErr('');
    try { setCollections(await listCollections()); }
    catch (e) { setErr(e.message || String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div style={{
      width: '240px', flexShrink: 0,
      background: P.bg,
      borderRight: `1px solid ${P.border}`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <Header view={view} setView={setView} refresh={refresh} collections={collections} />
      {err && <ErrorBanner>⚠ {err}</ErrorBanner>}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {view.kind === 'root' && (
          <RootView
            collections={collections}
            loading={loading}
            onOpen={(id) => setView({ kind: 'items', id })}
            onEditSchema={(id) => setView({ kind: 'schema', id })}
            onCreate={async () => {
              const name = window.prompt('Collection name:', 'Untitled');
              if (!name) return;
              try { await createCollection({ name }); refresh(); }
              catch (e) { setErr(e.message || String(e)); }
            }}
            onDelete={async (id, name) => {
              if (!window.confirm(`Delete collection "${name}" and all its items?`)) return;
              try { await deleteCollection(id); refresh(); }
              catch (e) { setErr(e.message || String(e)); }
            }}
          />
        )}
        {view.kind === 'schema' && (
          <SchemaView
            collection={collections.find((c) => c.id === view.id)}
            onBack={() => setView({ kind: 'root' })}
            onSave={async (patch) => {
              try {
                await updateCollection(view.id, patch);
                refresh();
              } catch (e) { setErr(e.message || String(e)); }
            }}
          />
        )}
        {view.kind === 'items' && (
          <ItemsView
            collection={collections.find((c) => c.id === view.id)}
            onBack={() => setView({ kind: 'root' })}
            onError={(m) => setErr(m)}
          />
        )}
      </div>
    </div>
  );
}

function Header({ view, setView, refresh }) {
  const title = view.kind === 'root' ? 'CMS'
              : view.kind === 'schema' ? 'Schema'
              : 'Items';
  return (
    <div style={{
      height: '32px', flexShrink: 0,
      padding: '0 12px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: `1px solid ${P.border}`,
      color: P.textDim, fontSize: P.labelSize, fontWeight: 600,
      letterSpacing: P.labelLetter, textTransform: 'uppercase',
    }}>
      {view.kind !== 'root' ? (
        <button
          onClick={() => setView({ kind: 'root' })}
          style={{
            background: 'transparent', color: P.textDim,
            border: 'none', cursor: 'pointer',
            fontSize: '11px', padding: 0,
          }}
        >‹ Back</button>
      ) : <span>{title}</span>}
      <div style={{ display: 'flex', gap: '6px' }}>
        {view.kind !== 'root' && (
          <span style={{ color: P.textFaint, fontWeight: 500, letterSpacing: 0, textTransform: 'none' }}>
            {title}
          </span>
        )}
        <button
          onClick={refresh} title="Refresh"
          style={iconBtn()}
        >↻</button>
      </div>
    </div>
  );
}

function ErrorBanner({ children }) {
  return (
    <div style={{
      padding: '6px 12px',
      background: '#3a1f1f', color: '#ff9a9a',
      borderBottom: `1px solid ${P.border}`,
      fontSize: '11px',
    }}>{children}</div>
  );
}

function iconBtn() {
  return {
    width: '22px', height: '22px', padding: 0,
    background: 'transparent', color: P.textDim,
    border: `1px solid ${P.inputBorder}`, borderRadius: '3px',
    fontSize: '13px', cursor: 'pointer',
  };
}

// ---------------------------------------------------------------------
// RootView — list of collections
// ---------------------------------------------------------------------
function RootView({ collections, loading, onOpen, onEditSchema, onCreate, onDelete }) {
  return (
    <div style={{ padding: '6px 0' }}>
      {loading && <Empty>Loading…</Empty>}
      {!loading && collections.length === 0 && (
        <Empty>
          No collections yet. A collection is a content type (Books, Team, Events, …).
        </Empty>
      )}
      {collections.map((c) => (
        <div key={c.id} style={{
          padding: '8px 10px', borderBottom: `1px solid ${P.border}`,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            color: P.text, fontSize: '12px', fontWeight: 600,
          }}>
            <span style={{ color: P.accent, fontSize: '10px' }}>▦</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.name}
            </span>
            <span style={{ color: P.textFaint, fontSize: '10.5px', fontWeight: 500 }}>
              /{c.slug}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
            <Btn onClick={() => onOpen(c.id)}>Items</Btn>
            <Btn onClick={() => onEditSchema(c.id)}>Schema</Btn>
            <Btn danger onClick={() => onDelete(c.id, c.name)}>Delete</Btn>
          </div>
        </div>
      ))}
      <div style={{ padding: '10px 12px' }}>
        <button
          onClick={onCreate}
          style={{
            width: '100%', padding: '6px',
            background: P.accentDim, color: P.accent,
            border: `1px solid ${P.accent}`, borderRadius: '3px',
            fontSize: '11px', fontWeight: 700, cursor: 'pointer',
          }}
        >+ New collection</button>
      </div>
    </div>
  );
}

function Btn({ children, onClick, primary, danger, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '3px 8px', fontSize: '10.5px', fontWeight: 600,
        background: primary ? P.accentDim : 'transparent',
        color:      primary ? P.accent
                  : danger  ? '#ff9a9a'
                  : disabled ? P.textFaint
                  : P.text,
        border: `1px solid ${primary ? P.accent : P.inputBorder}`,
        borderRadius: '3px',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >{children}</button>
  );
}

function Empty({ children }) {
  return (
    <div style={{
      padding: '24px 16px', color: P.textDim, fontSize: '11.5px',
      lineHeight: 1.55, textAlign: 'center',
    }}>{children}</div>
  );
}

// ---------------------------------------------------------------------
// SchemaView — edit field definitions on a collection
// ---------------------------------------------------------------------
function SchemaView({ collection, onBack, onSave }) {
  const [fields, setFields] = useState(() => collection?.fields || []);
  useEffect(() => { setFields(collection?.fields || []); }, [collection?.id]);
  if (!collection) return <Empty>Collection not found.</Empty>;

  const update = (i, patch) => {
    const next = fields.slice();
    next[i] = { ...next[i], ...patch };
    setFields(next);
  };
  const remove = (i) => {
    const next = fields.slice(); next.splice(i, 1); setFields(next);
  };
  const add = () => setFields([...fields, makeField({})]);

  // Detect collisions: two labels that normalise to the same snake_
  // case key silently overwrote each other in `data` before. Surface
  // the collision inline so staff see + fix it instead of losing
  // data on publish.
  const keyCounts = fields.reduce((acc, f) => {
    const k = (f.key || '').trim();
    if (!k) return acc;
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const collidingKeys = new Set(Object.keys(keyCounts).filter((k) => keyCounts[k] > 1));
  const blankKey = fields.some((f) => !(f.key || '').trim());
  const canSave = collidingKeys.size === 0 && !blankKey;

  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ color: P.text, fontSize: '12.5px', fontWeight: 700 }}>
        {collection.name}
      </div>
      {fields.length === 0 && (
        <Empty>No fields yet. Add one below.</Empty>
      )}
      {fields.map((f, i) => {
        const collides = collidingKeys.has((f.key || '').trim());
        return (
          <div key={i} style={{
            padding: '8px', background: '#1f1f1f',
            border: `1px solid ${collides ? '#9a3a3a' : P.inputBorder}`, borderRadius: '3px',
            display: 'flex', flexDirection: 'column', gap: '4px',
          }}>
            <Input
              value={f.label}
              onChange={(v) => update(i, { label: v, key: (f.key || v).replace(/[^a-z0-9_]/gi, '_').toLowerCase() })}
              placeholder="Field label"
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              <Select
                value={f.type}
                onChange={(v) => update(i, { type: v })}
                options={FIELD_TYPES}
              />
              <button onClick={() => remove(i)} style={iconBtn()} title="Remove">×</button>
            </div>
            <div style={{ color: collides ? '#ff9a9a' : P.textFaint, fontSize: '10.5px' }}>
              key: <code>{f.key || '(empty)'}</code>
              {collides && ' · ⚠ duplicate key — rename to avoid losing data'}
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={add} style={primaryButton()}>+ Field</button>
        <button
          onClick={() => canSave && onSave({ fields })}
          disabled={!canSave}
          style={{
            ...saveButton(),
            opacity: canSave ? 1 : 0.4,
            cursor: canSave ? 'pointer' : 'not-allowed',
          }}
          title={!canSave
            ? (blankKey ? 'Fix blank field keys first' : 'Fix duplicate keys first')
            : 'Save schema'}
        >Save schema</button>
      </div>
      <div style={{ padding: '2px 0' }}>
        <button onClick={onBack} style={linkButton()}>← Back to collections</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// ItemsView — list / create / publish items for a collection
// ---------------------------------------------------------------------
function ItemsView({ collection, onBack, onError }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // item id
  const [query, setQuery] = useState('');

  const refresh = useCallback(async () => {
    if (!collection) return;
    setLoading(true);
    try { setItems(await listItems(collection.id)); }
    catch (e) { onError(e.message || String(e)); }
    finally { setLoading(false); }
  }, [collection, onError]);

  useEffect(() => { refresh(); }, [refresh]);

  // Filter across slug, title, and all stringy field values so a
  // fuzzy search works the same as Webflow's collection-list filter.
  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      if ((it.slug || '').toLowerCase().includes(q)) return true;
      const data = it.data || {};
      for (const v of Object.values(data)) {
        if (typeof v === 'string' && v.toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [items, query]);

  if (!collection) return <Empty>Collection not found.</Empty>;

  const current = editing ? items.find((it) => it.id === editing) : null;

  if (current) {
    return (
      <ItemEditor
        collection={collection}
        item={current}
        onBack={() => setEditing(null)}
        onSave={async (patch) => {
          try {
            await updateItem(current.id, patch);
            await refresh();
          } catch (e) { onError(e.message || String(e)); }
        }}
      />
    );
  }

  return (
    <div style={{ padding: '6px 0' }}>
      <div style={{ padding: '0 12px 8px', color: P.text, fontSize: '12.5px', fontWeight: 700 }}>
        {collection.name}
      </div>
      {items.length > 0 && (
        <div style={{ padding: '0 12px 8px' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${items.length} item${items.length === 1 ? '' : 's'}…`}
            style={{
              width: '100%', height: '24px',
              padding: '0 8px',
              background: P.input, color: P.text,
              border: `1px solid ${P.inputBorder}`, borderRadius: '3px',
              fontSize: '11.5px',
            }}
          />
        </div>
      )}
      {loading && <Empty>Loading…</Empty>}
      {!loading && items.length === 0 && (
        <Empty>No items yet. Create one below.</Empty>
      )}
      {!loading && items.length > 0 && visibleItems.length === 0 && (
        <Empty>No items match "{query}".</Empty>
      )}
      {visibleItems.map((it) => (
        <div key={it.id} style={{
          padding: '8px 12px', borderTop: `1px solid ${P.border}`,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            color: P.text, fontSize: '12px', fontWeight: 500,
          }}>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {it.data?.title || it.slug}
            </span>
            <span style={{
              color: it.status === 'published' ? '#86e08b' : P.textFaint,
              fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {it.status}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
            <Btn onClick={() => setEditing(it.id)}>Edit</Btn>
            <Btn
              disabled={it.status !== 'published' && !(it.slug || '').trim()}
              onClick={async () => {
                // Publishing without a slug would produce a broken
                // /collection/<slug> link on the storefront, so guard
                // at the UI layer. Unpublish is always OK.
                if (it.status !== 'published' && !(it.slug || '').trim()) {
                  onError('Cannot publish: slug is empty. Open the item and set one.');
                  return;
                }
                try {
                  await updateItem(it.id, {
                    status: it.status === 'published' ? 'draft' : 'published',
                  });
                  refresh();
                } catch (e) { onError(e.message || String(e)); }
              }}
            >
              {it.status === 'published' ? 'Unpublish' : 'Publish'}
            </Btn>
            <Btn danger onClick={async () => {
              if (!window.confirm(`Delete "${it.data?.title || it.slug}"?`)) return;
              try { await deleteItem(it.id); refresh(); }
              catch (e) { onError(e.message || String(e)); }
            }}>Delete</Btn>
          </div>
        </div>
      ))}
      <div style={{ padding: '10px 12px', display: 'flex', gap: '6px' }}>
        <button
          onClick={async () => {
            try {
              const item = await createItem(collection.id, { title: 'Untitled' });
              await refresh();
              setEditing(item.id);
            } catch (e) { onError(e.message || String(e)); }
          }}
          style={primaryButton()}
        >+ New item</button>
        <button onClick={onBack} style={linkButton()}>← Back</button>
      </div>
    </div>
  );
}

function ItemEditor({ collection, item, onBack, onSave }) {
  const [draft, setDraft] = useState(item.data || {});
  const [slug, setSlug] = useState(item.slug);
  useEffect(() => { setDraft(item.data || {}); setSlug(item.slug); }, [item.id]);

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ color: P.text, fontSize: '12.5px', fontWeight: 700 }}>
        {collection.name}
      </div>
      <Row label="Slug">
        <Input value={slug} onChange={setSlug} placeholder="slug-here" />
      </Row>
      {(collection.fields || []).map((f) => (
        <FieldInput
          key={f.key}
          field={f}
          value={draft[f.key]}
          onChange={(v) => setField(f.key, coerceFieldValue(f.type, v))}
        />
      ))}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={() => onSave({ slug, data: draft })}
          style={saveButton()}
        >Save draft</button>
        <button onClick={onBack} style={linkButton()}>← Back</button>
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange }) {
  const label = field.label || field.key;
  switch (field.type) {
    case 'boolean':
      return (
        <Row label={label}>
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
        </Row>
      );
    case 'number':
      return (
        <Row label={label}>
          <NumberField
            value={value}
            onCommit={onChange}
            placeholder="0"
          />
        </Row>
      );
    case 'rich_text':
      return (
        <Row label={label} stack>
          <Textarea value={value || ''} onChange={onChange} />
        </Row>
      );
    case 'color':
      return (
        <Row label={label}>
          <input
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: '100%', height: '22px', padding: 0, background: 'transparent', border: `1px solid ${P.inputBorder}`, borderRadius: '3px' }}
          />
        </Row>
      );
    default:
      return (
        <Row label={label}>
          <Input
            value={value || ''}
            onChange={onChange}
            placeholder={label}
          />
        </Row>
      );
  }
}

function Row({ label, children, stack }) {
  return (
    <label style={{
      display: stack ? 'flex' : 'flex',
      flexDirection: stack ? 'column' : 'row',
      gap: stack ? '2px' : '8px',
      alignItems: stack ? 'stretch' : 'center',
    }}>
      <span style={{
        color: P.textDim, fontSize: '10.5px',
        width: stack ? 'auto' : '72px',
        flexShrink: 0,
      }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </label>
  );
}

function Input({ value, onChange, placeholder, inputMode }) {
  return (
    <input
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      style={{
        width: '100%', height: '22px',
        padding: '0 6px',
        background: P.input, color: P.text,
        border: `1px solid ${P.inputBorder}`, borderRadius: '3px',
        fontSize: '11px', fontFamily: 'ui-monospace, monospace',
      }}
    />
  );
}

// Numeric input that lets the user type partial decimals like "1." or
// "-" without immediately coercing the raw string to NaN. The buffered
// draft only commits as a Number on blur / Enter. Blank clears to null
// so the stored blob doesn't carry empty-string numbers.
function NumberField({ value, onCommit, placeholder }) {
  const [draft, setDraft] = useState(value == null ? '' : String(value));
  const lastRef = useRef(value == null ? '' : String(value));
  useEffect(() => {
    const v = value == null ? '' : String(value);
    if (v !== lastRef.current) {
      setDraft(v);
      lastRef.current = v;
    }
  }, [value]);
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      if (lastRef.current === '') return;
      lastRef.current = '';
      onCommit(null);
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n)) { setDraft(lastRef.current); return; }
    const canonical = String(n);
    if (canonical === lastRef.current) return;
    lastRef.current = canonical;
    setDraft(canonical);
    onCommit(n);
  };
  return (
    <input
      value={draft}
      placeholder={placeholder}
      inputMode="decimal"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter')  { e.currentTarget.blur(); }
        if (e.key === 'Escape') { setDraft(lastRef.current); e.currentTarget.blur(); }
      }}
      style={{
        width: '100%', height: '22px',
        padding: '0 6px',
        background: P.input, color: P.text,
        border: `1px solid ${P.inputBorder}`, borderRadius: '3px',
        fontSize: '11px', fontFamily: 'ui-monospace, monospace',
      }}
    />
  );
}

function Textarea({ value, onChange }) {
  return (
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      style={{
        width: '100%',
        padding: '6px',
        background: P.input, color: P.text,
        border: `1px solid ${P.inputBorder}`, borderRadius: '3px',
        fontSize: '11px', fontFamily: 'ui-monospace, monospace',
        resize: 'vertical',
      }}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      style={{
        flex: 1, height: '22px',
        background: P.input, color: P.text,
        border: `1px solid ${P.inputBorder}`, borderRadius: '3px',
        fontSize: '11px',
      }}
    >
      {options.map((o) => (
        <option key={o.key} value={o.key}>{o.label}</option>
      ))}
    </select>
  );
}

function primaryButton() {
  return {
    flex: 1, padding: '6px',
    background: P.accentDim, color: P.accent,
    border: `1px solid ${P.accent}`, borderRadius: '3px',
    fontSize: '11px', fontWeight: 700, cursor: 'pointer',
  };
}
function saveButton() {
  return {
    flex: 1, padding: '6px',
    background: P.accent, color: '#fff',
    border: `1px solid ${P.accent}`, borderRadius: '3px',
    fontSize: '11px', fontWeight: 700, cursor: 'pointer',
  };
}
function linkButton() {
  return {
    padding: '4px 0',
    background: 'transparent', color: P.textDim,
    border: 'none', cursor: 'pointer',
    fontSize: '11px',
  };
}
