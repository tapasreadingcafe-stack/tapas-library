import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

const ACCENT = '#D4A853';
const BORDER = '#e2e8f0';
const BG = '#f8fafc';
const TEXT = '#0f172a';
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const TABS = ['Landing Pages', 'Instagram Embed', 'A/B Testing', 'Heatmaps'];

const toSlug = (t) => t.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const s = {
  page: { fontFamily: FONT, color: TEXT, padding: '24px', maxWidth: 1200, margin: '0 auto' },
  h1: { fontSize: 24, fontWeight: 700, margin: 0 },
  tabs: { display: 'flex', gap: 0, borderBottom: `2px solid ${BORDER}`, marginBottom: 24 },
  tab: (a) => ({ padding: '10px 20px', cursor: 'pointer', fontWeight: a ? 600 : 400, borderBottom: a ? `2px solid ${ACCENT}` : '2px solid transparent', marginBottom: -2, background: 'none', border: 'none', fontSize: 14, color: a ? ACCENT : '#64748b', fontFamily: FONT }),
  card: { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16, marginBottom: 16 },
  stat: { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16, textAlign: 'center', flex: 1, minWidth: 120 },
  statVal: { fontSize: 28, fontWeight: 700, color: ACCENT },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  statsRow: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: `2px solid ${BORDER}`, fontWeight: 600, fontSize: 12, color: '#64748b', textTransform: 'uppercase' },
  td: { padding: '10px 12px', borderBottom: `1px solid ${BORDER}` },
  btn: (primary) => ({ padding: '8px 16px', borderRadius: 6, border: primary ? 'none' : `1px solid ${BORDER}`, background: primary ? ACCENT : '#fff', color: primary ? '#fff' : TEXT, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: FONT }),
  input: { padding: '8px 12px', borderRadius: 6, border: `1px solid ${BORDER}`, fontSize: 14, width: '100%', boxSizing: 'border-box', fontFamily: FONT },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  modalBox: { background: '#fff', borderRadius: 12, padding: 24, width: '90%', maxWidth: 500, maxHeight: '80vh', overflow: 'auto' },
  badge: (c) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: c === 'green' ? '#dcfce7' : c === 'yellow' ? '#fef9c3' : c === 'blue' ? '#dbeafe' : '#f1f5f9', color: c === 'green' ? '#166534' : c === 'yellow' ? '#854d0e' : c === 'blue' ? '#1e40af' : '#475569' }),
  banner: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#92400e', marginBottom: 16 },
};

function Modal({ title, onClose, children }) {
  return (<div style={s.modal} onClick={onClose}><div style={s.modalBox} onClick={e => e.stopPropagation()}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
      <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
      <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>&times;</button>
    </div>{children}
  </div></div>);
}

function StatCard({ value, label }) {
  return <div style={s.stat}><div style={s.statVal}>{value}</div><div style={s.statLabel}>{label}</div></div>;
}

/* ── Tab 1: Landing Pages ── */
function LandingPages() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | page object
  const [form, setForm] = useState({ title: '', slug: '', body: '', published: false });

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('landing_pages').select('*').order('created_at', { ascending: false });
    setPages(data || []); setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const openEdit = (p) => { setForm({ title: p.title, slug: p.slug, body: p.body || '', published: p.published }); setModal(p); };
  const openCreate = () => { setForm({ title: '', slug: '', body: '', published: false }); setModal('create'); };

  const save = async () => {
    const payload = { title: form.title, slug: form.slug, body: form.body, published: form.published };
    if (modal === 'create') await supabase.from('landing_pages').insert(payload);
    else await supabase.from('landing_pages').update(payload).eq('id', modal.id);
    setModal(null); fetch_();
  };

  const remove = async (id) => { if (window.confirm('Delete this page?')) { await supabase.from('landing_pages').delete().eq('id', id); fetch_(); } };

  const stats = useMemo(() => ({ total: pages.length, published: pages.filter(p => p.published).length }), [pages]);

  return (<div>
    <div style={s.statsRow}><StatCard value={stats.total} label="Total Pages" /><StatCard value={stats.published} label="Published" /></div>
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
      <button style={s.btn(true)} onClick={openCreate}>+ New Page</button>
    </div>
    {loading ? <p>Loading...</p> : (
      <table style={s.table}><thead><tr>
        <th style={s.th}>Title</th><th style={s.th}>Slug</th><th style={s.th}>Status</th><th style={s.th}>Created</th><th style={s.th}></th>
      </tr></thead><tbody>
        {pages.map(p => (<tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(p)}>
          <td style={s.td}>{p.title}</td>
          <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 13 }}>/page/{p.slug}</td>
          <td style={s.td}><span style={s.badge(p.published ? 'green' : 'gray')}>{p.published ? 'Published' : 'Draft'}</span></td>
          <td style={s.td}>{new Date(p.created_at).toLocaleDateString()}</td>
          <td style={s.td}><button style={s.btn(false)} onClick={e => { e.stopPropagation(); remove(p.id); }}>Delete</button></td>
        </tr>))}
        {!pages.length && <tr><td colSpan={5} style={{ ...s.td, textAlign: 'center', color: '#94a3b8' }}>No landing pages yet</td></tr>}
      </tbody></table>
    )}
    {modal && (<Modal title={modal === 'create' ? 'New Landing Page' : 'Edit Page'} onClose={() => setModal(null)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Title
          <input style={s.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: modal === 'create' ? toSlug(e.target.value) : f.slug }))} />
        </label>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Slug
          <input style={s.input} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
        </label>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Body
          <textarea style={{ ...s.input, minHeight: 120, resize: 'vertical' }} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
        </label>
        <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} /> Published
        </label>
        {modal !== 'create' && <div style={{ fontSize: 12, color: '#64748b' }}>Preview: <a href={`/page/${form.slug}`} target="_blank" rel="noreferrer">/page/{form.slug}</a></div>}
        <button style={s.btn(true)} onClick={save}>{modal === 'create' ? 'Create' : 'Save'}</button>
      </div>
    </Modal>)}
  </div>);
}

/* ── Tab 2: Instagram Embed ── */
function InstagramEmbed() {
  const [token, setToken] = useState(() => localStorage.getItem('ig_access_token') || '');
  const [accountId, setAccountId] = useState(() => localStorage.getItem('ig_account_id') || '');
  const [testResult, setTestResult] = useState(null);

  const saveConfig = () => {
    localStorage.setItem('ig_access_token', token);
    localStorage.setItem('ig_account_id', accountId);
  };

  const testConnection = () => {
    saveConfig();
    if (!token || !accountId) { setTestResult({ ok: false, msg: 'Please enter both fields' }); return; }
    setTestResult({ ok: true, msg: 'Connection configured. Live API test will be available once the Meta Graph API integration is complete.' });
  };

  return (<div>
    <div style={s.banner}>Connect your Instagram Business account to display your feed on the store homepage.</div>
    <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <label style={{ fontSize: 13, fontWeight: 600 }}>Instagram Access Token
        <input style={s.input} type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="EAABx..." />
      </label>
      <label style={{ fontSize: 13, fontWeight: 600 }}>Instagram Business Account ID
        <input style={s.input} value={accountId} onChange={e => setAccountId(e.target.value)} placeholder="17841400..." />
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={s.btn(true)} onClick={testConnection}>Test Connection</button>
        <button style={s.btn(false)} onClick={saveConfig}>Save</button>
      </div>
      {testResult && <div style={{ padding: '8px 12px', borderRadius: 6, background: testResult.ok ? '#dcfce7' : '#fee2e2', color: testResult.ok ? '#166534' : '#991b1b', fontSize: 13 }}>{testResult.msg}</div>}
    </div>
    <h3 style={{ fontSize: 16, fontWeight: 600, margin: '20px 0 12px' }}>Feed Preview (Mockup)</h3>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 400 }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} style={{ aspectRatio: '1', background: '#e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 20 }}>
          {['', '', '', '', '', '', '', '', ''][i] || ''}
        </div>
      ))}
    </div>
  </div>);
}

/* ── Tab 3: A/B Testing ── */
function ABTesting() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', element: '', variant_a: '', variant_b: '' });

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('ab_tests').select('*').order('created_at', { ascending: false });
    setTests(data || []); setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const create = async () => {
    await supabase.from('ab_tests').insert({ name: form.name, element: form.element, variant_a: form.variant_a, variant_b: form.variant_b, status: 'draft', impressions_a: 0, impressions_b: 0, conversions_a: 0, conversions_b: 0 });
    setModal(false); setForm({ name: '', element: '', variant_a: '', variant_b: '' }); fetch_();
  };

  const toggle = async (t) => {
    const next = t.status === 'running' ? 'completed' : 'running';
    await supabase.from('ab_tests').update({ status: next }).eq('id', t.id); fetch_();
  };

  const rate = (conv, imp) => imp > 0 ? ((conv / imp) * 100).toFixed(1) + '%' : '-';
  const winner = (t) => {
    if (t.status !== 'completed') return null;
    const rA = t.impressions_a > 0 ? t.conversions_a / t.impressions_a : 0;
    const rB = t.impressions_b > 0 ? t.conversions_b / t.impressions_b : 0;
    return rA > rB ? 'A' : rB > rA ? 'B' : 'Tie';
  };

  const stats = useMemo(() => {
    const active = tests.filter(t => t.status === 'running').length;
    const completed = tests.filter(t => t.status === 'completed').length;
    const lifts = tests.filter(t => t.status === 'completed').map(t => {
      const rA = t.impressions_a > 0 ? t.conversions_a / t.impressions_a : 0;
      const rB = t.impressions_b > 0 ? t.conversions_b / t.impressions_b : 0;
      const base = Math.min(rA, rB); return base > 0 ? ((Math.max(rA, rB) - base) / base) * 100 : 0;
    });
    const avgLift = lifts.length ? (lifts.reduce((a, b) => a + b, 0) / lifts.length).toFixed(1) + '%' : '-';
    return { active, completed, avgLift };
  }, [tests]);

  const statusColor = { draft: 'gray', running: 'blue', completed: 'green' };

  return (<div>
    <div style={s.statsRow}>
      <StatCard value={stats.active} label="Active Tests" /><StatCard value={stats.completed} label="Completed" /><StatCard value={stats.avgLift} label="Avg Lift" />
    </div>
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
      <button style={s.btn(true)} onClick={() => setModal(true)}>+ New Test</button>
    </div>
    {loading ? <p>Loading...</p> : (
      <div style={{ overflowX: 'auto' }}><table style={s.table}><thead><tr>
        <th style={s.th}>Name</th><th style={s.th}>Element</th><th style={s.th}>Imp A</th><th style={s.th}>Conv A</th><th style={s.th}>Rate A</th>
        <th style={s.th}>Imp B</th><th style={s.th}>Conv B</th><th style={s.th}>Rate B</th><th style={s.th}>Winner</th><th style={s.th}>Status</th><th style={s.th}></th>
      </tr></thead><tbody>
        {tests.map(t => (<tr key={t.id}>
          <td style={s.td}>{t.name}</td><td style={s.td}>{t.element}</td>
          <td style={s.td}>{t.impressions_a}</td><td style={s.td}>{t.conversions_a}</td><td style={s.td}>{rate(t.conversions_a, t.impressions_a)}</td>
          <td style={s.td}>{t.impressions_b}</td><td style={s.td}>{t.conversions_b}</td><td style={s.td}>{rate(t.conversions_b, t.impressions_b)}</td>
          <td style={s.td}>{winner(t) ? <span style={s.badge(winner(t) === 'Tie' ? 'yellow' : 'green')}>{winner(t)}</span> : '-'}</td>
          <td style={s.td}><span style={s.badge(statusColor[t.status])}>{t.status}</span></td>
          <td style={s.td}>{t.status !== 'completed' && <button style={s.btn(false)} onClick={() => toggle(t)}>{t.status === 'running' ? 'Stop' : 'Start'}</button>}</td>
        </tr>))}
        {!tests.length && <tr><td colSpan={11} style={{ ...s.td, textAlign: 'center', color: '#94a3b8' }}>No A/B tests yet</td></tr>}
      </tbody></table></div>
    )}
    {modal && (<Modal title="New A/B Test" onClose={() => setModal(false)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Test Name<input style={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Homepage CTA test" /></label>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Element Description<input style={s.input} value={form.element} onChange={e => setForm(f => ({ ...f, element: e.target.value }))} placeholder="Hero headline" /></label>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Variant A<input style={s.input} value={form.variant_a} onChange={e => setForm(f => ({ ...f, variant_a: e.target.value }))} /></label>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Variant B<input style={s.input} value={form.variant_b} onChange={e => setForm(f => ({ ...f, variant_b: e.target.value }))} /></label>
        <button style={s.btn(true)} onClick={create}>Create Test</button>
      </div>
    </Modal>)}
  </div>);
}

/* ── Tab 4: Heatmaps ── */
function Heatmaps() {
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState([]);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('click_events').select('*').order('created_at', { ascending: false }).limit(5000);
    setClicks(data || []); setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const grouped = useMemo(() => {
    const map = {};
    clicks.forEach(c => {
      const key = c.page_url || 'unknown';
      if (!map[key]) map[key] = { page: key, count: 0, items: [] };
      map[key].count++; map[key].items.push(c);
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [clicks]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      total: clicks.length,
      pages: grouped.length,
      today: clicks.filter(c => c.created_at && c.created_at.startsWith(today)).length,
    };
  }, [clicks, grouped]);

  const selectPage = (g) => { setSelected(g.page); setDetails(g.items); };

  const trackingSnippet = `<!-- Tapas Click Tracking -->\n<script src="/tracking.js"></script>`;

  return (<div>
    <div style={s.banner}>Add the tracking script to your store to start collecting click data. Configuration in Settings.</div>
    <div style={s.statsRow}>
      <StatCard value={stats.total} label="Total Clicks" /><StatCard value={stats.pages} label="Unique Pages" /><StatCard value={stats.today} label="Today's Clicks" />
    </div>

    {selected ? (<div>
      <button style={{ ...s.btn(false), marginBottom: 12 }} onClick={() => setSelected(null)}>&larr; Back to pages</button>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Click Density: {selected}</h3>
      <table style={s.table}><thead><tr>
        <th style={s.th}>Element</th><th style={s.th}>X</th><th style={s.th}>Y</th><th style={s.th}>Time</th>
      </tr></thead><tbody>
        {details.map((d, i) => (<tr key={i}>
          <td style={s.td}>{d.element || '-'}</td>
          <td style={s.td}>{d.x ?? '-'}</td><td style={s.td}>{d.y ?? '-'}</td>
          <td style={s.td}>{d.created_at ? new Date(d.created_at).toLocaleString() : '-'}</td>
        </tr>))}
      </tbody></table>
    </div>) : (<div>
      {loading ? <p>Loading...</p> : (
        <table style={s.table}><thead><tr>
          <th style={s.th}>Page</th><th style={s.th}>Total Clicks</th><th style={s.th}></th>
        </tr></thead><tbody>
          {grouped.map(g => (<tr key={g.page} style={{ cursor: 'pointer' }} onClick={() => selectPage(g)}>
            <td style={s.td}>{g.page}</td><td style={s.td}>{g.count}</td>
            <td style={s.td}><button style={s.btn(false)} onClick={e => { e.stopPropagation(); selectPage(g); }}>View</button></td>
          </tr>))}
          {!grouped.length && <tr><td colSpan={3} style={{ ...s.td, textAlign: 'center', color: '#94a3b8' }}>No click data collected yet</td></tr>}
        </tbody></table>
      )}
    </div>)}

    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Tracking Script</h3>
      <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: 16, borderRadius: 8, fontSize: 13, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{trackingSnippet}</pre>
    </div>
  </div>);
}

/* ── Main Page ── */
export default function AdvancedTools() {
  const [tab, setTab] = useState(0);

  return (<div style={s.page}>
    <h1 style={{ ...s.h1, marginBottom: 20 }}>Advanced Tools</h1>
    <div style={s.tabs}>
      {TABS.map((t, i) => <button key={t} style={s.tab(i === tab)} onClick={() => setTab(i)}>{t}</button>)}
    </div>
    {tab === 0 && <LandingPages />}
    {tab === 1 && <InstagramEmbed />}
    {tab === 2 && <ABTesting />}
    {tab === 3 && <Heatmaps />}
  </div>);
}
