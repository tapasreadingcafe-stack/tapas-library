import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// Promo Codes — create, manage, and track discount codes
// =====================================================================

export default function PromoCodes() {
  const { staff } = useAuth();
  const [codes, setCodes] = useState([]);
  const [uses, setUses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState('active'); // active | expired | all

  const load = useCallback(async () => {
    setLoading(true);
    const [codesRes, usesRes] = await Promise.all([
      supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('promo_code_uses').select('*, members(name, email)').order('used_at', { ascending: false }).limit(50),
    ]);
    setCodes(codesRes.data || []);
    setUses(usesRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = codes.filter(c => {
    if (tab === 'active') return c.is_active && (!c.expires_at || new Date(c.expires_at) > new Date());
    if (tab === 'expired') return !c.is_active || (c.expires_at && new Date(c.expires_at) <= new Date());
    return true;
  });

  const toggleActive = async (id, val) => {
    await supabase.from('promo_codes').update({ is_active: val }).eq('id', id);
    setCodes(prev => prev.map(c => c.id === id ? { ...c, is_active: val } : c));
  };

  const deleteCode = async (id) => {
    if (!window.confirm('Delete this promo code and all its usage history?')) return;
    await supabase.from('promo_codes').delete().eq('id', id);
    setCodes(prev => prev.filter(c => c.id !== id));
  };

  const totalSaved = uses.reduce((s, u) => s + Number(u.discount_amount || 0), 0);

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div>
          <h1 style={S.title}>🏷️ Promo Codes</h1>
          <p style={S.subtitle}>Create and manage discount codes for your customers</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={S.primaryBtn}>
          + Create code
        </button>
      </header>

      {/* Stats */}
      <div style={S.statsRow}>
        <StatCard label="Total codes" value={codes.length} icon="🏷️" />
        <StatCard label="Active" value={codes.filter(c => c.is_active).length} icon="✅" />
        <StatCard label="Times used" value={uses.length} icon="🔄" />
        <StatCard label="Total saved by customers" value={`₹${totalSaved.toFixed(0)}`} icon="💰" />
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {['active', 'expired', 'all'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            ...S.tab,
            color: tab === t ? '#0f172a' : '#64748b',
            borderBottom: tab === t ? '2px solid #D4A853' : '2px solid transparent',
            fontWeight: tab === t ? 700 : 500,
          }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Code list */}
      {loading ? (
        <div style={S.empty}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏷️</div>
          <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>No promo codes yet</h3>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Create your first code to start giving discounts.</p>
        </div>
      ) : (
        <div style={S.grid}>
          {filtered.map(code => (
            <CodeCard
              key={code.id}
              code={code}
              useCount={uses.filter(u => u.promo_id === code.id).length}
              onToggle={(val) => toggleActive(code.id, val)}
              onDelete={() => deleteCode(code.id)}
            />
          ))}
        </div>
      )}

      {/* Recent usage */}
      {uses.length > 0 && (
        <section style={{ marginTop: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Recent usage</h2>
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Code</th>
                  <th style={S.th}>Member</th>
                  <th style={S.th}>Discount</th>
                  <th style={S.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {uses.slice(0, 20).map(u => {
                  const code = codes.find(c => c.id === u.promo_id);
                  return (
                    <tr key={u.id}>
                      <td style={S.td}><span style={S.codePill}>{code?.code || '—'}</span></td>
                      <td style={S.td}>{u.members?.name || u.members?.email || '—'}</td>
                      <td style={S.td}>₹{Number(u.discount_amount).toFixed(0)}</td>
                      <td style={S.td}>{new Date(u.used_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreatePromoModal
          staffId={staff?.id}
          onCreated={() => { setShowCreate(false); load(); }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

function CodeCard({ code, useCount, onToggle, onDelete }) {
  const expired = code.expires_at && new Date(code.expires_at) <= new Date();
  const remaining = code.max_uses ? code.max_uses - code.used_count : null;

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={S.codePillLarge}>{code.code}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>{code.description || 'No description'}</div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => navigator.clipboard?.writeText(code.code)}
            style={S.iconBtn} title="Copy code"
          >📋</button>
          <button onClick={onDelete} style={S.iconBtn} title="Delete">🗑</button>
        </div>
      </div>

      <div style={S.discountBadge}>
        {code.discount_type === 'percentage'
          ? `${code.discount_value}% off`
          : `₹${code.discount_value} off`}
        {code.min_order > 0 && ` · min ₹${code.min_order}`}
      </div>

      <div style={{ display: 'flex', gap: '16px', margin: '14px 0', fontSize: '12px', color: '#64748b' }}>
        <span>Used: <strong style={{ color: '#0f172a' }}>{useCount}</strong></span>
        {remaining !== null && <span>Left: <strong style={{ color: remaining > 0 ? '#0f172a' : '#dc2626' }}>{remaining}</strong></span>}
        <span>Applies to: <strong>{code.applies_to}</strong></span>
      </div>

      {code.expires_at && (
        <div style={{ fontSize: '11px', color: expired ? '#dc2626' : '#64748b', marginBottom: '10px' }}>
          {expired ? '⛔ Expired' : `⏰ Expires ${new Date(code.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#475569' }}>
          <input type="checkbox" checked={code.is_active} onChange={e => onToggle(e.target.checked)} style={{ accentColor: '#D4A853' }} />
          Active
        </label>
        <span style={{
          padding: '3px 10px', borderRadius: '99px', fontSize: '10px', fontWeight: 700,
          background: code.is_active && !expired ? '#dcfce7' : '#fee2e2',
          color: code.is_active && !expired ? '#166534' : '#991b1b',
        }}>
          {code.is_active && !expired ? 'LIVE' : 'INACTIVE'}
        </span>
      </div>
    </div>
  );
}

function CreatePromoModal({ staffId, onCreated, onClose }) {
  const [form, setForm] = useState({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    min_order: 0,
    max_uses: '',
    per_member: 1,
    applies_to: 'all',
    expires_at: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'TAPAS';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm(f => ({ ...f, code }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) return setError('Code is required.');
    setSaving(true); setError('');
    try {
      const { error: err } = await supabase.from('promo_codes').insert({
        code: form.code.trim().toUpperCase(),
        description: form.description,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order: Number(form.min_order) || 0,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        per_member: Number(form.per_member) || 1,
        applies_to: form.applies_to,
        expires_at: form.expires_at || null,
        created_by: staffId,
      });
      if (err) throw err;
      onCreated();
    } catch (err) {
      setError(err.message || 'Failed to create.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={S.backdrop} />
      <div style={S.modal}>
        <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
          🏷️ Create promo code
        </h2>

        {error && <div style={S.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={S.formRow}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>CODE</label>
              <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="SUMMER20" style={S.input} required />
            </div>
            <button type="button" onClick={generateCode} style={S.genBtn}>🎲 Generate</button>
          </div>

          <div style={S.field}>
            <label style={S.label}>DESCRIPTION (optional)</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Summer sale — 20% off everything" style={S.input} />
          </div>

          <div style={S.formRow}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>DISCOUNT TYPE</label>
              <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))} style={S.input}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed amount (₹)</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>VALUE</label>
              <input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                min="1" style={S.input} required />
            </div>
          </div>

          <div style={S.formRow}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>MIN ORDER (₹)</label>
              <input type="number" value={form.min_order} onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))}
                min="0" style={S.input} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>MAX TOTAL USES</label>
              <input type="number" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                placeholder="Unlimited" style={S.input} />
            </div>
          </div>

          <div style={S.formRow}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>PER MEMBER LIMIT</label>
              <input type="number" value={form.per_member} onChange={e => setForm(f => ({ ...f, per_member: e.target.value }))}
                min="1" style={S.input} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>APPLIES TO</label>
              <select value={form.applies_to} onChange={e => setForm(f => ({ ...f, applies_to: e.target.value }))} style={S.input}>
                <option value="all">All items</option>
                <option value="books">Books only</option>
                <option value="membership">Memberships only</option>
              </select>
            </div>
          </div>

          <div style={S.field}>
            <label style={S.label}>EXPIRES AT (optional)</label>
            <input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              style={S.input} />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            <button type="button" onClick={onClose} style={S.cancelBtn}>Cancel</button>
            <button type="submit" disabled={saving} style={S.primaryBtn}>
              {saving ? '⏳ Creating…' : '✓ Create code'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div style={S.statCard}>
      <div style={{ fontSize: '24px', marginBottom: '6px' }}>{icon}</div>
      <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const S = {
  root: { padding: '28px 32px 60px', maxWidth: '1100px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' },
  title: { margin: 0, fontSize: '28px', fontWeight: 800, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: '13px', color: '#64748b' },
  primaryBtn: { padding: '10px 20px', background: 'linear-gradient(135deg, #D4A853, #C49040)', color: '#1a0f08', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '28px' },
  statCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', textAlign: 'center' },
  tabs: { display: 'flex', gap: '4px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' },
  tab: { padding: '10px 18px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', marginBottom: '-1px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' },
  card: { background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '20px', transition: 'border-color 150ms' },
  codePill: { display: 'inline-block', padding: '2px 10px', borderRadius: '6px', background: '#f1f5f9', fontFamily: 'ui-monospace, monospace', fontSize: '12px', fontWeight: 700, color: '#0f172a', letterSpacing: '1px' },
  codePillLarge: { display: 'inline-block', padding: '6px 16px', borderRadius: '8px', background: '#0f172a', fontFamily: 'ui-monospace, monospace', fontSize: '18px', fontWeight: 800, color: '#D4A853', letterSpacing: '2px' },
  discountBadge: { display: 'inline-block', padding: '4px 14px', borderRadius: '99px', background: '#dcfce7', color: '#166534', fontSize: '13px', fontWeight: 700 },
  iconBtn: { width: '32px', height: '32px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'transparent', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  empty: { padding: '60px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px' },
  tableWrap: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '10px 14px', background: '#f8fafc', color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', color: '#0f172a' },
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 100 },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', zIndex: 101, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' },
  error: { background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#dc2626', fontSize: '13px', fontWeight: 600 },
  field: { marginBottom: '16px' },
  formRow: { display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-end' },
  label: { display: 'block', fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', color: '#0f172a', background: 'white', boxSizing: 'border-box' },
  genBtn: { padding: '10px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  cancelBtn: { flex: 1, padding: '12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#475569', fontFamily: 'inherit' },
};
