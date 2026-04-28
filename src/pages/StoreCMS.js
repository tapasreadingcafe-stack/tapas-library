import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

// =====================================================================
// StoreCMS — staff editor for the typed CMS tables consumed by the
// tapas-store storefront (hours, contact_info, faqs, journal_posts).
//
// One tabbed page rather than four sub-pages — these are all small,
// flat tables and editors don't need to flip between them often. The
// schemas are defined in supabase/migrations/20260425_cms_typed_tables.sql.
// =====================================================================

const TABS = [
  { key: 'hours',         label: '🕒 Hours' },
  { key: 'contact_info',  label: '📞 Contact info' },
  { key: 'faqs',          label: '❓ FAQs' },
  { key: 'journal_posts', label: '📰 Journal' },
  { key: 'clubs',         label: '👥 Clubs' },
  { key: 'team_members',  label: '🧑‍💼 Team' },
  { key: 'press_quotes',  label: '🗞 Press' },
];

export default function StoreCMS() {
  const [tab, setTab] = useState('hours');
  return (
    <div style={S.root}>
      <header style={S.header}>
        <div>
          <h1 style={S.title}>📝 Storefront content</h1>
          <p style={S.subtitle}>Edit the typed tables that drive Hours, Contact, FAQs and the Journal on the customer site.</p>
        </div>
      </header>
      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            ...S.tab,
            color: tab === t.key ? '#0f172a' : '#64748b',
            borderBottom: tab === t.key ? '2px solid #D4A853' : '2px solid transparent',
            fontWeight: tab === t.key ? 700 : 500,
          }}>{t.label}</button>
        ))}
      </div>
      {tab === 'hours' && <HoursEditor />}
      {tab === 'contact_info' && <ContactInfoEditor />}
      {tab === 'faqs' && <FaqsEditor />}
      {tab === 'journal_posts' && <JournalEditor />}
      {tab === 'clubs' && <ClubsEditor />}
      {tab === 'team_members' && <TeamEditor />}
      {tab === 'press_quotes' && <PressEditor />}
    </div>
  );
}

// ── Hours ──────────────────────────────────────────────────────────────
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function HoursEditor() {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('hours').select('*').order('sort_order');
    const map = new Map((data || []).map(r => [r.day, r]));
    setRows(DAYS.map((d, i) => map.get(d) || { day: d, opens: '09:00', closes: '21:00', is_closed: false, sort_order: i }));
  }, []);
  useEffect(() => { load(); }, [load]);

  const update = (day, patch) => setRows(prev => prev.map(r => r.day === day ? { ...r, ...patch } : r));

  const save = async () => {
    setSaving(true); setMsg('');
    const payload = rows.map((r, i) => ({
      day: r.day,
      opens: r.is_closed ? null : (r.opens || '09:00'),
      closes: r.is_closed ? null : (r.closes || '21:00'),
      is_closed: !!r.is_closed,
      sort_order: i,
    }));
    const { error } = await supabase.from('hours').upsert(payload, { onConflict: 'day' });
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : 'Saved.');
    setTimeout(() => setMsg(''), 2500);
  };

  return (
    <section style={S.section}>
      <p style={S.help}>Set opening hours for each day of the week. Mark a day as closed to hide opening/closing times.</p>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Day</th>
              <th style={S.th}>Opens</th>
              <th style={S.th}>Closes</th>
              <th style={S.th}>Closed?</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.day}>
                <td style={S.td}><strong>{r.day}</strong></td>
                <td style={S.td}>
                  <input type="time" value={r.opens || ''} disabled={r.is_closed}
                    onChange={e => update(r.day, { opens: e.target.value })} style={S.input} />
                </td>
                <td style={S.td}>
                  <input type="time" value={r.closes || ''} disabled={r.is_closed}
                    onChange={e => update(r.day, { closes: e.target.value })} style={S.input} />
                </td>
                <td style={S.td}>
                  <input type="checkbox" checked={!!r.is_closed}
                    onChange={e => update(r.day, { is_closed: e.target.checked })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SaveBar saving={saving} msg={msg} onSave={save} />
    </section>
  );
}

// ── Contact info ───────────────────────────────────────────────────────
const CONTACT_FIELDS = [
  { key: 'address_line_1', label: 'Address line 1' },
  { key: 'address_line_2', label: 'Address line 2' },
  { key: 'phone',          label: 'Phone' },
  { key: 'email_general',  label: 'General email' },
  { key: 'email_events',   label: 'Events email' },
  { key: 'email_press',    label: 'Press email' },
  { key: 'parking',        label: 'Parking notes' },
  { key: 'transit',        label: 'Transit notes' },
  { key: 'accessibility',  label: 'Accessibility notes' },
  { key: 'map_label',      label: 'Map label' },
];

function ContactInfoEditor() {
  const [row, setRow] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('contact_info').select('*').maybeSingle();
    setRow(data || {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const update = (k, v) => setRow(r => ({ ...r, [k]: v }));

  const save = async () => {
    setSaving(true); setMsg('');
    const payload = { id: true, updated_at: new Date().toISOString() };
    CONTACT_FIELDS.forEach(f => { payload[f.key] = row[f.key] || null; });
    const { error } = await supabase.from('contact_info').upsert(payload, { onConflict: 'id' });
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : 'Saved.');
    setTimeout(() => setMsg(''), 2500);
  };

  return (
    <section style={S.section}>
      <p style={S.help}>Single row of contact details shown on the storefront /contact page and footer.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {CONTACT_FIELDS.map(f => (
          <div key={f.key}>
            <label style={S.label}>{f.label.toUpperCase()}</label>
            <input value={row[f.key] || ''} onChange={e => update(f.key, e.target.value)} style={S.input} />
          </div>
        ))}
      </div>
      <SaveBar saving={saving} msg={msg} onSave={save} />
    </section>
  );
}

// ── FAQs ───────────────────────────────────────────────────────────────
function FaqsEditor() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ question: '', answer: '', is_open_by_default: false, sort_order: 0, status: 'published' });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('faqs').select('*').order('sort_order');
    setItems(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ question: '', answer: '', is_open_by_default: false, sort_order: items.length, status: 'published' });
    setError(''); setShowForm(true);
  };
  const openEdit = (it) => {
    setEditing(it);
    setForm({ question: it.question, answer: it.answer, is_open_by_default: !!it.is_open_by_default, sort_order: it.sort_order ?? 0, status: it.status || 'published' });
    setError(''); setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.question.trim() || !form.answer.trim()) { setError('Question and answer are required.'); return; }
    setSaving(true); setError('');
    const payload = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      is_open_by_default: !!form.is_open_by_default,
      sort_order: Number(form.sort_order) || 0,
      status: form.status,
      updated_at: new Date().toISOString(),
    };
    const { error: err } = editing
      ? await supabase.from('faqs').update(payload).eq('id', editing.id)
      : await supabase.from('faqs').insert(payload);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setShowForm(false);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this FAQ?')) return;
    await supabase.from('faqs').delete().eq('id', id);
    load();
  };

  return (
    <section style={S.section}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ ...S.help, margin: 0 }}>Questions and answers shown in the storefront FAQ accordion. Items with status “draft” are hidden.</p>
        <button onClick={openCreate} style={S.primaryBtn}>+ New FAQ</button>
      </div>
      {items.length === 0 ? (
        <div style={S.empty}>No FAQs yet. Add the first one.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
          {items.map(it => (
            <li key={it.id} style={S.row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>
                  {it.question}{' '}
                  {it.status !== 'published' && <span style={S.draftBadge}>DRAFT</span>}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, whiteSpace: 'pre-wrap' }}>{it.answer}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => openEdit(it)} style={S.iconBtn}>✏️</button>
                <button onClick={() => remove(it.id)} style={S.iconBtn}>🗑</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <h2 style={S.modalH2}>{editing ? 'Edit FAQ' : 'New FAQ'}</h2>
          {error && <div style={S.error}>{error}</div>}
          <form onSubmit={save}>
            <div style={S.field}>
              <label style={S.label}>QUESTION</label>
              <input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} style={S.input} required />
            </div>
            <div style={S.field}>
              <label style={S.label}>ANSWER</label>
              <textarea value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} style={{ ...S.input, minHeight: 120, fontFamily: 'inherit' }} required />
            </div>
            <div style={S.formRow}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>SORT ORDER</label>
                <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} style={S.input} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>STATUS</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={S.input}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
              <input type="checkbox" checked={form.is_open_by_default} onChange={e => setForm(f => ({ ...f, is_open_by_default: e.target.checked }))} />
              Open by default on the storefront
            </label>
            <div style={S.formActions}>
              <button type="button" onClick={() => setShowForm(false)} style={S.cancelBtn}>Cancel</button>
              <button type="submit" disabled={saving} style={S.primaryBtn}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

// ── Journal posts ──────────────────────────────────────────────────────
const JOURNAL_CATEGORIES = ['Essay','Interview','Marginalia','Club Notes','Recipe','Translator Diary'];

function JournalEditor() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyJournalForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('journal_posts').select('*').order('published_at', { ascending: false });
    setItems(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(emptyJournalForm()); setError(''); setShowForm(true); };
  const openEdit = (it) => {
    setEditing(it);
    setForm({
      slug: it.slug || '',
      category: it.category || 'Essay',
      title_html: it.title_html || '',
      excerpt: it.excerpt || '',
      body_markdown: it.body_markdown || '',
      author_name: it.author_name || '',
      author_initial: it.author_initial || '',
      read_minutes: it.read_minutes ?? '',
      cover_url: it.cover_url || '',
      cover_color: it.cover_color || 'taupe',
      is_featured: !!it.is_featured,
      is_sidebar: !!it.is_sidebar,
      sidebar_kicker: it.sidebar_kicker || '',
      sort_order: it.sort_order ?? 0,
      published_at: it.published_at ? it.published_at.slice(0, 16) : '',
      status: it.status || 'published',
    });
    setError(''); setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.slug.trim() || !form.title_html.trim()) { setError('Slug and title are required.'); return; }
    setSaving(true); setError('');
    const payload = {
      slug: form.slug.trim(),
      category: form.category,
      title_html: form.title_html.trim(),
      excerpt: form.excerpt.trim() || null,
      body_markdown: form.body_markdown.trim() || null,
      author_name: form.author_name.trim() || null,
      author_initial: form.author_initial.trim() || null,
      read_minutes: form.read_minutes === '' ? null : Number(form.read_minutes),
      cover_url: form.cover_url.trim() || null,
      cover_color: form.cover_color || 'taupe',
      is_featured: !!form.is_featured,
      is_sidebar: !!form.is_sidebar,
      sidebar_kicker: form.sidebar_kicker.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
      status: form.status,
      updated_at: new Date().toISOString(),
    };
    const { error: err } = editing
      ? await supabase.from('journal_posts').update(payload).eq('id', editing.id)
      : await supabase.from('journal_posts').insert(payload);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setShowForm(false);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this journal post?')) return;
    await supabase.from('journal_posts').delete().eq('id', id);
    load();
  };

  return (
    <section style={S.section}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ ...S.help, margin: 0 }}>“The Journal” posts. Markdown body, slug used in storefront URLs.</p>
        <button onClick={openCreate} style={S.primaryBtn}>+ New post</button>
      </div>
      {items.length === 0 ? (
        <div style={S.empty}>No posts yet.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
          {items.map(it => (
            <li key={it.id} style={S.row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }} dangerouslySetInnerHTML={{ __html: it.title_html }} />
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  {it.category} · {it.author_name || '—'} · {it.published_at ? new Date(it.published_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : 'unpublished'}
                  {it.status !== 'published' && <> · <span style={S.draftBadge}>DRAFT</span></>}
                  {it.is_featured && <> · <span style={{ ...S.draftBadge, background: '#fef3c7', color: '#92400e' }}>FEATURED</span></>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => openEdit(it)} style={S.iconBtn}>✏️</button>
                <button onClick={() => remove(it.id)} style={S.iconBtn}>🗑</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)} wide>
          <h2 style={S.modalH2}>{editing ? 'Edit post' : 'New post'}</h2>
          {error && <div style={S.error}>{error}</div>}
          <form onSubmit={save}>
            <div style={S.formRow}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>SLUG</label>
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} style={S.input} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>CATEGORY</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={S.input}>
                  {JOURNAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={S.field}>
              <label style={S.label}>TITLE (HTML — &lt;em&gt; allowed)</label>
              <input value={form.title_html} onChange={e => setForm(f => ({ ...f, title_html: e.target.value }))} style={S.input} required />
            </div>
            <div style={S.field}>
              <label style={S.label}>EXCERPT</label>
              <textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} style={{ ...S.input, minHeight: 70, fontFamily: 'inherit' }} />
            </div>
            <div style={S.field}>
              <label style={S.label}>BODY (Markdown)</label>
              <textarea value={form.body_markdown} onChange={e => setForm(f => ({ ...f, body_markdown: e.target.value }))} style={{ ...S.input, minHeight: 200, fontFamily: 'ui-monospace, monospace' }} />
            </div>
            <div style={S.formRow}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>AUTHOR</label>
                <input value={form.author_name} onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))} style={S.input} />
              </div>
              <div style={{ width: 90 }}>
                <label style={S.label}>INITIAL</label>
                <input value={form.author_initial} onChange={e => setForm(f => ({ ...f, author_initial: e.target.value }))} maxLength={3} style={S.input} />
              </div>
              <div style={{ width: 110 }}>
                <label style={S.label}>READ (MIN)</label>
                <input type="number" min="0" value={form.read_minutes} onChange={e => setForm(f => ({ ...f, read_minutes: e.target.value }))} style={S.input} />
              </div>
            </div>
            <div style={S.formRow}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>COVER URL</label>
                <input value={form.cover_url} onChange={e => setForm(f => ({ ...f, cover_url: e.target.value }))} style={S.input} />
              </div>
              <div style={{ width: 140 }}>
                <label style={S.label}>COVER COLOR</label>
                <select value={form.cover_color} onChange={e => setForm(f => ({ ...f, cover_color: e.target.value }))} style={S.input}>
                  {['taupe','cream','lime','orange','purple','pink','ink'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={S.formRow}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>PUBLISH AT</label>
                <input type="datetime-local" value={form.published_at} onChange={e => setForm(f => ({ ...f, published_at: e.target.value }))} style={S.input} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>STATUS</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={S.input}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div style={{ width: 110 }}>
                <label style={S.label}>SORT</label>
                <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} style={S.input} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 18, marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} />
                Featured (only one allowed)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={form.is_sidebar} onChange={e => setForm(f => ({ ...f, is_sidebar: e.target.checked }))} />
                Sidebar pick
              </label>
            </div>
            {form.is_sidebar && (
              <div style={S.field}>
                <label style={S.label}>SIDEBAR KICKER</label>
                <input value={form.sidebar_kicker} onChange={e => setForm(f => ({ ...f, sidebar_kicker: e.target.value }))} placeholder="STAFF PICK" style={S.input} />
              </div>
            )}
            <div style={S.formActions}>
              <button type="button" onClick={() => setShowForm(false)} style={S.cancelBtn}>Cancel</button>
              <button type="submit" disabled={saving} style={S.primaryBtn}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

function emptyJournalForm() {
  return {
    slug: '', category: 'Essay', title_html: '', excerpt: '', body_markdown: '',
    author_name: '', author_initial: '', read_minutes: '',
    cover_url: '', cover_color: 'taupe',
    is_featured: false, is_sidebar: false, sidebar_kicker: '',
    sort_order: 0, published_at: '', status: 'published',
  };
}

// ── Clubs ──────────────────────────────────────────────────────────────
function ClubsEditor() {
  return (
    <SimpleListEditor
      table="clubs"
      title="Clubs"
      help="Recurring weekly clubs shown on the events page."
      orderBy="sort_order"
      empty={() => ({ slug: '', title_html: '', schedule: '', description: '', total_seats: '', status_label: '', sort_order: 0, status: 'published' })}
      summary={(c) => ({
        title: c.title_html,
        meta: `${c.schedule}${c.status_label ? ' · ' + c.status_label : ''}${c.status !== 'published' ? ' · DRAFT' : ''}`,
      })}
      fields={[
        { key: 'slug',         label: 'SLUG', required: true },
        { key: 'title_html',   label: 'TITLE (HTML — <em> allowed)', required: true },
        { key: 'schedule',     label: 'SCHEDULE', required: true, placeholder: 'THURSDAYS · 7:00P' },
        { key: 'description',  label: 'DESCRIPTION', textarea: true },
        { key: 'total_seats',  label: 'TOTAL SEATS', type: 'number' },
        { key: 'status_label', label: 'STATUS LABEL', placeholder: '"3 open", "Waitlist"' },
        { key: 'sort_order',   label: 'SORT', type: 'number' },
        { key: 'status',       label: 'STATUS', select: ['published', 'draft'] },
      ]}
    />
  );
}

// ── Team members ───────────────────────────────────────────────────────
function TeamEditor() {
  return (
    <SimpleListEditor
      table="team_members"
      title="Team"
      help="People shown on the About page team grid."
      orderBy="sort_order"
      empty={() => ({ initials: '', color: 'cream', name: '', role: '', currently_reading: '', photo_url: '', sort_order: 0, status: 'published' })}
      summary={(t) => ({
        title: t.name,
        meta: `${t.role || '—'}${t.currently_reading ? ' · reading ' + t.currently_reading : ''}${t.status !== 'published' ? ' · DRAFT' : ''}`,
      })}
      fields={[
        { key: 'name',              label: 'NAME', required: true },
        { key: 'initials',          label: 'INITIALS (1–3 chars)', required: true, maxLength: 3 },
        { key: 'role',              label: 'ROLE' },
        { key: 'currently_reading', label: 'CURRENTLY READING' },
        { key: 'photo_url',         label: 'PHOTO URL' },
        { key: 'color',             label: 'CARD COLOR', select: ['cream', 'lime', 'orange', 'lavender'] },
        { key: 'sort_order',        label: 'SORT', type: 'number' },
        { key: 'status',            label: 'STATUS', select: ['published', 'draft'] },
      ]}
    />
  );
}

// ── Press quotes ───────────────────────────────────────────────────────
function PressEditor() {
  return (
    <SimpleListEditor
      table="press_quotes"
      title="Press"
      help="Press quotes shown on the About page press strip."
      orderBy="sort_order"
      empty={() => ({ source: '', quote: '', context: '', sort_order: 0 })}
      summary={(p) => ({
        title: `“${p.quote}”`,
        meta: `${p.source}${p.context ? ' · ' + p.context : ''}`,
      })}
      fields={[
        { key: 'source',     label: 'SOURCE', required: true, placeholder: 'The Hindu' },
        { key: 'quote',      label: 'QUOTE', required: true, textarea: true },
        { key: 'context',    label: 'CONTEXT', placeholder: 'DINING · 2024' },
        { key: 'sort_order', label: 'SORT', type: 'number' },
      ]}
    />
  );
}

// ── Generic list editor — list/create/edit/delete for a flat table ────
function SimpleListEditor({ table, help, orderBy, empty, summary, fields }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty());
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from(table).select('*').order(orderBy || 'updated_at');
    setItems(data || []);
  }, [table, orderBy]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty(), sort_order: items.length });
    setError(''); setShowForm(true);
  };
  const openEdit = (it) => {
    const f = empty();
    Object.keys(f).forEach((k) => { f[k] = it[k] ?? f[k]; });
    setEditing(it);
    setForm(f);
    setError(''); setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    for (const f of fields) {
      if (f.required && !String(form[f.key] ?? '').trim()) {
        setError(`${f.label.replace(/\s\(.*\)$/, '')} is required.`);
        return;
      }
    }
    setSaving(true); setError('');
    const payload = {};
    fields.forEach((f) => {
      const v = form[f.key];
      if (f.type === 'number') {
        payload[f.key] = v === '' || v == null ? null : Number(v);
      } else if (typeof v === 'string') {
        payload[f.key] = v.trim() || null;
      } else {
        payload[f.key] = v ?? null;
      }
    });
    payload.updated_at = new Date().toISOString();
    const { error: err } = editing
      ? await supabase.from(table).update(payload).eq('id', editing.id)
      : await supabase.from(table).insert(payload);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setShowForm(false);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this row?')) return;
    await supabase.from(table).delete().eq('id', id);
    load();
  };

  return (
    <section style={S.section}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ ...S.help, margin: 0 }}>{help}</p>
        <button onClick={openCreate} style={S.primaryBtn}>+ New</button>
      </div>
      {items.length === 0 ? (
        <div style={S.empty}>Nothing here yet.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
          {items.map(it => {
            const s = summary(it);
            return (
              <li key={it.id} style={S.row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }} dangerouslySetInnerHTML={{ __html: s.title }} />
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{s.meta}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openEdit(it)} style={S.iconBtn}>✏️</button>
                  <button onClick={() => remove(it.id)} style={S.iconBtn}>🗑</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <h2 style={S.modalH2}>{editing ? 'Edit' : 'New'}</h2>
          {error && <div style={S.error}>{error}</div>}
          <form onSubmit={save}>
            {fields.map((f) => (
              <div key={f.key} style={S.field}>
                <label style={S.label}>{f.label}</label>
                {f.select ? (
                  <select value={form[f.key] ?? ''} onChange={e => setForm(s => ({ ...s, [f.key]: e.target.value }))} style={S.input}>
                    {f.select.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : f.textarea ? (
                  <textarea value={form[f.key] ?? ''} onChange={e => setForm(s => ({ ...s, [f.key]: e.target.value }))}
                    style={{ ...S.input, minHeight: 90, fontFamily: 'inherit' }}
                    placeholder={f.placeholder} maxLength={f.maxLength} />
                ) : (
                  <input type={f.type || 'text'} value={form[f.key] ?? ''}
                    onChange={e => setForm(s => ({ ...s, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} maxLength={f.maxLength} style={S.input} />
                )}
              </div>
            ))}
            <div style={S.formActions}>
              <button type="button" onClick={() => setShowForm(false)} style={S.cancelBtn}>Cancel</button>
              <button type="submit" disabled={saving} style={S.primaryBtn}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

// ── Shared ─────────────────────────────────────────────────────────────
function SaveBar({ saving, msg, onSave }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
      <button onClick={onSave} disabled={saving} style={S.primaryBtn}>{saving ? 'Saving…' : 'Save'}</button>
      {msg && <span style={{ fontSize: 13, color: msg.startsWith('Error') ? '#dc2626' : '#16a34a' }}>{msg}</span>}
    </div>
  );
}

function Modal({ children, onClose, wide }) {
  return (
    <>
      <div onClick={onClose} style={S.backdrop} />
      <div style={{ ...S.modal, maxWidth: wide ? 720 : 520 }}>{children}</div>
    </>
  );
}

const S = {
  root: { padding: '28px 32px 60px', maxWidth: 1100, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  header: { marginBottom: 20 },
  title: { margin: 0, fontSize: 26, fontWeight: 800, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: 13, color: '#64748b', maxWidth: 700 },
  tabs: { display: 'flex', gap: 4, borderBottom: '1px solid #e2e8f0', marginBottom: 22, flexWrap: 'wrap' },
  tab: { padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', marginBottom: -1 },
  section: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22 },
  help: { fontSize: 13, color: '#64748b', marginTop: 0, marginBottom: 14 },
  primaryBtn: { padding: '10px 18px', background: 'linear-gradient(135deg, #D4A853, #C49040)', color: '#1a0f08', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  cancelBtn: { flex: 1, padding: 12, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#475569', fontFamily: 'inherit' },
  empty: { padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: 14, background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' },
  row: { display: 'flex', gap: 14, alignItems: 'flex-start', padding: 14, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fcfcfd' },
  iconBtn: { width: 32, height: 32, border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 14 },
  draftBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: 99, background: '#e2e8f0', color: '#475569', fontSize: 10, fontWeight: 700 },
  tableWrap: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 14px', background: '#f8fafc', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e8f0' },
  td: { padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#0f172a' },
  field: { marginBottom: 14 },
  formRow: { display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-end' },
  formActions: { display: 'flex', gap: 10, marginTop: 18 },
  label: { display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', color: '#0f172a', background: 'white', boxSizing: 'border-box' },
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 100 },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: 16, padding: 28, width: '100%', maxHeight: '92vh', overflowY: 'auto', zIndex: 101, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' },
  modalH2: { margin: '0 0 18px', fontSize: 20, fontWeight: 800, color: '#0f172a' },
  error: { background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#dc2626', fontSize: 13, fontWeight: 600 },
};
