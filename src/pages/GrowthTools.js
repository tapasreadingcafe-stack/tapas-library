import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// Growth Tools — referrals, segments, waitlist, NPS, challenges
// =====================================================================

const TABS = [
  { key: 'referrals',  label: 'Referrals',     icon: '🎟️' },
  { key: 'segments',   label: 'Segments',      icon: '🎯' },
  { key: 'waitlist',   label: 'Waitlist',      icon: '📨' },
  { key: 'nps',        label: 'NPS / Feedback', icon: '📊' },
  { key: 'challenges', label: 'Challenges',    icon: '🏆' },
];

export default function GrowthTools() {
  const { staff } = useAuth();
  const [tab, setTab] = useState('referrals');

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div>
          <h1 style={S.title}>Member Growth Tools</h1>
          <p style={S.subtitle}>Referrals, segments, waitlist, feedback, and reading challenges</p>
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
      {tab === 'referrals'  && <ReferralsTab staffId={staff?.id} />}
      {tab === 'segments'   && <SegmentsTab />}
      {tab === 'waitlist'   && <WaitlistTab />}
      {tab === 'nps'        && <NPSTab staffId={staff?.id} />}
      {tab === 'challenges' && <ChallengesTab staffId={staff?.id} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Shared helpers                                                    */
/* ═══════════════════════════════════════════════════════════════════ */

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
          <button onClick={onClose} style={{ ...S.iconBtn, fontSize: '18px' }}>×</button>
        </div>
        {children}
      </div>
    </>
  );
}

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtShort = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';

/* ═══════════════════════════════════════════════════════════════════ */
/*  1. REFERRALS                                                      */
/* ═══════════════════════════════════════════════════════════════════ */

function ReferralsTab({ staffId }) {
  const [codes, setCodes] = useState([]);
  const [uses, setUses] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, uRes, mRes] = await Promise.all([
      supabase.from('referral_codes').select('*, members(name)').order('created_at', { ascending: false }),
      supabase.from('referral_uses').select('*, referral_codes(code), members(name)').order('used_at', { ascending: false }).limit(30),
      supabase.from('members').select('id, name').eq('status', 'active').order('name'),
    ]);
    setCodes(cRes.data || []);
    setUses(uRes.data || []);
    setMembers(mRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const topReferrer = codes.reduce((best, c) => (!best || c.use_count > best.use_count) ? c : best, null);
  const totalUses = codes.reduce((s, c) => s + (c.use_count || 0), 0);

  const toggleActive = async (id, val) => {
    await supabase.from('referral_codes').update({ is_active: val }).eq('id', id);
    setCodes(prev => prev.map(c => c.id === id ? { ...c, is_active: val } : c));
  };

  const createCode = async (memberId) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    const name = member.name.replace(/\s+/g, '').toUpperCase().slice(0, 8);
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `REF-${name}-${rand}`;
    await supabase.from('referral_codes').insert({ member_id: memberId, code, is_active: true, use_count: 0, created_by: staffId });
    setShowCreate(false);
    load();
  };

  if (loading) return <div style={S.empty}>Loading...</div>;

  return (
    <>
      <div style={S.statsRow}>
        <StatCard label="Total codes" value={codes.length} icon="🎟️" />
        <StatCard label="Total uses" value={totalUses} icon="🔄" />
        <StatCard label="Top referrer" value={topReferrer?.members?.name || '—'} icon="👑" />
        <StatCard label="Active codes" value={codes.filter(c => c.is_active).length} icon="✅" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button onClick={() => setShowCreate(true)} style={S.primaryBtn}>+ Create referral code</button>
      </div>
      <DataTable
        cols={[
          { key: 'member', label: 'Member', render: r => r.members?.name || '—' },
          { key: 'code', label: 'Code', render: r => <span style={S.codePill}>{r.code}</span> },
          { key: 'use_count', label: 'Uses' },
          { key: 'active', label: 'Active', render: r => (
            <input type="checkbox" checked={r.is_active} onChange={e => toggleActive(r.id, e.target.checked)} style={{ accentColor: '#D4A853' }} />
          )},
          { key: 'date', label: 'Created', render: r => fmtShort(r.created_at) },
        ]}
        rows={codes}
        empty="No referral codes yet"
      />
      {uses.length > 0 && (
        <section style={{ marginTop: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Recent referral uses</h3>
          <DataTable
            cols={[
              { key: 'code', label: 'Code', render: r => <span style={S.codePill}>{r.referral_codes?.code || '—'}</span> },
              { key: 'member', label: 'New member', render: r => r.members?.name || '—' },
              { key: 'date', label: 'Date', render: r => fmtShort(r.used_at) },
            ]}
            rows={uses}
          />
        </section>
      )}
      {showCreate && (
        <CreateReferralModal members={members} onCreate={createCode} onClose={() => setShowCreate(false)} />
      )}
    </>
  );
}

function CreateReferralModal({ members, onCreate, onClose }) {
  const [memberId, setMemberId] = useState('');
  return (
    <Modal title="Create referral code" onClose={onClose}>
      <div style={S.field}>
        <label style={S.label}>SELECT MEMBER</label>
        <select value={memberId} onChange={e => setMemberId(e.target.value)} style={S.input}>
          <option value="">— Choose a member —</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px' }}>
        Code will be auto-generated as REF-MEMBERNAME-XXXX
      </p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={onClose} style={S.cancelBtn}>Cancel</button>
        <button onClick={() => memberId && onCreate(memberId)} disabled={!memberId} style={S.primaryBtn}>Create code</button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  2. SEGMENTS                                                       */
/* ═══════════════════════════════════════════════════════════════════ */

function SegmentsTab() {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('member_segments').select('*').order('created_at', { ascending: false });
    setSegments(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteSegment = async (id) => {
    if (!window.confirm('Delete this segment?')) return;
    await supabase.from('member_segments').delete().eq('id', id);
    setSegments(prev => prev.filter(s => s.id !== id));
  };

  if (loading) return <div style={S.empty}>Loading...</div>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{segments.length} saved segment{segments.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowCreate(true)} style={S.primaryBtn}>+ Create segment</button>
      </div>
      <DataTable
        cols={[
          { key: 'name', label: 'Name', render: r => <strong>{r.name}</strong> },
          { key: 'description', label: 'Description' },
          { key: 'filters', label: 'Filters', render: r => {
            const f = r.filters || {};
            const parts = [];
            if (f.plan && f.plan !== 'All') parts.push(`Plan: ${f.plan}`);
            if (f.status && f.status !== 'All') parts.push(`Status: ${f.status}`);
            if (f.joined_after) parts.push(`After: ${fmtShort(f.joined_after)}`);
            return <span style={{ fontSize: '12px', color: '#64748b' }}>{parts.join(' · ') || 'None'}</span>;
          }},
          { key: 'member_count', label: 'Members', render: r => <strong>{r.member_count ?? '—'}</strong> },
          { key: 'actions', label: '', render: r => (
            <button onClick={() => deleteSegment(r.id)} style={S.iconBtn} title="Delete">🗑</button>
          )},
        ]}
        rows={segments}
        empty="No segments yet. Create one to group your members."
      />
      {showCreate && <CreateSegmentModal onCreated={() => { setShowCreate(false); load(); }} onClose={() => setShowCreate(false)} />}
    </>
  );
}

function CreateSegmentModal({ onCreated, onClose }) {
  const [form, setForm] = useState({ name: '', description: '', plan: 'All', status: 'All', joined_after: '' });
  const [count, setCount] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const countMembers = async () => {
    let q = supabase.from('members').select('id', { count: 'exact', head: true });
    if (form.plan !== 'All') q = q.eq('plan', form.plan);
    if (form.status !== 'All') q = q.eq('status', form.status.toLowerCase());
    if (form.joined_after) q = q.gte('created_at', form.joined_after);
    const { count: c } = await q;
    setCount(c ?? 0);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const filters = {};
    if (form.plan !== 'All') filters.plan = form.plan;
    if (form.status !== 'All') filters.status = form.status;
    if (form.joined_after) filters.joined_after = form.joined_after;
    await supabase.from('member_segments').insert({ name: form.name.trim(), description: form.description.trim(), filters, member_count: count });
    setSaving(false);
    onCreated();
  };

  return (
    <Modal title="Create segment" onClose={onClose}>
      <div style={S.field}>
        <label style={S.label}>NAME</label>
        <input value={form.name} onChange={e => set('name', e.target.value)} style={S.input} placeholder="e.g. Gold active readers" />
      </div>
      <div style={S.field}>
        <label style={S.label}>DESCRIPTION</label>
        <input value={form.description} onChange={e => set('description', e.target.value)} style={S.input} placeholder="Optional description" />
      </div>
      <div style={S.formRow}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>PLAN</label>
          <select value={form.plan} onChange={e => set('plan', e.target.value)} style={S.input}>
            {['All', 'Basic', 'Silver', 'Gold'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>STATUS</label>
          <select value={form.status} onChange={e => set('status', e.target.value)} style={S.input}>
            {['All', 'Active', 'Expired'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div style={S.field}>
        <label style={S.label}>JOINED AFTER</label>
        <input type="date" value={form.joined_after} onChange={e => set('joined_after', e.target.value)} style={S.input} />
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', margin: '16px 0' }}>
        <button onClick={countMembers} style={S.genBtn}>Count members</button>
        {count !== null && <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{count} member{count !== 1 ? 's' : ''} match</span>}
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={onClose} style={S.cancelBtn}>Cancel</button>
        <button onClick={save} disabled={saving || !form.name.trim()} style={S.primaryBtn}>{saving ? 'Saving...' : 'Save segment'}</button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  3. WAITLIST                                                       */
/* ═══════════════════════════════════════════════════════════════════ */

function WaitlistTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('wishlists')
        .select('*, books(id, title, author, stock_qty)')
        .eq('is_waitlist', true)
        .order('created_at', { ascending: false });
      // Group by book
      const byBook = {};
      (data || []).forEach(w => {
        const bid = w.book_id;
        if (!byBook[bid]) byBook[bid] = { book: w.books, count: 0, id: bid };
        byBook[bid].count++;
      });
      setItems(Object.values(byBook).sort((a, b) => b.count - a.count));
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={S.empty}>Loading...</div>;

  return (
    <>
      <div style={S.statsRow}>
        <StatCard label="Books with waitlist" value={items.length} icon="📚" />
        <StatCard label="Total waiting" value={items.reduce((s, i) => s + i.count, 0)} icon="⏳" />
      </div>
      <DataTable
        cols={[
          { key: 'title', label: 'Book', render: r => (
            <div>
              <div style={{ fontWeight: 600 }}>{r.book?.title || '—'}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>{r.book?.author || ''}</div>
            </div>
          )},
          { key: 'count', label: 'Waiting', render: r => <strong>{r.count}</strong> },
          { key: 'stock', label: 'Stock', render: r => {
            const qty = r.book?.stock_qty ?? 0;
            return (
              <span style={{
                padding: '2px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700,
                background: qty > 0 ? '#dcfce7' : '#fee2e2',
                color: qty > 0 ? '#166534' : '#991b1b',
              }}>
                {qty > 0 ? `${qty} in stock` : 'Out of stock'}
              </span>
            );
          }},
        ]}
        rows={items}
        empty="No waitlist items. Members can join a waitlist when a book is out of stock."
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  4. NPS / FEEDBACK                                                 */
/* ═══════════════════════════════════════════════════════════════════ */

function NPSTab({ staffId }) {
  const [responses, setResponses] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [rRes, mRes] = await Promise.all([
      supabase.from('feedback_responses').select('*, members(name)').order('created_at', { ascending: false }),
      supabase.from('members').select('id, name').eq('status', 'active').order('name'),
    ]);
    setResponses(rRes.data || []);
    setMembers(mRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const scores = responses.map(r => r.score).filter(s => s != null);
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
  const promoters = scores.filter(s => s >= 9).length;
  const detractors = scores.filter(s => s <= 6).length;

  const addResponse = async (form) => {
    await supabase.from('feedback_responses').insert({
      member_id: form.member_id || null,
      score: parseInt(form.score),
      comment: form.comment || null,
      created_by: staffId,
    });
    setShowCreate(false);
    load();
  };

  if (loading) return <div style={S.empty}>Loading...</div>;

  return (
    <>
      <div style={S.statsRow}>
        <StatCard label="Avg NPS score" value={avg} icon="📊" />
        <StatCard label="Total responses" value={responses.length} icon="📝" />
        <StatCard label="Promoters (9-10)" value={promoters} icon="😍" />
        <StatCard label="Detractors (0-6)" value={detractors} icon="😟" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button onClick={() => setShowCreate(true)} style={S.primaryBtn}>+ Add response</button>
      </div>
      <DataTable
        cols={[
          { key: 'member', label: 'Member', render: r => r.members?.name || 'Anonymous' },
          { key: 'score', label: 'Score', render: r => (
            <span style={{
              display: 'inline-block', width: '32px', height: '32px', lineHeight: '32px', textAlign: 'center',
              borderRadius: '8px', fontWeight: 800, fontSize: '14px',
              background: r.score >= 9 ? '#dcfce7' : r.score <= 6 ? '#fee2e2' : '#fef3c7',
              color: r.score >= 9 ? '#166534' : r.score <= 6 ? '#991b1b' : '#92400e',
            }}>{r.score}</span>
          )},
          { key: 'comment', label: 'Comment', render: r => (
            <span style={{ fontSize: '13px', color: '#475569' }}>{r.comment || '—'}</span>
          )},
          { key: 'date', label: 'Date', render: r => fmtShort(r.created_at) },
        ]}
        rows={responses}
        empty="No feedback yet. Add your first NPS response."
      />
      {showCreate && <CreateFeedbackModal members={members} onCreate={addResponse} onClose={() => setShowCreate(false)} />}
    </>
  );
}

function CreateFeedbackModal({ members, onCreate, onClose }) {
  const [form, setForm] = useState({ member_id: '', score: '8', comment: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal title="Add feedback response" onClose={onClose}>
      <div style={S.field}>
        <label style={S.label}>MEMBER (optional)</label>
        <select value={form.member_id} onChange={e => set('member_id', e.target.value)} style={S.input}>
          <option value="">Anonymous</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div style={S.field}>
        <label style={S.label}>NPS SCORE (0-10)</label>
        <input type="number" min="0" max="10" value={form.score} onChange={e => set('score', e.target.value)} style={S.input} />
      </div>
      <div style={S.field}>
        <label style={S.label}>COMMENT</label>
        <textarea value={form.comment} onChange={e => set('comment', e.target.value)} style={{ ...S.input, minHeight: '80px', resize: 'vertical' }} placeholder="Optional feedback comment" />
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={onClose} style={S.cancelBtn}>Cancel</button>
        <button onClick={() => onCreate(form)} style={S.primaryBtn}>Save response</button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  5. CHALLENGES                                                     */
/* ═══════════════════════════════════════════════════════════════════ */

function ChallengesTab({ staffId }) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('reading_challenges').select('*').order('start_date', { ascending: false });
    setChallenges(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const now = new Date().toISOString().slice(0, 10);
  const active = challenges.filter(c => c.start_date <= now && c.end_date >= now);
  const past = challenges.filter(c => c.end_date < now);
  const upcoming = challenges.filter(c => c.start_date > now);

  const deleteChallenge = async (id) => {
    if (!window.confirm('Delete this challenge?')) return;
    await supabase.from('reading_challenges').delete().eq('id', id);
    setChallenges(prev => prev.filter(c => c.id !== id));
  };

  const saveChallenge = async (form) => {
    await supabase.from('reading_challenges').insert({
      title: form.title,
      description: form.description || null,
      goal: parseInt(form.goal),
      reward: form.reward || null,
      start_date: form.start_date,
      end_date: form.end_date,
      created_by: staffId,
    });
    setShowCreate(false);
    load();
  };

  if (loading) return <div style={S.empty}>Loading...</div>;

  const challengeCols = [
    { key: 'title', label: 'Title', render: r => <strong>{r.title}</strong> },
    { key: 'goal', label: 'Goal', render: r => `${r.goal} books` },
    { key: 'reward', label: 'Reward', render: r => r.reward || '—' },
    { key: 'dates', label: 'Dates', render: r => `${fmtShort(r.start_date)} — ${fmtShort(r.end_date)}` },
    { key: 'participants', label: 'Participants', render: r => r.participant_count ?? 0 },
    { key: 'actions', label: '', render: r => (
      <button onClick={() => deleteChallenge(r.id)} style={S.iconBtn} title="Delete">🗑</button>
    )},
  ];

  return (
    <>
      <div style={S.statsRow}>
        <StatCard label="Active" value={active.length} icon="🔥" />
        <StatCard label="Upcoming" value={upcoming.length} icon="🗓️" />
        <StatCard label="Past" value={past.length} icon="✅" />
        <StatCard label="Total" value={challenges.length} icon="🏆" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button onClick={() => setShowCreate(true)} style={S.primaryBtn}>+ New challenge</button>
      </div>
      {active.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h3 style={S.sectionTitle}>Active challenges</h3>
          <DataTable cols={challengeCols} rows={active} />
        </section>
      )}
      {upcoming.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h3 style={S.sectionTitle}>Upcoming</h3>
          <DataTable cols={challengeCols} rows={upcoming} />
        </section>
      )}
      {past.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h3 style={S.sectionTitle}>Past challenges</h3>
          <DataTable cols={challengeCols} rows={past} />
        </section>
      )}
      {challenges.length === 0 && (
        <div style={S.empty}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏆</div>
          <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>No reading challenges yet</h3>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Create one to motivate your members!</p>
        </div>
      )}
      {showCreate && <CreateChallengeModal onCreate={saveChallenge} onClose={() => setShowCreate(false)} />}
    </>
  );
}

function CreateChallengeModal({ onCreate, onClose }) {
  const [form, setForm] = useState({ title: '', description: '', goal: '5', reward: '', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim() || !form.start_date || !form.end_date) return;
    setSaving(true);
    await onCreate(form);
    setSaving(false);
  };

  return (
    <Modal title="Create reading challenge" onClose={onClose}>
      <div style={S.field}>
        <label style={S.label}>TITLE</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} style={S.input} placeholder="e.g. Summer Reading Challenge" />
      </div>
      <div style={S.field}>
        <label style={S.label}>DESCRIPTION</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} style={{ ...S.input, minHeight: '60px', resize: 'vertical' }} placeholder="Optional description" />
      </div>
      <div style={S.formRow}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>GOAL (BOOKS)</label>
          <input type="number" min="1" value={form.goal} onChange={e => set('goal', e.target.value)} style={S.input} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>REWARD</label>
          <input value={form.reward} onChange={e => set('reward', e.target.value)} style={S.input} placeholder="e.g. Free coffee" />
        </div>
      </div>
      <div style={S.formRow}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>START DATE</label>
          <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} style={S.input} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>END DATE</label>
          <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} style={S.input} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button onClick={onClose} style={S.cancelBtn}>Cancel</button>
        <button onClick={submit} disabled={saving || !form.title.trim()} style={S.primaryBtn}>{saving ? 'Creating...' : 'Create challenge'}</button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Styles                                                            */
/* ═══════════════════════════════════════════════════════════════════ */

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
  genBtn: { padding: '10px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  tableWrap: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '10px 14px', background: '#f8fafc', color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', color: '#0f172a' },
  codePill: { display: 'inline-block', padding: '2px 10px', borderRadius: '6px', background: '#f1f5f9', fontFamily: 'ui-monospace, monospace', fontSize: '12px', fontWeight: 700, color: '#0f172a', letterSpacing: '1px' },
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
