import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

// =====================================================================
// StorePromoCodes — staff editor for the `store_promo_codes` table
// consumed by the tapas-store checkout flow.
//
// This is intentionally separate from PromoCodes.js (which manages the
// older marketing `promo_codes` table — different column shape). The
// schema lives in supabase/migrations/20260416_phase9.sql.
// =====================================================================

const emptyForm = {
  code: '',
  description: '',
  kind: 'percent',
  value: 10,
  min_total: 0,
  max_discount: '',
  max_uses: '',
  max_uses_per_member: 1,
  starts_at: '',
  expires_at: '',
  is_active: true,
};

export default function StorePromoCodes() {
  const [codes, setCodes] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [codesRes, redRes] = await Promise.all([
      supabase.from('store_promo_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('store_promo_redemptions').select('id, promo_code_id, discount_amount, created_at').order('created_at', { ascending: false }).limit(200),
    ]);
    setCodes(codesRes.data || []);
    setRedemptions(redRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      code: c.code || '',
      description: c.description || '',
      kind: c.kind || 'percent',
      value: c.value ?? 10,
      min_total: c.min_total ?? 0,
      max_discount: c.max_discount ?? '',
      max_uses: c.max_uses ?? '',
      max_uses_per_member: c.max_uses_per_member ?? 1,
      starts_at: c.starts_at ? c.starts_at.slice(0, 16) : '',
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : '',
      is_active: c.is_active !== false,
    });
    setError('');
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) { setError('Code is required.'); return; }
    if (!(Number(form.value) > 0)) { setError('Value must be greater than zero.'); return; }
    if (form.kind === 'percent' && Number(form.value) > 100) { setError('Percent value cannot exceed 100.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || null,
        kind: form.kind,
        value: Number(form.value),
        min_total: Number(form.min_total) || 0,
        max_discount: form.max_discount === '' ? null : Number(form.max_discount),
        max_uses: form.max_uses === '' ? null : Number(form.max_uses),
        max_uses_per_member: form.max_uses_per_member === '' ? null : Number(form.max_uses_per_member),
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        is_active: !!form.is_active,
      };
      const { error: err } = editing
        ? await supabase.from('store_promo_codes').update(payload).eq('id', editing.id)
        : await supabase.from('store_promo_codes').insert(payload);
      if (err) throw err;
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id, val) => {
    await supabase.from('store_promo_codes').update({ is_active: val }).eq('id', id);
    setCodes(prev => prev.map(c => c.id === id ? { ...c, is_active: val } : c));
  };

  const removeCode = async (id) => {
    if (!window.confirm('Delete this promo code? Past redemptions will also be removed (cascade).')) return;
    await supabase.from('store_promo_codes').delete().eq('id', id);
    load();
  };

  const useCount = (id) => redemptions.filter(r => r.promo_code_id === id).length;
  const totalSaved = redemptions.reduce((s, r) => s + Number(r.discount_amount || 0), 0);

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm(f => ({ ...f, code }));
  };

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div>
          <h1 style={S.title}>🏷️ Storefront promo codes</h1>
          <p style={S.subtitle}>Discount codes consumed by tapas-store checkout (separate from in-store POS promos).</p>
        </div>
        <button onClick={openCreate} style={S.primaryBtn}>+ New code</button>
      </header>

      <div style={S.statsRow}>
        <Stat label="Codes" value={codes.length} />
        <Stat label="Active" value={codes.filter(c => c.is_active).length} />
        <Stat label="Times redeemed" value={redemptions.length} />
        <Stat label="Total saved by customers" value={`₹${totalSaved.toFixed(0)}`} />
      </div>

      {loading ? (
        <div style={S.empty}>Loading…</div>
      ) : codes.length === 0 ? (
        <div style={S.empty}>
          <h3 style={{ margin: '0 0 6px' }}>No codes yet</h3>
          <p style={{ color: '#64748b', fontSize: 13 }}>Create your first storefront promo code.</p>
        </div>
      ) : (
        <div style={S.grid}>
          {codes.map(c => {
            const expired = c.expires_at && new Date(c.expires_at) <= new Date();
            const live = c.is_active && !expired;
            const remaining = c.max_uses == null ? null : c.max_uses - useCount(c.id);
            return (
              <div key={c.id} style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <div style={S.codePill}>{c.code}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>{c.description || 'No description'}</div>
                  </div>
                  <span style={{ ...S.statusBadge, background: live ? '#dcfce7' : '#fee2e2', color: live ? '#166534' : '#991b1b' }}>
                    {live ? 'LIVE' : 'INACTIVE'}
                  </span>
                </div>
                <div style={S.discountBadge}>
                  {c.kind === 'percent' ? `${c.value}% off` : `₹${c.value} off`}
                  {c.min_total > 0 && ` · min ₹${c.min_total}`}
                  {c.max_discount && c.kind === 'percent' && ` · cap ₹${c.max_discount}`}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: '#64748b', margin: '12px 0' }}>
                  <span>Used: <strong style={{ color: '#0f172a' }}>{useCount(c.id)}</strong></span>
                  {remaining !== null && <span>Left: <strong style={{ color: remaining > 0 ? '#0f172a' : '#dc2626' }}>{remaining}</strong></span>}
                  {c.max_uses_per_member && <span>Per member: <strong>{c.max_uses_per_member}</strong></span>}
                </div>
                {c.expires_at && (
                  <div style={{ fontSize: 11, color: expired ? '#dc2626' : '#64748b', marginBottom: 10 }}>
                    {expired ? '⛔ Expired' : `⏰ Expires ${new Date(c.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#475569' }}>
                    <input type="checkbox" checked={c.is_active} onChange={e => toggleActive(c.id, e.target.checked)} />
                    Active
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(c)} style={S.iconBtn} title="Edit">✏️</button>
                    <button onClick={() => removeCode(c.id)} style={S.iconBtn} title="Delete">🗑</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <>
          <div onClick={() => setShowForm(false)} style={S.backdrop} />
          <div style={S.modal}>
            <h2 style={{ margin: '0 0 18px', fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
              {editing ? '✏️ Edit promo code' : '➕ New promo code'}
            </h2>
            {error && <div style={S.error}>{error}</div>}
            <form onSubmit={submit}>
              <div style={S.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>CODE</label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="SUMMER20" style={S.input} required />
                </div>
                <button type="button" onClick={generateCode} style={S.genBtn}>🎲</button>
              </div>
              <div style={S.field}>
                <label style={S.label}>DESCRIPTION (optional)</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Summer sale on the storefront" style={S.input} />
              </div>
              <div style={S.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>KIND</label>
                  <select value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value }))} style={S.input}>
                    <option value="percent">Percent (%)</option>
                    <option value="flat">Flat (₹)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>VALUE</label>
                  <input type="number" min="0" step="0.01" value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: e.target.value }))} style={S.input} required />
                </div>
              </div>
              <div style={S.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>MIN ORDER (₹)</label>
                  <input type="number" min="0" value={form.min_total}
                    onChange={e => setForm(f => ({ ...f, min_total: e.target.value }))} style={S.input} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>MAX DISCOUNT (₹, optional)</label>
                  <input type="number" min="0" value={form.max_discount}
                    onChange={e => setForm(f => ({ ...f, max_discount: e.target.value }))} placeholder="No cap" style={S.input} />
                </div>
              </div>
              <div style={S.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>MAX TOTAL USES</label>
                  <input type="number" min="0" value={form.max_uses}
                    onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="Unlimited" style={S.input} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>MAX USES PER MEMBER</label>
                  <input type="number" min="0" value={form.max_uses_per_member}
                    onChange={e => setForm(f => ({ ...f, max_uses_per_member: e.target.value }))} style={S.input} />
                </div>
              </div>
              <div style={S.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>STARTS AT (optional)</label>
                  <input type="datetime-local" value={form.starts_at}
                    onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} style={S.input} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>EXPIRES AT (optional)</label>
                  <input type="datetime-local" value={form.expires_at}
                    onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} style={S.input} />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: '#475569' }}>
                <input type="checkbox" checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                Active
              </label>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setShowForm(false)} style={S.cancelBtn}>Cancel</button>
                <button type="submit" disabled={saving} style={S.primaryBtn}>
                  {saving ? '⏳ Saving…' : editing ? 'Save changes' : 'Create code'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={S.statCard}>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  );
}

const S = {
  root: { padding: '28px 32px 60px', maxWidth: 1100, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
  title: { margin: 0, fontSize: 26, fontWeight: 800, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: 13, color: '#64748b', maxWidth: 640 },
  primaryBtn: { padding: '10px 20px', background: 'linear-gradient(135deg, #D4A853, #C49040)', color: '#1a0f08', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 },
  statCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, textAlign: 'center' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 },
  card: { background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: 18 },
  codePill: { display: 'inline-block', padding: '6px 14px', borderRadius: 8, background: '#0f172a', fontFamily: 'ui-monospace, monospace', fontSize: 16, fontWeight: 800, color: '#D4A853', letterSpacing: 1.6 },
  statusBadge: { padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700 },
  discountBadge: { display: 'inline-block', marginTop: 12, padding: '4px 14px', borderRadius: 99, background: '#dcfce7', color: '#166534', fontSize: 13, fontWeight: 700 },
  iconBtn: { width: 32, height: 32, border: '1px solid #e2e8f0', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 14 },
  empty: { padding: '60px 20px', textAlign: 'center', color: '#64748b', fontSize: 14, background: '#f8fafc', borderRadius: 14, border: '1px dashed #cbd5e1' },
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 100 },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', zIndex: 101, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' },
  error: { background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#dc2626', fontSize: 13, fontWeight: 600 },
  field: { marginBottom: 14 },
  formRow: { display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-end' },
  label: { display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', color: '#0f172a', background: 'white', boxSizing: 'border-box' },
  genBtn: { padding: '10px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' },
  cancelBtn: { flex: 1, padding: 12, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#475569', fontFamily: 'inherit' },
};
