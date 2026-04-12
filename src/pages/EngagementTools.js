import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { key: 'clubs',   label: 'Book Clubs',   icon: '\uD83D\uDCDA' },
  { key: 'quiz',    label: 'Reader Quiz',   icon: '\uD83E\uDDE0' },
  { key: 'exit',    label: 'Exit Intent',   icon: '\uD83D\uDCE9' },
];

const QUIZ_QUESTIONS = [
  'What genre do you enjoy most?',
  'Fiction or non-fiction?',
  'Last book you loved?',
  'How many books do you read per month?',
  'Do you prefer physical or digital?',
];

export default function EngagementTools() {
  const { staff } = useAuth();
  const [tab, setTab] = useState('clubs');

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div>
          <h1 style={S.title}>Engagement Tools</h1>
          <p style={S.subtitle}>Book clubs, reader quizzes, and email capture</p>
        </div>
      </header>
      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            ...S.tab,
            color: tab === t.key ? '#0f172a' : '#64748b',
            borderBottom: tab === t.key ? '2px solid #D4A853' : '2px solid transparent',
            fontWeight: tab === t.key ? 700 : 500,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {tab === 'clubs' && <BookClubsTab staffId={staff?.id} />}
      {tab === 'quiz'  && <ReaderQuizTab />}
      {tab === 'exit'  && <ExitIntentTab />}
    </div>
  );
}

/* ================================================================== */
/*  Book Clubs Tab                                                     */
/* ================================================================== */

function BookClubsTab({ staffId }) {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedClub, setSelectedClub] = useState(null);
  const [rsvps, setRsvps] = useState([]);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('book_clubs').select('*, book_club_rsvps(id)').order('meeting_date', { ascending: false });
    setClubs((data || []).map(c => ({ ...c, rsvp_count: c.book_club_rsvps?.length || 0 })));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form) => {
    const { error } = await supabase.from('book_clubs').insert({ ...form, created_by: staffId });
    if (!error) { setShowCreate(false); fetch(); }
  };

  const toggle = async (id, active) => {
    await supabase.from('book_clubs').update({ active: !active }).eq('id', id);
    fetch();
  };

  const remove = async (id) => {
    await supabase.from('book_clubs').delete().eq('id', id);
    fetch();
  };

  const viewRsvps = async (club) => {
    setSelectedClub(club);
    const { data } = await supabase.from('book_club_rsvps').select('*').eq('book_club_id', club.id).order('created_at', { ascending: false });
    setRsvps(data || []);
  };

  const activeCount = clubs.filter(c => c.active !== false).length;
  const totalRsvps = clubs.reduce((s, c) => s + c.rsvp_count, 0);

  const cols = [
    { key: 'title', label: 'Title', render: r => <span style={{ cursor: 'pointer', color: '#D4A853', fontWeight: 600 }} onClick={() => viewRsvps(r)}>{r.title}</span> },
    { key: 'book_pick', label: 'Book Pick' },
    { key: 'meeting_date', label: 'Date', render: r => r.meeting_date ? new Date(r.meeting_date).toLocaleDateString() : '-' },
    { key: 'rsvps', label: 'RSVPs / Cap', render: r => `${r.rsvp_count} / ${r.capacity || '\u221E'}` },
    { key: 'active', label: 'Active', render: r => (
      <button onClick={() => toggle(r.id, r.active !== false)} style={{ ...S.iconBtn, color: r.active !== false ? '#22c55e' : '#94a3b8' }}>
        {r.active !== false ? '\u2714' : '\u25CB'}
      </button>
    )},
    { key: 'actions', label: '', render: r => (
      <button onClick={() => remove(r.id)} style={{ ...S.iconBtn, color: '#ef4444' }} title="Delete">\uD83D\uDDD1</button>
    )},
  ];

  if (loading) return <div style={S.empty}>Loading...</div>;

  return (
    <>
      <div style={S.statsRow}>
        <StatCard label="Active Clubs" value={activeCount} icon="\uD83D\uDCDA" />
        <StatCard label="Total RSVPs" value={totalRsvps} icon="\uD83D\uDE4B" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button onClick={() => setShowCreate(true)} style={S.primaryBtn}>+ New Club</button>
      </div>
      <DataTable cols={cols} rows={clubs} empty="No book clubs yet" />
      {showCreate && <CreateClubModal onCreate={create} onClose={() => setShowCreate(false)} />}
      {selectedClub && (
        <Modal title={`RSVPs \u2014 ${selectedClub.title}`} onClose={() => setSelectedClub(null)}>
          {rsvps.length === 0 ? <p style={{ color: '#64748b', fontSize: '14px' }}>No RSVPs yet.</p> : (
            <DataTable cols={[
              { key: 'name', label: 'Name', render: r => r.name || r.email || 'Anonymous' },
              { key: 'email', label: 'Email', render: r => r.email || '-' },
              { key: 'created_at', label: 'Date', render: r => new Date(r.created_at).toLocaleDateString() },
            ]} rows={rsvps} />
          )}
        </Modal>
      )}
    </>
  );
}

function CreateClubModal({ onCreate, onClose }) {
  const [form, setForm] = useState({ title: '', description: '', book_pick: '', meeting_date: '', location: '', capacity: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await onCreate({ ...form, capacity: form.capacity ? parseInt(form.capacity, 10) : null });
    setSaving(false);
  };

  return (
    <Modal title="Create Book Club" onClose={onClose}>
      <div style={S.field}><label style={S.label}>TITLE</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} style={S.input} placeholder="e.g. Mystery Mondays" /></div>
      <div style={S.field}><label style={S.label}>DESCRIPTION</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} style={{ ...S.input, minHeight: '60px', resize: 'vertical' }} placeholder="Optional description" /></div>
      <div style={S.field}><label style={S.label}>BOOK PICK</label>
        <input value={form.book_pick} onChange={e => set('book_pick', e.target.value)} style={S.input} placeholder="Current book selection" /></div>
      <div style={S.formRow}>
        <div style={{ flex: 1 }}><label style={S.label}>MEETING DATE</label>
          <input type="datetime-local" value={form.meeting_date} onChange={e => set('meeting_date', e.target.value)} style={S.input} /></div>
        <div style={{ flex: 1 }}><label style={S.label}>LOCATION</label>
          <input value={form.location} onChange={e => set('location', e.target.value)} style={S.input} placeholder="e.g. Reading Room" /></div>
      </div>
      <div style={S.field}><label style={S.label}>CAPACITY</label>
        <input type="number" min="1" value={form.capacity} onChange={e => set('capacity', e.target.value)} style={S.input} placeholder="Leave blank for unlimited" /></div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button onClick={onClose} style={S.cancelBtn}>Cancel</button>
        <button onClick={submit} disabled={saving || !form.title.trim()} style={S.primaryBtn}>{saving ? 'Creating...' : 'Create Club'}</button>
      </div>
    </Modal>
  );
}

/* ================================================================== */
/*  Reader Quiz Tab                                                    */
/* ================================================================== */

function ReaderQuizTab() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('reader_quizzes').select('*').order('created_at', { ascending: false });
      setSubmissions(data || []);
      setLoading(false);
    })();
  }, []);

  const withEmail = submissions.filter(s => s.email).length;
  const cols = [
    { key: 'email', label: 'Email', render: r => r.email || <span style={{ color: '#94a3b8' }}>Anonymous</span> },
    { key: 'answers', label: 'Answers Preview', render: r => {
      const txt = typeof r.answers === 'string' ? r.answers : JSON.stringify(r.answers || {});
      return <span style={{ fontSize: '12px', color: '#64748b' }}>{txt.slice(0, 50)}{txt.length > 50 ? '...' : ''}</span>;
    }},
    { key: 'recommended_books', label: 'Recommended', render: r => r.recommended_books || '-' },
    { key: 'created_at', label: 'Date', render: r => new Date(r.created_at).toLocaleDateString() },
  ];

  if (loading) return <div style={S.empty}>Loading...</div>;

  return (
    <>
      <div style={S.statsRow}>
        <StatCard label="Total Submissions" value={submissions.length} icon="\uD83D\uDCCB" />
        <StatCard label="With Email" value={withEmail} icon="\uD83D\uDCE7" />
        <StatCard label="Without Email" value={submissions.length - withEmail} icon="\uD83D\uDC64" />
      </div>
      <DataTable cols={cols} rows={submissions} empty="No quiz submissions yet" />
      <section style={{ marginTop: '32px', padding: '24px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
        <h3 style={S.sectionTitle}>Quiz Configuration</h3>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
          The quiz form will appear on the store at /quiz. Configure questions below.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {QUIZ_QUESTIONS.map((q, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#D4A853', minWidth: '22px' }}>Q{i + 1}</span>
              <span style={{ fontSize: '14px', color: '#0f172a' }}>{q}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '12px', marginBottom: 0 }}>
          Question editing coming soon. These are used by the customer-facing quiz.
        </p>
      </section>
    </>
  );
}

/* ================================================================== */
/*  Exit Intent Tab                                                    */
/* ================================================================== */

function ExitIntentTab() {
  const [captures, setCaptures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [headline, setHeadline] = useState(() => localStorage.getItem('exit_popup_headline') || 'Wait! Get 10% off your first order');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('email_captures').select('*').order('created_at', { ascending: false });
      setCaptures(data || []);
      setLoading(false);
    })();
  }, []);

  const saveHeadline = (v) => {
    setHeadline(v);
    localStorage.setItem('exit_popup_headline', v);
  };

  const toggleConverted = async (id, current) => {
    await supabase.from('email_captures').update({ converted: !current }).eq('id', id);
    setCaptures(prev => prev.map(c => c.id === id ? { ...c, converted: !current } : c));
  };

  const now = new Date();
  const thisMonth = captures.filter(c => {
    const d = new Date(c.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const converted = captures.filter(c => c.converted).length;

  const cols = [
    { key: 'email', label: 'Email' },
    { key: 'source', label: 'Source', render: r => r.source || 'exit-intent' },
    { key: 'converted', label: 'Converted', render: r => (
      <button onClick={() => toggleConverted(r.id, r.converted)} style={{ ...S.iconBtn, color: r.converted ? '#22c55e' : '#94a3b8' }}>
        {r.converted ? '\u2714' : '\u25CB'}
      </button>
    )},
    { key: 'created_at', label: 'Date', render: r => new Date(r.created_at).toLocaleDateString() },
  ];

  if (loading) return <div style={S.empty}>Loading...</div>;

  return (
    <>
      <div style={S.statsRow}>
        <StatCard label="Total Captures" value={captures.length} icon="\uD83D\uDCE9" />
        <StatCard label="This Month" value={thisMonth} icon="\uD83D\uDCC5" />
        <StatCard label="Converted" value={converted} icon="\u2705" />
      </div>
      <DataTable cols={cols} rows={captures} empty="No email captures yet" />
      <section style={{ marginTop: '32px', padding: '24px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
        <h3 style={S.sectionTitle}>Popup Configuration</h3>
        <div style={S.field}>
          <label style={S.label}>POPUP HEADLINE</label>
          <input value={headline} onChange={e => saveHeadline(e.target.value)} style={S.input} placeholder="Enter headline text" />
        </div>
        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px' }}>Preview:</p>
        <div style={{ maxWidth: '340px', margin: '0 auto', background: 'white', border: '2px solid #D4A853', borderRadius: '16px', padding: '28px 24px', textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.10)' }}>
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>&#128218;</div>
          <h4 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>{headline}</h4>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 14px' }}>Enter your email and never miss a deal.</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input disabled placeholder="you@email.com" style={{ ...S.input, flex: 1, background: '#f8fafc', fontSize: '13px' }} />
            <button disabled style={{ ...S.primaryBtn, fontSize: '13px', padding: '8px 14px', opacity: 0.8 }}>Subscribe</button>
          </div>
          <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '10px', marginBottom: 0 }}>We respect your privacy.</p>
        </div>
      </section>
    </>
  );
}

/* ================================================================== */
/*  Shared Components                                                  */
/* ================================================================== */

function StatCard({ label, value, icon }) {
  return (
    <div style={S.statCard}>
      <div style={{ fontSize: '24px', marginBottom: '6px' }}>{icon}</div>
      <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

function DataTable({ cols, rows, empty }) {
  if (!rows.length) return <div style={S.empty}>{empty || 'No data'}</div>;
  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead>
          <tr>{cols.map(c => <th key={c.key} style={S.th}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i}>
              {cols.map(c => <td key={c.key} style={S.td}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <>
      <div style={S.backdrop} onClick={onClose} />
      <div style={S.modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{title}</h2>
          <button onClick={onClose} style={{ ...S.iconBtn, fontSize: '18px' }}>&times;</button>
        </div>
        {children}
      </div>
    </>
  );
}

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */

const S = {
  root: { padding: '28px 32px 60px', maxWidth: '1100px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  title: { margin: 0, fontSize: '28px', fontWeight: 800, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: '13px', color: '#64748b' },
  tabs: { display: 'flex', gap: '4px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', overflowX: 'auto' },
  tab: { padding: '10px 18px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', marginBottom: '-1px', whiteSpace: 'nowrap' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' },
  statCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', textAlign: 'center' },
  primaryBtn: { padding: '10px 20px', background: 'linear-gradient(135deg, #D4A853, #C49040)', color: '#1a0f08', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' },
  cancelBtn: { flex: 1, padding: '12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#475569', fontFamily: 'inherit' },
  tableWrap: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '10px 14px', background: '#f8fafc', color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', color: '#0f172a' },
  iconBtn: { width: '32px', height: '32px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'transparent', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  empty: { padding: '60px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px' },
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 100 },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', zIndex: 101, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' },
  field: { marginBottom: '16px' },
  formRow: { display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-end' },
  label: { display: 'block', fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', color: '#0f172a', background: 'white', boxSizing: 'border-box' },
  sectionTitle: { fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '12px', marginTop: 0 },
};
