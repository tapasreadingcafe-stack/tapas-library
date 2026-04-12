import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import DocEditor from '../components/notion/DocEditor';
import DatabaseView from '../components/notion/DatabaseView';
import { newBlock, starterDbSchema, uid, N } from '../components/notion/shared';

// =====================================================================
// Tasks — Notion-style workspace
// ---------------------------------------------------------------------
// Pages are stored in public.tasks_pages. A page can be either:
//   - a "doc" page (is_database = false) → rendered with DocEditor
//   - a "database" container (is_database = true) → rendered with
//     DatabaseView. Its child rows are other tasks_pages rows whose
//     parent_id points back to the database. Rows can themselves be
//     opened as full pages with their own DocEditor body.
// =====================================================================

const WORKSPACES = [
  { key: 'work',     label: 'Work',     icon: '💼', desc: 'Shared with all staff' },
  { key: 'personal', label: 'Personal', icon: '👤', desc: 'Private to you' },
  { key: 'shopping', label: 'Shopping', icon: '🛒', desc: 'Shared lists' },
  { key: 'ideas',    label: 'Ideas',    icon: '💡', desc: 'Notes + drafts' },
];

const PAGE_TEMPLATES = {
  work:     { icon: '📋', title: 'Work notes',    blocks: [newBlock('heading1', 'Work notes'),    newBlock('text', 'Meeting notes, decisions, anything you want to come back to.')] },
  personal: { icon: '📝', title: 'Personal',      blocks: [newBlock('heading1', 'Personal'),      newBlock('text', 'Only you can see this page.')] },
  shopping: { icon: '🛒', title: 'Shopping list', blocks: [newBlock('heading1', 'Shopping list'), newBlock('todo', 'Filter coffee beans'), newBlock('todo', 'Stationery for events'), newBlock('todo', 'Member welcome cards')] },
  ideas:    { icon: '💡', title: 'Ideas',         blocks: [newBlock('heading1', 'Ideas'),         newBlock('bullet', 'Book club theme for next month'), newBlock('bullet', 'Monsoon-reading playlist')] },
};

export default function Tasks() {
  const { staff } = useAuth();

  const [pages, setPages] = useState([]);
  const [activePageId, setActivePageId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState('');
  const saveTimerRef = useRef(null);

  // ── Load ─────────────────────────────────────────────────────────
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
        // Prefer a top-level page for the initial active selection.
        const top = data.find(p => !p.parent_id);
        setActivePageId((top || data[0]).id);
      }
    } catch (e) {
      setError(e.message || 'Failed to load pages.');
    } finally {
      setLoading(false);
    }
  }, [activePageId]);

  useEffect(() => { loadPages(); /* eslint-disable-next-line */ }, []);

  // ── Derived ──────────────────────────────────────────────────────
  const activePage = useMemo(
    () => pages.find(p => p.id === activePageId) || null,
    [pages, activePageId]
  );

  // Only show top-level pages in the sidebar. Database rows are
  // children of a database and browsed through its views.
  const topLevelByWorkspace = useMemo(() => {
    const m = { work: [], personal: [], shopping: [], ideas: [] };
    for (const p of pages) {
      if (p.parent_id) continue;
      if (m[p.workspace]) m[p.workspace].push(p);
    }
    return m;
  }, [pages]);

  const databaseRows = useMemo(() => {
    if (!activePage || !activePage.is_database) return [];
    return pages
      .filter(p => p.parent_id === activePage.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [pages, activePage]);

  // When we open a database row, we want a "back to database" link.
  const parentPage = useMemo(() => {
    if (!activePage?.parent_id) return null;
    return pages.find(p => p.id === activePage.parent_id) || null;
  }, [pages, activePage]);

  // ── Save (debounced for docs, immediate for database actions) ────
  const persistPage = useCallback(async (page) => {
    try {
      setSaving(true);
      const payload = {
        title: page.title,
        icon: page.icon,
        blocks: page.blocks,
        properties: page.properties || {},
        db_schema: page.db_schema,
      };
      const { error: err } = await supabase
        .from('tasks_pages')
        .update(payload)
        .eq('id', page.id);
      if (err) throw err;
      setSavedAt(new Date());
    } catch (e) {
      setError(e.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }, []);

  // Debounced mutator — updates local state, schedules a write.
  const scheduleSave = useCallback((pageId, mutator) => {
    setPages(prev => {
      const next = prev.map(p => p.id === pageId ? { ...p, ...mutator(p) } : p);
      const target = next.find(p => p.id === pageId);
      if (target) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => persistPage(target), 550);
      }
      return next;
    });
  }, [persistPage]);

  // Immediate save — for structural changes (new row, new column, etc.)
  const saveNow = useCallback(async (pageId, mutator) => {
    let snapshot = null;
    setPages(prev => {
      const next = prev.map(p => {
        if (p.id !== pageId) return p;
        const merged = { ...p, ...mutator(p) };
        snapshot = merged;
        return merged;
      });
      return next;
    });
    if (snapshot) await persistPage(snapshot);
  }, [persistPage]);

  // ── Page lifecycle ───────────────────────────────────────────────
  const createDoc = async (workspace) => {
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
          is_database: false,
          sort_order: (topLevelByWorkspace[workspace]?.length || 0) + 1,
        })
        .select()
        .single();
      if (err) throw err;
      setPages(prev => [...prev, data]);
      setActivePageId(data.id);
    } catch (e) {
      setError(e.message || 'Failed to create page.');
    }
  };

  const createDatabase = async (workspace) => {
    try {
      const { data, error: err } = await supabase
        .from('tasks_pages')
        .insert({
          owner_id: staff?.id || null,
          workspace,
          title: 'New database',
          icon: '🗂',
          blocks: [],
          is_database: true,
          db_schema: starterDbSchema(),
          sort_order: (topLevelByWorkspace[workspace]?.length || 0) + 1,
        })
        .select()
        .single();
      if (err) throw err;
      setPages(prev => [...prev, data]);
      setActivePageId(data.id);
    } catch (e) {
      setError(e.message || 'Failed to create database.');
    }
  };

  const deletePage = async (id) => {
    const page = pages.find(p => p.id === id);
    const label = page?.is_database ? 'Delete this database and every row in it?' : 'Delete this page?';
    if (!window.confirm(label)) return;
    try {
      // Supabase CASCADE on parent_id deletes rows automatically.
      const { error: err } = await supabase
        .from('tasks_pages')
        .delete()
        .eq('id', id);
      if (err) throw err;
      setPages(prev => prev.filter(p => p.id !== id && p.parent_id !== id));
      if (activePageId === id) {
        const remaining = pages.filter(p => p.id !== id && !p.parent_id);
        setActivePageId(remaining[0]?.id || null);
      }
    } catch (e) {
      setError(e.message || 'Failed to delete.');
    }
  };

  // ── Database row mutations ───────────────────────────────────────
  const createRow = async (initial = {}) => {
    if (!activePage?.is_database) return;
    try {
      const { data, error: err } = await supabase
        .from('tasks_pages')
        .insert({
          owner_id: staff?.id || null,
          workspace: activePage.workspace,
          parent_id: activePage.id,
          title: 'Untitled',
          icon: '📄',
          blocks: [newBlock('text', '')],
          is_database: false,
          properties: initial.properties || {},
          sort_order: (databaseRows.length || 0) + 1,
        })
        .select()
        .single();
      if (err) throw err;
      setPages(prev => [...prev, data]);
    } catch (e) {
      setError(e.message || 'Failed to create row.');
    }
  };

  const updateRow = (rowId, patch) => {
    scheduleSave(rowId, () => patch);
  };

  const deleteRow = async (rowId) => {
    if (!window.confirm('Delete this row?')) return;
    try {
      const { error: err } = await supabase
        .from('tasks_pages')
        .delete()
        .eq('id', rowId);
      if (err) throw err;
      setPages(prev => prev.filter(p => p.id !== rowId));
    } catch (e) {
      setError(e.message || 'Failed to delete row.');
    }
  };

  // ── Active-page mutators (doc body) ──────────────────────────────
  const setActiveBlocks = (next) => {
    if (!activePage) return;
    scheduleSave(activePage.id, () => ({ blocks: next }));
  };
  const setActiveTitle = (next) => {
    if (!activePage) return;
    scheduleSave(activePage.id, () => ({ title: next }));
  };
  const setActiveIcon = (next) => {
    if (!activePage) return;
    scheduleSave(activePage.id, () => ({ icon: next }));
  };
  const setActiveDbSchema = (next) => {
    if (!activePage) return;
    saveNow(activePage.id, () => ({ db_schema: next }));
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      {/* LEFT SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: N.text }}>📒 Tasks & Notes</div>
          <div style={{ fontSize: '11px', color: N.textMuted, marginTop: '2px' }}>
            Notion-style workspace
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {WORKSPACES.map(ws => {
            const wsPages = topLevelByWorkspace[ws.key] || [];
            return (
              <div key={ws.key} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px 4px 14px' }}>
                  <span style={{ fontSize: '13px' }}>{ws.icon}</span>
                  <span style={{
                    flex: 1,
                    fontSize: '11px',
                    fontWeight: 700,
                    color: N.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                  }}>{ws.label}</span>
                  <CreateMenu
                    onCreateDoc={() => createDoc(ws.key)}
                    onCreateDatabase={() => createDatabase(ws.key)}
                  />
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
                        onClick={() => setActivePageId(p.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '5px 12px 5px 26px',
                          cursor: 'pointer',
                          background: active ? '#e2e8f0' : 'transparent',
                          borderLeft: active ? '2px solid #D4A853' : '2px solid transparent',
                          transition: 'background 120ms',
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = N.bgAlt; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ fontSize: '14px', flexShrink: 0 }}>
                          {p.is_database ? '🗂' : (p.icon || '📄')}
                        </span>
                        <span style={{
                          flex: 1,
                          fontSize: '13px',
                          color: active ? N.text : N.textDim,
                          fontWeight: active ? 600 : 500,
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                        }}>
                          {p.title}
                        </span>
                        {p.is_database && (
                          <span style={{ fontSize: '10px', color: N.textFaint, fontWeight: 700 }}>DB</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>

        <div style={styles.sidebarFooter}>
          <span style={{ fontSize: '11px', color: N.textFaint }}>
            {saving ? '⏳ Saving…' : savedAt ? `✓ Saved ${savedAt.toLocaleTimeString()}` : 'Ready'}
          </span>
        </div>
      </aside>

      {/* MAIN */}
      <main style={styles.main}>
        {error && (
          <div style={styles.errorBanner}>
            ⚠️ {error}
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: N.danger, marginLeft: 'auto', fontSize: '14px' }}>✕</button>
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
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: N.text, marginBottom: '8px' }}>
              Your workspace is empty
            </h2>
            <p style={{ color: N.textMuted, marginBottom: '24px', fontSize: '14px' }}>
              Create a page or database from the sidebar to get started.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {WORKSPACES.map(ws => (
                <button
                  key={ws.key}
                  onClick={() => createDoc(ws.key)}
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
            {/* Breadcrumb when viewing a database row */}
            {parentPage && (
              <div style={{ padding: '8px 80px', borderBottom: `1px solid ${N.borderSoft}` }}>
                <button
                  onClick={() => setActivePageId(parentPage.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: N.textMuted,
                    padding: 0,
                    fontFamily: 'inherit',
                  }}
                >
                  ← Back to {parentPage.title}
                </button>
              </div>
            )}

            {/* Page header */}
            <div style={styles.pageHeader}>
              <button
                onClick={() => {
                  const next = window.prompt('Emoji for this page:', activePage.icon || '📄');
                  if (next) setActiveIcon(next);
                }}
                style={styles.iconBtn}
                title="Change emoji"
              >
                {activePage.is_database ? '🗂' : (activePage.icon || '📄')}
              </button>
              <input
                value={activePage.title}
                onChange={e => setActiveTitle(e.target.value)}
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

            {/* Body: database view or doc editor */}
            {activePage.is_database ? (
              <DatabaseView
                database={activePage}
                rows={databaseRows}
                onUpdateSchema={setActiveDbSchema}
                onCreateRow={createRow}
                onUpdateRow={updateRow}
                onDeleteRow={deleteRow}
                onOpenRow={(row) => setActivePageId(row.id)}
              />
            ) : (
              <div style={{ padding: '0 80px 120px' }}>
                <DocEditor
                  blocks={activePage.blocks || []}
                  onChange={setActiveBlocks}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Sidebar "+ New page / new database" dropdown
// ─────────────────────────────────────────────────────────────────────

function CreateMenu({ onCreateDoc, onCreateDatabase }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(true)}
        title="Create…"
        style={styles.wsAddBtn}
        onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = N.text; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = N.textFaint; }}
      >+</button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
          <div style={{
            position: 'absolute',
            top: '22px',
            right: 0,
            zIndex: 21,
            background: 'white',
            border: `1px solid ${N.border}`,
            borderRadius: '8px',
            boxShadow: '0 14px 34px rgba(15,23,42,0.14)',
            padding: '6px',
            width: '200px',
          }}>
            <button
              onClick={() => { onCreateDoc(); setOpen(false); }}
              style={createMenuItemStyle}
              onMouseEnter={e => e.currentTarget.style.background = N.hover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: '14px' }}>📄</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '12px', color: N.text }}>New page</div>
                <div style={{ fontSize: '10px', color: N.textFaint }}>Blank doc</div>
              </div>
            </button>
            <button
              onClick={() => { onCreateDatabase(); setOpen(false); }}
              style={createMenuItemStyle}
              onMouseEnter={e => e.currentTarget.style.background = N.hover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: '14px' }}>🗂</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '12px', color: N.text }}>New database</div>
                <div style={{ fontSize: '10px', color: N.textFaint }}>Table · Board · Gallery · List</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────

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
    background: N.bgAlt,
    borderRight: `1px solid ${N.border}`,
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    padding: '16px 14px 12px',
    borderBottom: `1px solid ${N.border}`,
  },
  sidebarFooter: {
    padding: '10px 14px',
    borderTop: `1px solid ${N.border}`,
  },
  wsAddBtn: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    background: 'transparent',
    border: 'none',
    color: N.textFaint,
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
    color: N.danger,
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
    color: N.textMuted,
    fontSize: '14px',
    textAlign: 'center',
  },
  templateBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: N.bgAlt,
    border: `1.5px solid ${N.border}`,
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    color: N.text,
    fontFamily: 'inherit',
  },
  editorScroll: {
    flex: 1,
    overflowY: 'auto',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '24px 80px 20px',
    borderBottom: `1px solid ${N.borderSoft}`,
    marginBottom: '12px',
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
    color: N.text,
    background: 'transparent',
    fontFamily: 'inherit',
    letterSpacing: '-0.02em',
    minWidth: 0,
  },
  deleteBtn: {
    background: 'transparent',
    border: `1px solid ${N.border}`,
    borderRadius: '6px',
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '14px',
    color: N.textMuted,
  },
};

const createMenuItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  width: '100%',
  padding: '8px 10px',
  border: 'none',
  background: 'transparent',
  borderRadius: '6px',
  cursor: 'pointer',
  textAlign: 'left',
  color: N.text,
  fontFamily: 'inherit',
  marginBottom: '2px',
};
