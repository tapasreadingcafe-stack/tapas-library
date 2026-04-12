import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

const ACCENT = '#D4A853';
const BORDER = '#e2e8f0';
const BG = '#f8fafc';
const TEXT = '#0f172a';
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const STEPS = ['welcome_email', 'quiz', 'first_visit_offer', 'book_recs', 'completed'];
const STEP_LABELS = { welcome_email: 'Welcome Email', quiz: 'Quiz', first_visit_offer: 'First Visit Offer', book_recs: 'Book Recs', completed: 'Completed' };

const s = {
  page: { fontFamily: FONT, color: TEXT, padding: '24px', maxWidth: 1200, margin: '0 auto' },
  h1: { fontSize: 24, fontWeight: 700, margin: 0 },
  tabs: { display: 'flex', gap: 4, borderBottom: `2px solid ${BORDER}`, marginBottom: 24, overflowX: 'auto' },
  tab: (a) => ({ padding: '10px 18px', cursor: 'pointer', border: 'none', background: 'none', fontFamily: FONT, fontSize: 14, fontWeight: a ? 600 : 400, color: a ? ACCENT : '#64748b', borderBottom: a ? `2px solid ${ACCENT}` : '2px solid transparent', marginBottom: -2, whiteSpace: 'nowrap' }),
  card: { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20, marginBottom: 16 },
  statRow: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 },
  btn: (primary) => ({ padding: '8px 18px', borderRadius: 6, border: primary ? 'none' : `1px solid ${BORDER}`, background: primary ? ACCENT : '#fff', color: primary ? '#fff' : TEXT, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: 'pointer' }),
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 8px', borderBottom: `2px solid ${BORDER}`, fontWeight: 600, fontSize: 12, color: '#64748b', textTransform: 'uppercase' },
  td: { padding: '10px 8px', borderBottom: `1px solid ${BORDER}` },
  input: { padding: '8px 12px', border: `1px solid ${BORDER}`, borderRadius: 6, fontFamily: FONT, fontSize: 13, width: '100%', boxSizing: 'border-box' },
  badge: (c) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: c === 'green' ? '#dcfce7' : c === 'red' ? '#fee2e2' : c === 'yellow' ? '#fef9c3' : '#f1f5f9', color: c === 'green' ? '#166534' : c === 'red' ? '#991b1b' : c === 'yellow' ? '#854d0e' : '#475569' }),
  empty: { textAlign: 'center', padding: 40, color: '#94a3b8' },
};

/* ── Shared components ── */
function StatCard({ label, value, sub }) {
  return (
    <div style={{ ...s.card, flex: '1 1 160px', minWidth: 140, marginBottom: 0 }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function DataTable({ columns, rows, empty }) {
  if (!rows.length) return <div style={s.empty}>{empty || 'No data'}</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={s.table}>
        <thead><tr>{columns.map((c, i) => <th key={i} style={s.th}>{c.label}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={r._key || i}>{columns.map((c, j) => <td key={j} style={s.td}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, minWidth: 340, maxWidth: 520, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }}>x</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProgressBar({ steps, current }) {
  const idx = STEPS.indexOf(current);
  const pct = current === 'completed' ? 100 : Math.round(((idx + 1) / STEPS.length) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: current === 'completed' ? '#22c55e' : ACCENT, borderRadius: 4, transition: 'width .3s' }} />
      </div>
      <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{pct}%</span>
    </div>
  );
}

/* ── Tab: Welcome Journey ── */
function WelcomeJourney() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('welcome_journey').select('*, members(name, email)').order('created_at', { ascending: false }).limit(200);
      setRows(data || []);
    } catch { setRows([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startForNew = async () => {
    setActing(true); setResult('');
    try {
      const { data: allMembers } = await supabase.from('members').select('id').eq('status', 'active');
      const { data: existing } = await supabase.from('welcome_journey').select('member_id');
      const existingIds = new Set((existing || []).map(e => e.member_id));
      const newIds = (allMembers || []).filter(m => !existingIds.has(m.id));
      if (!newIds.length) { setResult('All members already have a journey.'); setActing(false); return; }
      const inserts = newIds.map(m => ({ member_id: m.id, current_step: 'welcome_email' }));
      const { error } = await supabase.from('welcome_journey').insert(inserts);
      if (error) throw error;
      setResult(`Started journey for ${inserts.length} new member(s).`);
      load();
    } catch (e) { setResult('Error: ' + (e.message || 'Failed')); }
    setActing(false);
  };

  const advanceStep = async (row) => {
    const idx = STEPS.indexOf(row.current_step);
    if (idx >= STEPS.length - 1) return;
    const next = STEPS[idx + 1];
    const updates = { current_step: next };
    updates[`${next}_at`] = new Date().toISOString();
    await supabase.from('welcome_journey').update(updates).eq('id', row.id);
    load();
  };

  const stats = { total: rows.length, completed: rows.filter(r => r.current_step === 'completed').length };

  return (
    <div>
      <div style={s.statRow}>
        <StatCard label="Journeys Started" value={stats.total} />
        <StatCard label="Completed" value={stats.completed} sub={stats.total ? `${Math.round(stats.completed / stats.total * 100)}% completion` : ''} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={s.btn(true)} onClick={startForNew} disabled={acting}>{acting ? 'Starting...' : 'Start journey for new members'}</button>
        {result && <span style={{ fontSize: 13, color: '#64748b' }}>{result}</span>}
      </div>
      {loading ? <div style={s.empty}>Loading...</div> : (
        <DataTable
          columns={[
            { label: 'Member', render: r => r.members?.name || '—' },
            { label: 'Email', render: r => r.members?.email || '—' },
            { label: 'Current Step', render: r => <span style={s.badge(r.current_step === 'completed' ? 'green' : 'yellow')}>{STEP_LABELS[r.current_step] || r.current_step}</span> },
            { label: 'Progress', render: r => <ProgressBar current={r.current_step} /> },
            { label: '', render: r => r.current_step !== 'completed' && <button style={s.btn(false)} onClick={() => advanceStep(r)}>Next Step</button> },
          ]}
          rows={rows}
          empty="No journeys yet. Click the button to start."
        />
      )}
    </div>
  );
}

/* ── Tab: Low Stock ── */
function LowStock() {
  const [books, setBooks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: bkData }, { data: alData }] = await Promise.all([
        supabase.from('books').select('id, title, quantity_available, quantity_total').lte('quantity_available', 2).order('quantity_available').limit(200),
        supabase.from('low_stock_alerts').select('*').order('created_at', { ascending: false }).limit(100),
      ]);
      setBooks(bkData || []);
      setAlerts(alData || []);
    } catch { setBooks([]); setAlerts([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generateAlerts = async () => {
    setActing(true); setResult('');
    try {
      const existing = new Set((alerts || []).map(a => a.book_id));
      const newBooks = books.filter(b => !existing.has(b.id));
      if (!newBooks.length) { setResult('All low-stock books already have alerts.'); setActing(false); return; }
      const inserts = newBooks.map(b => ({ book_id: b.id, book_title: b.title, quantity_available: b.quantity_available, actioned: false }));
      const { error } = await supabase.from('low_stock_alerts').insert(inserts);
      if (error) throw error;
      setResult(`Generated ${inserts.length} alert(s).`);
      load();
    } catch (e) { setResult('Error: ' + (e.message || 'Failed')); }
    setActing(false);
  };

  const toggleActioned = async (alert) => {
    await supabase.from('low_stock_alerts').update({ actioned: !alert.actioned }).eq('id', alert.id);
    load();
  };

  return (
    <div>
      <div style={s.statRow}>
        <StatCard label="Low Stock Books" value={books.length} sub="quantity <= 2" />
        <StatCard label="Alerts Generated" value={alerts.length} />
        <StatCard label="Actioned" value={alerts.filter(a => a.actioned).length} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button style={s.btn(true)} onClick={generateAlerts} disabled={acting}>{acting ? 'Generating...' : 'Generate alerts'}</button>
        {result && <span style={{ fontSize: 13, color: '#64748b' }}>{result}</span>}
      </div>
      {loading ? <div style={s.empty}>Loading...</div> : (
        <>
          <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>Low Stock Books</h4>
          <DataTable
            columns={[
              { label: 'Title', key: 'title' },
              { label: 'Available', key: 'quantity_available' },
              { label: 'Total Copies', key: 'quantity_total' },
            ]}
            rows={books}
            empty="No books with low stock."
          />
          {alerts.length > 0 && (
            <>
              <h4 style={{ margin: '24px 0 8px', fontSize: 14 }}>Alerts</h4>
              <DataTable
                columns={[
                  { label: 'Book', key: 'book_title' },
                  { label: 'Qty', key: 'quantity_available' },
                  { label: 'Status', render: r => <span style={s.badge(r.actioned ? 'green' : 'red')}>{r.actioned ? 'Actioned' : 'Pending'}</span> },
                  { label: '', render: r => <button style={s.btn(false)} onClick={() => toggleActioned(r)}>{r.actioned ? 'Undo' : 'Mark Actioned'}</button> },
                ]}
                rows={alerts}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ── Tab: Fine Reminders ── */
function FineReminders() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reminded, setReminded] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fine_reminded') || '{}'); } catch { return {}; }
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: overdueData } = await supabase.from('circulation').select('member_id, due_date, fine_paid, fine_amount, members(id, name, email)').eq('status', 'checked_out').lt('due_date', todayStr).eq('fine_paid', false);
      const map = {};
      (overdueData || []).forEach(row => {
        const mid = row.member_id;
        if (!map[mid]) map[mid] = { id: mid, name: row.members?.name || '—', email: row.members?.email || '—', totalFine: 0, items: 0 };
        const days = Math.max(0, Math.floor((new Date() - new Date(row.due_date)) / 86400000));
        map[mid].totalFine += days * 10;
        map[mid].items += 1;
      });
      setMembers(Object.values(map).sort((a, b) => b.totalFine - a.totalFine));
    } catch { setMembers([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markReminded = (id) => {
    const next = { ...reminded, [id]: new Date().toISOString() };
    setReminded(next);
    localStorage.setItem('fine_reminded', JSON.stringify(next));
  };

  const totalFines = members.reduce((s, m) => s + m.totalFine, 0);

  return (
    <div>
      <div style={s.statRow}>
        <StatCard label="Total Outstanding" value={`\u20B9${totalFines.toLocaleString('en-IN')}`} />
        <StatCard label="Members With Fines" value={members.length} />
      </div>
      {loading ? <div style={s.empty}>Loading...</div> : (
        <DataTable
          columns={[
            { label: 'Member', key: 'name' },
            { label: 'Email', key: 'email' },
            { label: 'Overdue Items', key: 'items' },
            { label: 'Fine Balance', render: r => `\u20B9${r.totalFine.toLocaleString('en-IN')}` },
            { label: 'Reminded', render: r => reminded[r.id] ? <span style={s.badge('green')}>Yes ({new Date(reminded[r.id]).toLocaleDateString('en-IN')})</span> : <span style={s.badge('red')}>No</span> },
            { label: '', render: r => <button style={s.btn(false)} onClick={() => markReminded(r.id)}>{reminded[r.id] ? 'Re-remind' : 'Mark Reminded'}</button> },
          ]}
          rows={members}
          empty="No members with outstanding fines."
        />
      )}
    </div>
  );
}

/* ── Tab: Win-back ── */
function Winback() {
  const [members, setMembers] = useState([]);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 60);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      const [{ data: mData }, { data: circData }, { data: tData }] = await Promise.all([
        supabase.from('members').select('id, name, email, subscription_end, created_at').eq('status', 'active'),
        supabase.from('circulation').select('member_id, checkout_date').eq('status', 'returned').order('checkout_date', { ascending: false }).limit(2000),
        supabase.from('winback_targets').select('*').order('created_at', { ascending: false }).limit(200),
      ]);
      const lastBorrow = {};
      (circData || []).forEach(c => { if (!lastBorrow[c.member_id] || c.checkout_date > lastBorrow[c.member_id]) lastBorrow[c.member_id] = c.checkout_date; });
      const now = new Date();
      const inactive = (mData || []).filter(m => {
        const lastDate = lastBorrow[m.id] || m.subscription_end || m.created_at;
        return lastDate && new Date(lastDate) < cutoff;
      }).map(m => {
        const lastDate = lastBorrow[m.id] || m.subscription_end || m.created_at;
        return { ...m, lastActive: lastDate, daysInactive: Math.floor((now - new Date(lastDate)) / 86400000) };
      }).sort((a, b) => b.daysInactive - a.daysInactive);
      setMembers(inactive);
      setTargets(tData || []);
    } catch { setMembers([]); setTargets([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generateList = async () => {
    setActing(true); setResult('');
    try {
      const existingIds = new Set((targets || []).map(t => t.member_id));
      const newM = members.filter(m => !existingIds.has(m.id));
      if (!newM.length) { setResult('All inactive members already in win-back list.'); setActing(false); return; }
      const inserts = newM.map(m => ({ member_id: m.id, member_name: m.name, member_email: m.email, days_inactive: m.daysInactive, sent: false }));
      const { error } = await supabase.from('winback_targets').insert(inserts);
      if (error) throw error;
      setResult(`Added ${inserts.length} member(s) to win-back list.`);
      load();
    } catch (e) { setResult('Error: ' + (e.message || 'Failed')); }
    setActing(false);
  };

  const markSent = async (t) => {
    await supabase.from('winback_targets').update({ sent: true, sent_at: new Date().toISOString() }).eq('id', t.id);
    load();
  };

  return (
    <div>
      <div style={s.statRow}>
        <StatCard label="Inactive Members" value={members.length} sub="60+ days" />
        <StatCard label="Win-back Targets" value={targets.length} />
        <StatCard label="Sent" value={targets.filter(t => t.sent).length} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button style={s.btn(true)} onClick={generateList} disabled={acting}>{acting ? 'Generating...' : 'Generate win-back list'}</button>
        {result && <span style={{ fontSize: 13, color: '#64748b' }}>{result}</span>}
      </div>
      {loading ? <div style={s.empty}>Loading...</div> : (
        <>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Inactive Members</h4>
          <DataTable
            columns={[
              { label: 'Name', key: 'name' },
              { label: 'Email', key: 'email' },
              { label: 'Days Inactive', key: 'daysInactive' },
              { label: 'Last Active', render: r => r.lastActive ? new Date(r.lastActive).toLocaleDateString('en-IN') : '—' },
            ]}
            rows={members}
            empty="No inactive members found."
          />
          {targets.length > 0 && (
            <>
              <h4 style={{ margin: '24px 0 8px', fontSize: 14 }}>Win-back Targets</h4>
              <DataTable
                columns={[
                  { label: 'Name', key: 'member_name' },
                  { label: 'Email', key: 'member_email' },
                  { label: 'Days Inactive', key: 'days_inactive' },
                  { label: 'Status', render: r => <span style={s.badge(r.sent ? 'green' : 'red')}>{r.sent ? 'Sent' : 'Pending'}</span> },
                  { label: '', render: r => !r.sent && <button style={s.btn(false)} onClick={() => markSent(r)}>Mark Sent</button> },
                ]}
                rows={targets}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ── Tab: Google Reviews ── */
function GoogleReviews() {
  const [placeUrl, setPlaceUrl] = useState(() => localStorage.getItem('google_review_url') || '');
  const [copied, setCopied] = useState(false);
  const [visitors, setVisitors] = useState([]);
  const [asked, setAsked] = useState(() => {
    try { return JSON.parse(localStorage.getItem('review_asked') || '{}'); } catch { return {}; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
        const { data } = await supabase.from('circulation').select('member_id, checkout_date, members(id, name, email)').gte('checkout_date', cutoff.toISOString().split('T')[0]).order('checkout_date', { ascending: false }).limit(300);
        const seen = new Set();
        const unique = [];
        (data || []).forEach(r => {
          if (r.members && !seen.has(r.member_id)) { seen.add(r.member_id); unique.push({ id: r.member_id, name: r.members.name, email: r.members.email, lastVisit: r.checkout_date }); }
        });
        setVisitors(unique);
      } catch { setVisitors([]); }
      setLoading(false);
    })();
  }, []);

  const saveUrl = (v) => { setPlaceUrl(v); localStorage.setItem('google_review_url', v); };
  const reviewLink = placeUrl ? (placeUrl.startsWith('http') ? placeUrl : `https://search.google.com/local/writereview?placeid=${placeUrl}`) : '';

  const copyLink = () => {
    if (!reviewLink) return;
    navigator.clipboard.writeText(reviewLink).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const markAsked = (id) => {
    const next = { ...asked, [id]: new Date().toISOString() };
    setAsked(next);
    localStorage.setItem('review_asked', JSON.stringify(next));
  };

  return (
    <div>
      <div style={s.card}>
        <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>Google Business Review Link</h4>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input style={{ ...s.input, maxWidth: 400 }} placeholder="Place ID or full Google review URL" value={placeUrl} onChange={e => saveUrl(e.target.value)} />
          <button style={s.btn(true)} onClick={copyLink} disabled={!reviewLink}>{copied ? 'Copied!' : 'Copy link'}</button>
        </div>
        {reviewLink && <div style={{ marginTop: 8, fontSize: 12, color: '#64748b', wordBreak: 'break-all' }}>{reviewLink}</div>}
      </div>
      <h4 style={{ margin: '20px 0 8px', fontSize: 14 }}>Recent Visitors (last 30 days)</h4>
      {loading ? <div style={s.empty}>Loading...</div> : (
        <DataTable
          columns={[
            { label: 'Name', key: 'name' },
            { label: 'Email', key: 'email' },
            { label: 'Last Visit', render: r => r.lastVisit ? new Date(r.lastVisit).toLocaleDateString('en-IN') : '—' },
            { label: 'Asked', render: r => asked[r.id] ? <span style={s.badge('green')}>Yes ({new Date(asked[r.id]).toLocaleDateString('en-IN')})</span> : <span style={s.badge('red')}>No</span> },
            { label: '', render: r => <button style={s.btn(false)} onClick={() => markAsked(r.id)}>{asked[r.id] ? 'Re-ask' : 'Mark Asked'}</button> },
          ]}
          rows={visitors}
          empty="No recent visitors found."
        />
      )}
    </div>
  );
}

/* ── Main Page ── */
const TABS = [
  { key: 'welcome', label: 'Welcome Journey' },
  { key: 'lowstock', label: 'Low Stock' },
  { key: 'fines', label: 'Fine Reminders' },
  { key: 'winback', label: 'Win-back' },
  { key: 'reviews', label: 'Google Reviews' },
];

export default function Automations() {
  const [tab, setTab] = useState('welcome');

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={s.h1}>Automations</h1>
      </div>
      <div style={s.tabs}>
        {TABS.map(t => <button key={t.key} style={s.tab(tab === t.key)} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>
      <div style={s.card}>
        {tab === 'welcome' && <WelcomeJourney />}
        {tab === 'lowstock' && <LowStock />}
        {tab === 'fines' && <FineReminders />}
        {tab === 'winback' && <Winback />}
        {tab === 'reviews' && <GoogleReviews />}
      </div>
    </div>
  );
}
