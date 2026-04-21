// =====================================================================
// WebsiteEditor.stubs — left-rail panels for slots that don't have a
// full implementation yet. Every panel fills the 240 px sidebar space
// and either shows a real tool (site Settings, global Search) or an
// empty-state that explains what will live there so there are no
// dead icon clicks.
//
// Design rule: never a no-op. If a feature isn't built, the panel
// still changes visibly and tells the user what's coming and what to
// do in the meantime.
// =====================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';

// ---- Shared chrome --------------------------------------------------

const P = {
  bg:          '#2a2a2a',
  border:      '#2a2a2a',
  headerBg:    '#2a2a2a',
  text:        '#e5e5e5',
  textDim:     '#a0a0a0',
  textFaint:   '#6a6a6a',
  rowHover:    '#333',
  accent:      '#146ef5',
  labelSize:   '11px',
  labelLetter: '0.05em',
};

function panelShell(children, { title, headerExtras } = {}) {
  return (
    <div style={{
      width: '240px', flexShrink: 0,
      background: P.bg,
      borderRight: `1px solid ${P.border}`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        height: '32px', flexShrink: 0,
        padding: '0 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${P.border}`,
        color: P.textDim, fontSize: P.labelSize, fontWeight: 600,
        letterSpacing: P.labelLetter, textTransform: 'uppercase',
      }}>
        <span>{title}</span>
        {headerExtras || null}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
    </div>
  );
}

function EmptyState({ title, body, cta }) {
  return (
    <div style={{
      padding: '32px 16px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <div style={{ color: P.text, fontSize: '13px', fontWeight: 600 }}>{title}</div>
      <div style={{ color: P.textDim, fontSize: '11.5px', lineHeight: 1.55 }}>{body}</div>
      {cta && <div style={{ marginTop: '6px' }}>{cta}</div>}
    </div>
  );
}

// ComponentsPanel moved to WebsiteEditor.components.js (Phase E).

// AssetsPanel moved to WebsiteEditor.assets.js (Phase C).

// ---- Interactions rail panel ----------------------------------------
// Different from the per-element Interactions tab in the right panel —
// this is a site-wide interaction list. Currently a pointer to the
// working per-element tab.

export function InteractionsListPanel() {
  return panelShell(
    <EmptyState
      title="Site interactions"
      body={<>
        Select any element on the canvas, then open the <strong style={{ color: P.text }}>Interactions</strong> tab in the right panel to add scroll, hover, click, or load animations.
      </>}
    />,
    { title: 'Interactions' }
  );
}

// ---- Variables panel ------------------------------------------------
// Phase 4 put variable modes (light/dark) into content.active_mode;
// this panel surfaces the two defined modes and leaves "Add variable"
// disabled until the fuller design system lands.

export function VariablesPanel({ content }) {
  const modes = content?.modes || { light: {}, dark: {} };
  const active = content?.active_mode || 'light';
  return panelShell(
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ color: P.textDim, fontSize: '10.5px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Modes
      </div>
      {Object.keys(modes).map((m) => (
        <div key={m} style={{
          padding: '8px 10px',
          border: `1px solid ${m === active ? P.accent : P.border}`,
          borderRadius: '3px',
          color: P.text, fontSize: '12px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{m}</span>
          {m === active && (
            <span style={{ color: P.accent, fontSize: '10.5px' }}>ACTIVE</span>
          )}
        </div>
      ))}
      <button
        disabled
        style={{
          marginTop: '4px', padding: '8px', fontSize: '12px', fontWeight: 600,
          background: '#333', color: P.textFaint,
          border: `1px solid ${P.border}`, borderRadius: '3px',
          cursor: 'not-allowed',
        }}
        title="Coming soon"
      >
        + Add variable
      </button>
      <div style={{ color: P.textFaint, fontSize: '11px', lineHeight: 1.5 }}>
        Full variables UI lands with the design-system pass. Define brand colors in the Settings panel for now.
      </div>
    </div>,
    { title: 'Variables' }
  );
}

// ---- CMS / Ecommerce — pure coming-soon stubs ------------------------

export function CMSPanel() {
  return panelShell(
    <EmptyState
      title="CMS — coming soon"
      body={<>
        Collections, items, and dynamic bindings will live here. See the Phase I roadmap in the project brief.
      </>}
    />,
    { title: 'CMS' }
  );
}

export function EcommercePanel() {
  return panelShell(
    <EmptyState
      title="Ecommerce — coming soon"
      body={<>
        Products, categories, and checkout flows will live here once the store backend is wired up.
      </>}
    />,
    { title: 'Ecommerce' }
  );
}

// ---- Site settings --------------------------------------------------
// Real panel: edits content.brand.* (site name, logo, favicon) and
// content.global_css.head/body. Persists via the same patch helper
// used for page meta edits.

export function SiteSettingsPanel({ content, onPatch }) {
  const brand = content?.brand || {};
  const globalCss = content?.global_css || { head: '', body: '' };
  const update = (path, value) => onPatch?.(path, value);

  return panelShell(
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Section title="Site">
        <Field label="Site name">
          <Input
            value={brand.name || ''}
            onChange={(v) => update(['brand', 'name'], v)}
          />
        </Field>
        <Field label="Favicon URL">
          <Input
            value={brand.favicon_url || ''}
            onChange={(v) => update(['brand', 'favicon_url'], v)}
            placeholder="/favicon.ico"
          />
        </Field>
        <Field label="Site URL">
          <Input
            value={brand.site_url || ''}
            onChange={(v) => update(['brand', 'site_url'], v)}
            placeholder="https://example.com"
          />
        </Field>
      </Section>
      <Section title="Global code">
        <Field label="<head> code">
          <Textarea
            value={globalCss.head || ''}
            onChange={(v) => update(['global_css', 'head'], v)}
            placeholder="Analytics, fonts, meta tags…"
          />
        </Field>
        <Field label="Before </body>">
          <Textarea
            value={globalCss.body || ''}
            onChange={(v) => update(['global_css', 'body'], v)}
            placeholder="Chat widgets, tracking pixels…"
          />
        </Field>
      </Section>
    </div>,
    { title: 'Settings' }
  );
}

function Section({ title, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{
        color: P.textDim, fontSize: '10.5px',
        letterSpacing: '0.05em', textTransform: 'uppercase',
      }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ color: P.textDim, fontSize: '10.5px' }}>{label}</span>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value || ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: '#1e1e1e', color: P.text,
        border: `1px solid ${P.border}`, borderRadius: '3px',
        padding: '6px 8px', fontSize: '12px',
        fontFamily: 'ui-monospace, monospace',
      }}
    />
  );
}

function Textarea({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value || ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      style={{
        background: '#1e1e1e', color: P.text,
        border: `1px solid ${P.border}`, borderRadius: '3px',
        padding: '6px 8px', fontSize: '11.5px',
        fontFamily: 'ui-monospace, monospace',
        resize: 'vertical',
      }}
    />
  );
}

// ---- Search / Command palette --------------------------------------
// Two surfaces: a sidebar panel that lists the same results inline,
// and an overlay triggered by Cmd+K (handled from WebsiteEditor.js).

export function SearchPanel({ content, tree, onSelect, onPickPage }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(
    () => buildSearchResults({ content, tree, q }),
    [content, tree, q]
  );

  return panelShell(
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <input
        ref={inputRef}
        type="text"
        value={q}
        placeholder="Find elements, classes, pages…"
        onChange={(e) => setQ(e.target.value)}
        style={{
          background: '#1e1e1e', color: P.text,
          border: `1px solid ${P.border}`, borderRadius: '3px',
          padding: '6px 8px', fontSize: '12px',
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {results.length === 0 && (
          <div style={{ color: P.textFaint, fontSize: '11.5px', padding: '12px 4px' }}>
            {q ? 'No matches.' : 'Type to search.'}
          </div>
        )}
        {results.map((r) => (
          <button
            key={r.kind + ':' + r.id}
            onClick={() => {
              if (r.kind === 'page') onPickPage?.(r.id);
              else onSelect?.(r.id);
            }}
            style={{
              textAlign: 'left', background: 'transparent',
              color: P.text, border: 'none', cursor: 'pointer',
              padding: '6px 8px', fontSize: '12px',
              display: 'flex', alignItems: 'center', gap: '8px',
              borderRadius: '3px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = P.rowHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{
              color: P.textFaint, fontSize: '10px',
              width: '44px', textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>{r.kind}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.label}
            </span>
          </button>
        ))}
      </div>
      <div style={{ color: P.textFaint, fontSize: '10.5px', marginTop: '4px' }}>
        Tip: ⌘K opens this from anywhere.
      </div>
    </div>,
    { title: 'Search' }
  );
}

// Shared search index. Returns at most 30 results so the list stays
// readable in both surfaces.
export function buildSearchResults({ content, tree, q }) {
  const query = (q || '').trim().toLowerCase();
  if (!query && !content) return [];
  const out = [];
  // Pages
  for (const [key, page] of Object.entries(content?.pages || {})) {
    const label = page?.name || key;
    if (!query || label.toLowerCase().includes(query) || key.includes(query)) {
      out.push({ kind: 'page', id: key, label });
    }
  }
  // Classes
  for (const name of Object.keys(content?.classes || {})) {
    if (!query || name.toLowerCase().includes(query)) {
      out.push({ kind: 'class', id: name, label: `.${name}` });
    }
  }
  // Current-page nodes — walk shallowly; tags + first class name are
  // enough for a Cmd+K hit.
  const walk = (n) => {
    if (!n) return;
    const cls = Array.isArray(n.classes) && n.classes[0];
    const label = `${n.tag || 'node'}${cls ? '.' + cls : ''}`;
    if (!query || label.toLowerCase().includes(query)) {
      out.push({ kind: 'node', id: n.id, label });
    }
    (n.children || []).forEach(walk);
  };
  if (tree) walk(tree);
  return out.slice(0, 30);
}

export function CommandPalette({ open, onClose, content, tree, onSelect, onPickPage }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQ('');
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose?.(); e.stopPropagation(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  const results = useMemo(
    () => buildSearchResults({ content, tree, q }),
    [content, tree, q]
  );

  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '520px', maxWidth: '90vw',
          background: '#222', border: `1px solid ${P.border}`,
          borderRadius: '6px', boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={q}
          placeholder="Find elements, classes, pages…"
          onChange={(e) => setQ(e.target.value)}
          style={{
            background: 'transparent', color: P.text,
            border: 'none', borderBottom: `1px solid ${P.border}`,
            padding: '14px 16px', fontSize: '14px', outline: 'none',
          }}
        />
        <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          {results.length === 0 && (
            <div style={{ color: P.textFaint, fontSize: '12px', padding: '16px' }}>
              {q ? 'No matches.' : 'Type to search pages, classes, and elements.'}
            </div>
          )}
          {results.map((r) => (
            <button
              key={r.kind + ':' + r.id}
              onClick={() => {
                if (r.kind === 'page') onPickPage?.(r.id);
                else onSelect?.(r.id);
                onClose?.();
              }}
              style={{
                width: '100%', textAlign: 'left',
                background: 'transparent', color: P.text,
                border: 'none', cursor: 'pointer',
                padding: '10px 16px', fontSize: '13px',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = P.rowHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{
                color: P.textFaint, fontSize: '10.5px',
                width: '56px', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>{r.kind}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Help — shortcut sheet ------------------------------------------

const SHORTCUTS = [
  { group: 'Selection', items: [
    ['Esc',         'Select parent'],
    ['Enter',       'Select first child'],
    ['↑ / ↓',       'Previous / next in tree'],
    ['Tab / ⇧Tab',  'Next / previous sibling'],
  ]},
  { group: 'Editing', items: [
    ['Double-click', 'Edit text inline'],
    ['⌘D',           'Duplicate selection'],
    ['⌘C / ⌘V',      'Copy / paste element'],
    ['⌫ / Delete',   'Remove selection'],
    ['⌘Z / ⇧⌘Z',     'Undo / redo'],
  ]},
  { group: 'Navigation', items: [
    ['⌘K',          'Open command palette'],
    ['?',           'Open this help sheet'],
  ]},
];

export function HelpPanel() {
  return panelShell(
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {SHORTCUTS.map((g) => (
        <div key={g.group} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{
            color: P.textDim, fontSize: '10.5px',
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>{g.group}</div>
          {g.items.map(([key, desc]) => (
            <div key={key} style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', fontSize: '11.5px',
              color: P.text,
            }}>
              <span style={{ color: P.textDim }}>{desc}</span>
              <kbd style={{
                background: '#1e1e1e', color: P.text,
                border: `1px solid ${P.border}`,
                padding: '2px 6px', borderRadius: '3px',
                fontSize: '11px', fontFamily: 'ui-monospace, monospace',
              }}>{key}</kbd>
            </div>
          ))}
        </div>
      ))}
    </div>,
    { title: 'Help' }
  );
}
