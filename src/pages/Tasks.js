import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// Tasks — Notion-like workspace for notes, todos, task management, and
// shopping lists. Single `tasks_pages` table with JSONB block arrays.
//
// Layout (3 panes):
//   LEFT   Workspaces → pages list with new / rename / delete
//   MIDDLE Page header (emoji + title) and block editor
//   RIGHT  (collapsed by default — could host comments or backlinks)
//
// Block types:
//   heading1 / heading2 / heading3   plain headings
//   text                              paragraph
//   todo                              checkbox + text
//   bullet                            bulleted list item
//   numbered                          numbered list item
//   quote                             block quote
//   divider                           horizontal rule
//
// Interactions:
//   Enter           split into a new block of the same type
//   Shift+Enter     insert a newline inside the block
//   Backspace @0    merge into previous block (or remove if empty)
//   /               slash menu (not implemented — we ship a toolbar)
//   Tab / Shift+Tab indent / outdent within bullet/numbered lists
// =====================================================================

const WORKSPACES = [
  { key: 'work',     label: 'Work',     icon: '💼', desc: 'Shared with all staff' },
  { key: 'personal', label: 'Personal', icon: '👤', desc: 'Private to you' },
  { key: 'shopping', label: 'Shopping', icon: '🛒', desc: 'Shared lists' },
  { key: 'ideas',    label: 'Ideas',    icon: '💡', desc: 'Notes + drafts' },
];

const BLOCK_TYPES = [
  { type: 'text',       label: 'Text',            icon: 'T',   hint: 'Just start writing with plain text.' },
  { type: 'heading1',   label: 'Heading 1',       icon: 'H1',  hint: 'Big section heading.' },
  { type: 'heading2',   label: 'Heading 2',       icon: 'H2',  hint: 'Medium section heading.' },
  { type: 'heading3',   label: 'Heading 3',       icon: 'H3',  hint: 'Small section heading.' },
  { type: 'todo',       label: 'To-do list',      icon: '☐',   hint: 'Track tasks with a checkbox.' },
  { type: 'bullet',     label: 'Bulleted list',   icon: '•',   hint: 'Create a simple bulleted list.' },
  { type: 'numbered',   label: 'Numbered list',   icon: '1.',  hint: 'Create a list with numbering.' },
  { type: 'quote',      label: 'Quote',           icon: '"',   hint: 'Capture a quote.' },
  { type: 'divider',    label: 'Divider',         icon: '—',   hint: 'Visual divider.' },
];

const uid = () => Math.random().toString(36).slice(2, 10);

function newBlock(type = 'text', content = '') {
  return { id: uid(), type, content, checked: false, indent: 0 };
}

const PAGE_TEMPLATES = {
  work:     { icon: '📋', title: 'Work notes',    blocks: [newBlock('heading1', 'Work notes'), newBlock('text', 'Start jotting down meeting notes, decisions, or anything you want to come back to.')] },
  personal: { icon: '📝', title: 'Personal',      blocks: [newBlock('heading1', 'Personal'),    newBlock('text', 'This page is visible only to you.')] },
  shopping: { icon: '🛒', title: 'Shopping list', blocks: [newBlock('heading1', 'Shopping list'), newBlock('todo', 'Filter coffee beans'), newBlock('todo', 'Stationery for events'), newBlock('todo', 'Member welcome cards')] },
  ideas:    { icon: '💡', title: 'Ideas',         blocks: [newBlock('heading1', 'Ideas'),       newBlock('bullet', 'Book club theme for next month'), newBlock('bullet', 'Monsoon-reading playlist')] },
};

// =====================================================================
// Main component
// =====================================================================

export default function Tasks() {
  const { staff } = useAuth();

  const [pages, setPages] = useState([]);
  const [activePageId, setActivePageId] = useState(null);
  const [activeWorkspace, setActiveWorkspace] = useState('work');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState('');
  const saveTimerRef = useRef(null);

  // ── Load pages from DB ─────────────────────────────────────────────
  const loadPages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('tasks_pages')
        .select('*')
        .eq('archived', false)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (err) throw err;
      setPages(data || []);
      if (data && data.length && !activePageId) {
        setActivePageId(data[0].id);
        setActiveWorkspace(data[0].workspace);
      }
    } catch (e) {
      setError(e.message || 'Failed to load pages.');
    } finally {
      setLoading(false);
    }
  }, [activePageId]);

  useEffect(() => { loadPages(); /* eslint-disable-next-line */ }, []);

  // ── Derived data ───────────────────────────────────────────────────
  const activePage = useMemo(
    () => pages.find(p => p.id === activePageId) || null,
    [pages, activePageId]
  );

  const pagesByWorkspace = useMemo(() => {
    const m = { work: [], personal: [], shopping: [], ideas: [] };
    for (const p of pages) {
      if (m[p.workspace]) m[p.workspace].push(p);
    }
    return m;
  }, [pages]);

  // ── Debounced autosave ─────────────────────────────────────────────
  const persistPage = useCallback(async (page) => {
    try {
      setSaving(true);
      const { error: err } = await supabase
        .from('tasks_pages')
        .update({
          title: page.title,
          icon: page.icon,
          blocks: page.blocks,
        })
        .eq('id', page.id);
      if (err) throw err;
      setSavedAt(new Date());
    } catch (e) {
      setError(e.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }, []);

  const updateActivePage = useCallback((mutator) => {
    setPages(prev => {
      const next = prev.map(p =>
        p.id === activePageId ? { ...p, ...mutator(p) } : p
      );
      const active = next.find(p => p.id === activePageId);
      if (active) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => persistPage(active), 700);
      }
      return next;
    });
  }, [activePageId, persistPage]);

  // ── Page actions ───────────────────────────────────────────────────
  const createPage = async (workspace) => {
    try {
      const tpl = PAGE_TEMPLATES[workspace] || PAGE_TEMPLATES.personal;
      const { data, error: err } = await supabase
        .from('tasks_pages')
        .insert({
          owner_id: staff?.id || null,
          workspace,
          title: tpl.title,
          icon: tpl.icon,
          blocks: tpl.blocks,
          sort_order: (pagesByWorkspace[workspace]?.length || 0) + 1,
        })
        .select()
        .single();
      if (err) throw err;
      setPages(prev => [...prev, data]);
      setActiveWorkspace(workspace);
      setActivePageId(data.id);
    } catch (e) {
      setError(e.message || 'Failed to create page.');
    }
  };

  const deletePage = async (id) => {
    if (!window.confirm('Delete this page? This cannot be undone.')) return;
    try {
      const { error: err } = await supabase
        .from('tasks_pages')
        .delete()
        .eq('id', id);
      if (err) throw err;
      setPages(prev => prev.filter(p => p.id !== id));
      if (activePageId === id) {
        const remaining = pages.filter(p => p.id !== id && p.workspace === activeWorkspace);
        setActivePageId(remaining[0]?.id || null);
      }
    } catch (e) {
      setError(e.message || 'Failed to delete page.');
    }
  };

  // ── Block actions ──────────────────────────────────────────────────
  const updateBlock = (blockId, patch) => {
    updateActivePage(p => ({
      blocks: p.blocks.map(b => b.id === blockId ? { ...b, ...patch } : b),
    }));
  };

  const insertBlockAfter = (blockId, type = 'text', content = '') => {
    const newB = newBlock(type, content);
    updateActivePage(p => {
      const idx = p.blocks.findIndex(b => b.id === blockId);
      const next = [...p.blocks];
      next.splice(idx + 1, 0, newB);
      return { blocks: next };
    });
    // Focus the new block after the paint.
    setTimeout(() => {
      const el = document.querySelector(`[data-block-id="${newB.id}"] [contenteditable]`);
      if (el) { el.focus(); placeCaretAtEnd(el); }
    }, 20);
    return newB.id;
  };

  const removeBlock = (blockId) => {
    updateActivePage(p => {
      if (p.blocks.length === 1) return { blocks: [newBlock('text', '')] };
      const idx = p.blocks.findIndex(b => b.id === blockId);
      const next = p.blocks.filter(b => b.id !== blockId);
      // Focus the previous block.
      const prevId = next[Math.max(0, idx - 1)]?.id;
      setTimeout(() => {
        const el = document.querySelector(`[data-block-id="${prevId}"] [contenteditable]`);
        if (el) { el.focus(); placeCaretAtEnd(el); }
      }, 20);
      return { blocks: next };
    });
  };

  const changeBlockType = (blockId, type) => {
    updateBlock(blockId, { type });
  };

  const indentBlock = (blockId, delta) => {
    updateActivePage(p => ({
      blocks: p.blocks.map(b =>
        b.id === blockId
          ? { ...b, indent: Math.max(0, Math.min(4, (b.indent || 0) + delta)) }
          : b
      ),
    }));
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      {/* LEFT SIDEBAR — workspaces + pages */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>📒 Tasks & Notes</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Notion-style workspace
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {WORKSPACES.map(ws => {
            const wsPages = pagesByWorkspace[ws.key] || [];
            return (
              <div key={ws.key} style={{ marginBottom: '8px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px 4px 14px',
                }}>
                  <span style={{ fontSize: '13px' }}>{ws.icon}</span>
                  <span style={{
                    flex: 1, fontSize: '11px', fontWeight: 700,
                    color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px',
                  }}>
                    {ws.label}
                  </span>
                  <button
                    onClick={() => createPage(ws.key)}
                    title={`New page in ${ws.label}`}
                    style={styles.wsAddBtn}
                    onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                  >+</button>
                </div>
                {wsPages.length === 0 ? (
                  <div style={{ padding: '4px 14px 4px 30px', fontSize: '12px', color: '#cbd5e1' }}>
                    No pages yet
                  </div>
                ) : (
                  wsPages.map(p => {
                    const active = p.id === activePageId;
                    return (
                      <div
                        key={p.id}
                        onClick={() => { setActivePageId(p.id); setActiveWorkspace(p.workspace); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '5px 12px 5px 26px',
                          cursor: 'pointer',
                          background: active ? '#e2e8f0' : 'transparent',
                          borderLeft: active ? '2px solid #D4A853' : '2px solid transparent',
                          transition: 'background 120ms',
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f1f5f9'; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ fontSize: '14px', flexShrink: 0 }}>{p.icon || '📄'}</span>
                        <span style={{
                          flex: 1, fontSize: '13px',
                          color: active ? '#0f172a' : '#475569',
                          fontWeight: active ? 600 : 500,
                          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        }}>
                          {p.title}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>

        <div style={styles.sidebarFooter}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            {saving ? '⏳ Saving…' : savedAt ? `✓ Saved ${savedAt.toLocaleTimeString()}` : 'Ready'}
          </span>
        </div>
      </aside>

      {/* MAIN EDITOR */}
      <main style={styles.main}>
        {error && (
          <div style={styles.errorBanner}>
            ⚠️ {error}
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', marginLeft: 'auto', fontSize: '14px' }}>✕</button>
          </div>
        )}

        {loading ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📒</div>
            Loading your workspace…
          </div>
        ) : !activePage ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '52px', marginBottom: '18px' }}>📒</div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              Your workspace is empty
            </h2>
            <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '14px' }}>
              Create a page in any workspace from the sidebar to get started.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {WORKSPACES.map(ws => (
                <button
                  key={ws.key}
                  onClick={() => createPage(ws.key)}
                  style={styles.templateBtn}
                >
                  <span style={{ fontSize: '18px' }}>{ws.icon}</span>
                  <span>New {ws.label} page</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={styles.editorScroll}>
            {/* Page header */}
            <div style={styles.pageHeader}>
              <button
                onClick={() => {
                  const next = window.prompt('Pick an emoji for this page:', activePage.icon || '📄');
                  if (next) updateActivePage(() => ({ icon: next }));
                }}
                style={styles.iconBtn}
                title="Change emoji"
              >
                {activePage.icon || '📄'}
              </button>
              <input
                value={activePage.title}
                onChange={e => updateActivePage(() => ({ title: e.target.value }))}
                placeholder="Untitled"
                style={styles.titleInput}
              />
              <button
                onClick={() => deletePage(activePage.id)}
                style={styles.deleteBtn}
                title="Delete page"
              >
                🗑
              </button>
            </div>

            {/* Blocks */}
            <div style={{ padding: '0 80px 120px' }}>
              {(activePage.blocks || []).map((block, idx) => (
                <Block
                  key={block.id}
                  block={block}
                  index={idx}
                  onChange={(patch) => updateBlock(block.id, patch)}
                  onInsertAfter={(type, content) => insertBlockAfter(block.id, type, content)}
                  onRemove={() => removeBlock(block.id)}
                  onChangeType={(type) => changeBlockType(block.id, type)}
                  onIndent={(delta) => indentBlock(block.id, delta)}
                  numberedIndex={getNumberedIndex(activePage.blocks, idx)}
                />
              ))}
              <div
                onClick={() => {
                  const last = (activePage.blocks || []).slice(-1)[0];
                  if (last) insertBlockAfter(last.id);
                }}
                style={{ padding: '14px 0', color: '#cbd5e1', cursor: 'text', fontSize: '14px' }}
              >
                Click to add a new block…
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// =====================================================================
// Block component — contenteditable with keyboard shortcuts
// =====================================================================

function Block({ block, onChange, onInsertAfter, onRemove, onChangeType, onIndent, numberedIndex }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);

  // Sync DOM when content changes externally (e.g. switching pages).
  useEffect(() => {
    if (ref.current && ref.current.innerText !== (block.content || '')) {
      ref.current.innerText = block.content || '';
    }
  }, [block.id, block.content]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const el = ref.current;
      const text = el?.innerText || '';
      // Carry the type forward for list-like blocks; otherwise back to text.
      const carry = ['todo', 'bullet', 'numbered'].includes(block.type);
      const nextType = carry ? block.type : 'text';
      // If the current block is empty AND it's a list item, escape the list.
      if (carry && !text.trim()) {
        onChangeType('text');
        return;
      }
      onInsertAfter(nextType, '');
    } else if (e.key === 'Backspace') {
      const el = ref.current;
      const text = el?.innerText || '';
      if (!text) {
        e.preventDefault();
        onRemove();
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      onIndent(e.shiftKey ? -1 : 1);
    }
  };

  const handleInput = () => {
    const text = ref.current?.innerText || '';
    onChange({ content: text });
  };

  const common = {
    ref,
    contentEditable: block.type !== 'divider',
    suppressContentEditableWarning: true,
    onInput: handleInput,
    onKeyDown: handleKeyDown,
    'data-placeholder': placeholderFor(block),
    style: {
      outline: 'none',
      width: '100%',
      padding: '3px 0',
      color: '#0f172a',
      fontSize: styleFontSize(block.type),
      fontWeight: styleFontWeight(block.type),
      lineHeight: 1.55,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      minHeight: '1.5em',
      textDecoration: block.type === 'todo' && block.checked ? 'line-through' : 'none',
      opacity: block.type === 'todo' && block.checked ? 0.55 : 1,
      fontStyle: block.type === 'quote' ? 'italic' : 'normal',
    },
  };

  const indent = (block.indent || 0) * 24;

  return (
    <div
      data-block-id={block.id}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '6px',
        padding: '2px 0',
        position: 'relative',
        marginLeft: `${indent}px`,
      }}
      onMouseEnter={() => setMenuOpen(true)}
      onMouseLeave={() => setMenuOpen(false)}
    >
      {/* Hover actions (drag handle / type menu) */}
      <div style={{
        width: '24px',
        display: 'flex',
        justifyContent: 'center',
        paddingTop: block.type.startsWith('heading') ? '6px' : '6px',
        opacity: menuOpen ? 1 : 0,
        transition: 'opacity 120ms',
      }}>
        <BlockTypeMenu
          value={block.type}
          onChange={(t) => onChangeType(t)}
        />
      </div>

      {/* Block prefix (checkbox / bullet / number) */}
      <div style={{ paddingTop: '6px', minWidth: '22px', userSelect: 'none' }}>
        {block.type === 'todo' && (
          <input
            type="checkbox"
            checked={!!block.checked}
            onChange={e => onChange({ checked: e.target.checked })}
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#D4A853' }}
          />
        )}
        {block.type === 'bullet' && (
          <span style={{ fontSize: '14px', color: '#64748b' }}>•</span>
        )}
        {block.type === 'numbered' && (
          <span style={{ fontSize: '14px', color: '#64748b' }}>{numberedIndex}.</span>
        )}
        {block.type === 'quote' && (
          <span style={{ fontSize: '18px', color: '#D4A853', lineHeight: 1 }}>❝</span>
        )}
      </div>

      {/* The editable content */}
      {block.type === 'divider' ? (
        <hr style={{ flex: 1, marginTop: '14px', border: 0, borderTop: '1px solid #e2e8f0' }} />
      ) : (
        <div {...common} />
      )}
    </div>
  );
}

function BlockTypeMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        title="Change block type"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#94a3b8',
          fontSize: '14px',
          padding: '2px 4px',
          borderRadius: '4px',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >⋮⋮</button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
          />
          <div style={{
            position: 'absolute',
            top: '24px',
            left: 0,
            zIndex: 11,
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
            padding: '4px',
            width: '220px',
          }}>
            {BLOCK_TYPES.map(bt => (
              <button
                key={bt.type}
                onClick={() => { onChange(bt.type); setOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '7px 10px',
                  border: 'none',
                  background: bt.type === value ? '#f1f5f9' : 'transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: '#0f172a',
                  fontSize: '13px',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                onMouseLeave={e => { e.currentTarget.style.background = bt.type === value ? '#f1f5f9' : 'transparent'; }}
              >
                <span style={{
                  width: '22px', textAlign: 'center',
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '11px', fontWeight: 700, color: '#64748b',
                }}>{bt.icon}</span>
                <span>{bt.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// =====================================================================
// Helpers
// =====================================================================

function styleFontSize(type) {
  return {
    heading1: '30px',
    heading2: '24px',
    heading3: '18px',
    text:     '15px',
    todo:     '15px',
    bullet:   '15px',
    numbered: '15px',
    quote:    '15px',
    divider:  '15px',
  }[type] || '15px';
}

function styleFontWeight(type) {
  if (type === 'heading1') return 800;
  if (type === 'heading2') return 700;
  if (type === 'heading3') return 700;
  return 400;
}

function placeholderFor(block) {
  return {
    heading1: 'Heading 1',
    heading2: 'Heading 2',
    heading3: 'Heading 3',
    text:     "Type '/' for commands",
    todo:     'To-do',
    bullet:   'List',
    numbered: 'List',
    quote:    'Empty quote',
  }[block.type] || 'Type something…';
}

function getNumberedIndex(blocks, idx) {
  if (!blocks) return 1;
  const current = blocks[idx];
  if (current.type !== 'numbered') return null;
  let count = 1;
  for (let i = idx - 1; i >= 0; i--) {
    if (blocks[i].type === 'numbered' && (blocks[i].indent || 0) === (current.indent || 0)) count++;
    else break;
  }
  return count;
}

function placeCaretAtEnd(el) {
  if (!el) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

// =====================================================================
// Styles
// =====================================================================

const styles = {
  root: {
    display: 'flex',
    height: 'calc(100vh - 60px)',
    background: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  sidebar: {
    width: '260px',
    flexShrink: 0,
    background: '#f8fafc',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    padding: '16px 14px 12px',
    borderBottom: '1px solid #e2e8f0',
  },
  sidebarFooter: {
    padding: '10px 14px',
    borderTop: '1px solid #e2e8f0',
  },
  wsAddBtn: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 120ms',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#ffffff',
    minWidth: 0,
  },
  errorBanner: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '10px 18px',
    margin: '12px 18px 0',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    color: '#64748b',
    fontSize: '14px',
    textAlign: 'center',
  },
  templateBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    color: '#0f172a',
    transition: 'all 150ms',
  },
  editorScroll: {
    flex: 1,
    overflowY: 'auto',
    paddingTop: '30px',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '8px 80px 20px',
    borderBottom: '1px solid #f1f5f9',
    marginBottom: '28px',
  },
  iconBtn: {
    fontSize: '46px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '6px',
    lineHeight: 1,
  },
  titleInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '36px',
    fontWeight: 800,
    color: '#0f172a',
    background: 'transparent',
    fontFamily: 'inherit',
    letterSpacing: '-0.02em',
    minWidth: 0,
  },
  deleteBtn: {
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#64748b',
  },
};
