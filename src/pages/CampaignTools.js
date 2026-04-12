import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// Campaign Tools — flash sales, banners, QR codes, content calendar
// =====================================================================

const TABS = [
  { key: 'flash-sales', label: 'Flash Sales', icon: '⚡' },
  { key: 'banners', label: 'Pop-up Banners', icon: '📢' },
  { key: 'qr-codes', label: 'QR Codes', icon: '📱' },
  { key: 'calendar', label: 'Content Calendar', icon: '📅' },
];

const CHANNEL_COLORS = { instagram: '#E1306C', facebook: '#1877F2', whatsapp: '#25D366', email: '#D4A853', blog: '#8B5CF6', 'in-store': '#F59E0B' };
const CHANNELS = Object.keys(CHANNEL_COLORS);
const POSITIONS = ['top', 'bottom', 'center', 'slide'];
const APPLIES_TO = ['all', 'fiction', 'non-fiction', 'children'];
const CAL_STATUSES = ['planned', 'drafted', 'published'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const now = () => new Date();
const toLocal = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const toDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';
const saleStatus = (s) => { const n = now(); if (new Date(s.starts_at) > n) return 'upcoming'; if (new Date(s.ends_at) < n) return 'ended'; return 'active'; };
const bannerStatus = (b) => { const n = now(); if (new Date(b.starts_at) > n) return 'scheduled'; if (new Date(b.ends_at) < n) return 'ended'; return 'active'; };

// ── Shared components ────────────────────────────────────────────────

function StatCard({ label, value, icon }) {
  return (
    <div style={S.statCard}>
      <div style={{ fontSize: '24px', marginBottom: '6px' }}>{icon}</div>
      <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <>
      <div onClick={onClose} style={S.backdrop} />
      <div style={S.modal}>
        <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{title}</h2>
        {children}
      </div>
    </>
  );
}

function StatusBadge({ status }) {
  const colors = { active: { bg: '#dcfce7', fg: '#166534' }, upcoming: { bg: '#dbeafe', fg: '#1e40af' }, scheduled: { bg: '#dbeafe', fg: '#1e40af' }, ended: { bg: '#f1f5f9', fg: '#64748b' }, planned: { bg: '#fef3c7', fg: '#92400e' }, drafted: { bg: '#e0e7ff', fg: '#4338ca' }, published: { bg: '#dcfce7', fg: '#166534' } };
  const c = colors[status] || colors.ended;
  return <span style={{ ...S.badge, background: c.bg, color: c.fg }}>{status}</span>;
}

function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} style={{ ...S.toggle, background: checked ? '#22c55e' : '#cbd5e1' }}>
      <span style={{ ...S.toggleDot, transform: checked ? 'translateX(16px)' : 'translateX(0)' }} />
    </button>
  );
}

function Field({ label, children }) {
  return <div style={S.field}><label style={S.label}>{label}</label>{children}</div>;
}

// ── Flash Sales Tab ──────────────────────────────────────────────────

function FlashSalesTab() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('flash_sales').select('*').order('starts_at', { ascending: false });
    setSales(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeCount = sales.filter(s => saleStatus(s) === 'active').length;
  const upcomingCount = sales.filter(s => saleStatus(s) === 'upcoming').length;

  const toggleActive = async (id, val) => {
    await supabase.from('flash_sales').update({ is_active: val }).eq('id', id);
    setSales(prev => prev.map(s => s.id === id ? { ...s, is_active: val } : s));
  };

  const deleteSale = async (id) => {
    if (!window.confirm('Delete this flash sale?')) return;
    await supabase.from('flash_sales').delete().eq('id', id);
    setSales(prev => prev.filter(s => s.id !== id));
  };

  return (
    <>
      <div style={S.statsRow}>
        <StatCard label="Active sales" value={activeCount} icon="⚡" />
        <StatCard label="Upcoming" value={upcomingCount} icon="📅" />
        <StatCard label="Total created" value={sales.length} icon="🏷️" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button onClick={() => setShowModal(true)} style={S.primaryBtn}>+ New flash sale</button>
      </div>
      {loading ? <div style={S.empty}>Loading...</div> : sales.length === 0 ? (
        <div style={S.empty}><div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div><h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>No flash sales yet</h3><p style={{ color: '#64748b', fontSize: 14 }}>Create your first flash sale to boost traffic.</p></div>
      ) : (
        <div style={S.tableWrap}><table style={S.table}>
          <thead><tr>
            <th style={S.th}>Status</th><th style={S.th}>Title</th><th style={S.th}>Discount</th>
            <th style={S.th}>Applies to</th><th style={S.th}>Period</th><th style={S.th}>Active</th><th style={S.th}></th>
          </tr></thead>
          <tbody>{sales.map(s => {
            const st = saleStatus(s);
            return (
              <tr key={s.id} style={st === 'active' ? { background: '#f0fdf4' } : undefined}>
                <td style={S.td}><StatusBadge status={st} /></td>
                <td style={{ ...S.td, fontWeight: 600 }}>{s.title}</td>
                <td style={S.td}>{s.discount_type === 'percentage' ? `${s.discount_value}%` : `₹${s.discount_value}`}</td>
                <td style={S.td}><span style={{ textTransform: 'capitalize' }}>{s.applies_to}</span></td>
                <td style={{ ...S.td, fontSize: 12 }}>{toDate(s.starts_at)} — {toDate(s.ends_at)}</td>
                <td style={S.td}><Toggle checked={s.is_active} onChange={(v) => toggleActive(s.id, v)} /></td>
                <td style={S.td}><button onClick={() => deleteSale(s.id)} style={S.iconBtn} title="Delete">🗑️</button></td>
              </tr>
            );
          })}</tbody>
        </table></div>
      )}
      {showModal && <FlashSaleModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </>
  );
}

function FlashSaleModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', description: '', discount_type: 'percentage', discount_value: '', applies_to: 'all', starts_at: '', ends_at: '', banner_text: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    const { error: err } = await supabase.from('flash_sales').insert({ ...form, discount_value: Number(form.discount_value), is_active: true });
    if (err) setError(err.message); else onSaved();
    setSaving(false);
  };

  return (
    <Modal title="⚡ New Flash Sale" onClose={onClose}>
      {error && <div style={S.error}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <Field label="Title"><input value={form.title} onChange={e => set('title', e.target.value)} style={S.input} required /></Field>
        <Field label="Description"><input value={form.description} onChange={e => set('description', e.target.value)} style={S.input} /></Field>
        <div style={S.formRow}>
          <div style={{ flex: 1 }}><Field label="Discount type">
            <select value={form.discount_type} onChange={e => set('discount_type', e.target.value)} style={S.input}>
              <option value="percentage">Percentage (%)</option><option value="fixed">Fixed (₹)</option>
            </select></Field>
          </div>
          <div style={{ flex: 1 }}><Field label="Value"><input type="number" value={form.discount_value} onChange={e => set('discount_value', e.target.value)} min="1" style={S.input} required /></Field></div>
        </div>
        <Field label="Applies to">
          <select value={form.applies_to} onChange={e => set('applies_to', e.target.value)} style={S.input}>
            {APPLIES_TO.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
          </select>
        </Field>
        <div style={S.formRow}>
          <div style={{ flex: 1 }}><Field label="Starts at"><input type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} style={S.input} required /></Field></div>
          <div style={{ flex: 1 }}><Field label="Ends at"><input type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} style={S.input} required /></Field></div>
        </div>
        <Field label="Banner text"><input value={form.banner_text} onChange={e => set('banner_text', e.target.value)} placeholder="20% OFF ALL FICTION — TODAY ONLY!" style={S.input} /></Field>
        <div style={S.formActions}>
          <button type="button" onClick={onClose} style={S.cancelBtn}>Cancel</button>
          <button type="submit" disabled={saving} style={S.primaryBtn}>{saving ? 'Creating...' : 'Create sale'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ── Pop-up Banners Tab ───────────────────────────────────────────────

function BannersTab() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('popup_banners').select('*').order('created_at', { ascending: false });
    setBanners(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (id, val) => {
    await supabase.from('popup_banners').update({ is_active: val }).eq('id', id);
    setBanners(prev => prev.map(b => b.id === id ? { ...b, is_active: val } : b));
  };

  const deleteBanner = async (id) => {
    if (!window.confirm('Delete this banner?')) return;
    await supabase.from('popup_banners').delete().eq('id', id);
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  return (
    <>
      <div style={S.statsRow}>
        <StatCard label="Total banners" value={banners.length} icon="📢" />
        <StatCard label="Active" value={banners.filter(b => bannerStatus(b) === 'active' && b.is_active).length} icon="✅" />
        <StatCard label="Scheduled" value={banners.filter(b => bannerStatus(b) === 'scheduled').length} icon="📅" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button onClick={() => setShowModal(true)} style={S.primaryBtn}>+ New banner</button>
      </div>
      {loading ? <div style={S.empty}>Loading...</div> : banners.length === 0 ? (
        <div style={S.empty}><div style={{ fontSize: 48, marginBottom: 12 }}>📢</div><h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>No banners yet</h3><p style={{ color: '#64748b', fontSize: 14 }}>Create pop-up banners for your store.</p></div>
      ) : (
        <div style={S.tableWrap}><table style={S.table}>
          <thead><tr>
            <th style={S.th}>Preview</th><th style={S.th}>Title</th><th style={S.th}>Position</th>
            <th style={S.th}>Status</th><th style={S.th}>Period</th><th style={S.th}>Active</th><th style={S.th}></th>
          </tr></thead>
          <tbody>{banners.map(b => (
            <tr key={b.id}>
              <td style={S.td}><span style={{ display: 'inline-block', width: 32, height: 20, borderRadius: 4, background: b.bg_color || '#0f172a', border: '1px solid #e2e8f0' }} /></td>
              <td style={{ ...S.td, fontWeight: 600 }}>{b.title}</td>
              <td style={S.td}><span style={{ textTransform: 'capitalize' }}>{b.position}</span></td>
              <td style={S.td}><StatusBadge status={bannerStatus(b)} /></td>
              <td style={{ ...S.td, fontSize: 12 }}>{toDate(b.starts_at)} — {toDate(b.ends_at)}</td>
              <td style={S.td}><Toggle checked={b.is_active} onChange={(v) => toggleActive(b.id, v)} /></td>
              <td style={S.td}><button onClick={() => deleteBanner(b.id)} style={S.iconBtn} title="Delete">🗑️</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {showModal && <BannerModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </>
  );
}

function BannerModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', body: '', cta_text: '', cta_link: '', position: 'top', bg_color: '#0f172a', text_color: '#ffffff', starts_at: '', ends_at: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    const { error: err } = await supabase.from('popup_banners').insert({ ...form, is_active: true });
    if (err) setError(err.message); else onSaved();
    setSaving(false);
  };

  return (
    <Modal title="📢 New Pop-up Banner" onClose={onClose}>
      {error && <div style={S.error}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <Field label="Title"><input value={form.title} onChange={e => set('title', e.target.value)} style={S.input} required /></Field>
        <Field label="Body text"><textarea value={form.body} onChange={e => set('body', e.target.value)} style={{ ...S.input, minHeight: 60, resize: 'vertical' }} /></Field>
        <div style={S.formRow}>
          <div style={{ flex: 1 }}><Field label="CTA text"><input value={form.cta_text} onChange={e => set('cta_text', e.target.value)} placeholder="Shop now" style={S.input} /></Field></div>
          <div style={{ flex: 1 }}><Field label="CTA link"><input value={form.cta_link} onChange={e => set('cta_link', e.target.value)} placeholder="/store/fiction" style={S.input} /></Field></div>
        </div>
        <div style={S.formRow}>
          <div style={{ flex: 1 }}><Field label="Position">
            <select value={form.position} onChange={e => set('position', e.target.value)} style={S.input}>
              {POSITIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select></Field>
          </div>
          <div style={{ flex: 1 }}><Field label="Background">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={form.bg_color} onChange={e => set('bg_color', e.target.value)} style={{ width: 40, height: 36, border: 'none', cursor: 'pointer', borderRadius: 6 }} />
              <input value={form.bg_color} onChange={e => set('bg_color', e.target.value)} style={{ ...S.input, flex: 1 }} />
            </div></Field>
          </div>
          <div style={{ flex: 1 }}><Field label="Text color">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={form.text_color} onChange={e => set('text_color', e.target.value)} style={{ width: 40, height: 36, border: 'none', cursor: 'pointer', borderRadius: 6 }} />
              <input value={form.text_color} onChange={e => set('text_color', e.target.value)} style={{ ...S.input, flex: 1 }} />
            </div></Field>
          </div>
        </div>
        <div style={S.formRow}>
          <div style={{ flex: 1 }}><Field label="Starts at"><input type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} style={S.input} required /></Field></div>
          <div style={{ flex: 1 }}><Field label="Ends at"><input type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} style={S.input} required /></Field></div>
        </div>
        {/* Live preview */}
        <div style={{ marginBottom: 16, borderRadius: 10, padding: '14px 18px', background: form.bg_color, color: form.text_color, fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
          {form.title || 'Banner preview'} {form.cta_text && <span style={{ marginLeft: 8, textDecoration: 'underline', cursor: 'pointer' }}>{form.cta_text}</span>}
        </div>
        <div style={S.formActions}>
          <button type="button" onClick={onClose} style={S.cancelBtn}>Cancel</button>
          <button type="submit" disabled={saving} style={S.primaryBtn}>{saving ? 'Creating...' : 'Create banner'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ── QR Codes Tab ─────────────────────────────────────────────────────

function QRCodesTab() {
  const [url, setUrl] = useState('https://tapas-store.vercel.app');
  const [label, setLabel] = useState('');
  const [codes, setCodes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tapas_qr_codes') || '[]'); } catch { return []; }
  });

  const generate = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    const entry = { id: Date.now(), url: url.trim(), label: label.trim() || url.trim(), created: new Date().toISOString() };
    const updated = [entry, ...codes].slice(0, 20);
    setCodes(updated);
    localStorage.setItem('tapas_qr_codes', JSON.stringify(updated));
    setLabel('');
  };

  const remove = (id) => {
    const updated = codes.filter(c => c.id !== id);
    setCodes(updated);
    localStorage.setItem('tapas_qr_codes', JSON.stringify(updated));
  };

  const qrUrl = (data) => `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;

  return (
    <>
      <div style={S.statsRow}>
        <StatCard label="Generated codes" value={codes.length} icon="📱" />
      </div>
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, marginBottom: 28 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Generate QR Code</h3>
        <form onSubmit={generate} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <Field label="URL / Path"><input value={url} onChange={e => setUrl(e.target.value)} style={S.input} required placeholder="https://tapas-store.vercel.app/fiction" /></Field>
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Field label="Label (optional)"><input value={label} onChange={e => setLabel(e.target.value)} style={S.input} placeholder="Fiction page" /></Field>
          </div>
          <button type="submit" style={{ ...S.primaryBtn, marginBottom: 16 }}>Generate</button>
        </form>
      </div>
      {codes.length === 0 ? (
        <div style={S.empty}><div style={{ fontSize: 48, marginBottom: 12 }}>📱</div><h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>No QR codes generated</h3><p style={{ color: '#64748b', fontSize: 14 }}>Generate a QR code above to get started.</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {codes.map(c => (
            <div key={c.id} style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: 20, textAlign: 'center' }}>
              <img src={qrUrl(c.url)} alt={c.label} style={{ width: 160, height: 160, borderRadius: 8, marginBottom: 12 }} />
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 11, color: '#64748b', wordBreak: 'break-all', marginBottom: 12 }}>{c.url}</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <a href={qrUrl(c.url)} download={`qr-${c.label.replace(/\s+/g, '-')}.png`} target="_blank" rel="noopener noreferrer" style={{ ...S.primaryBtn, textDecoration: 'none', fontSize: 12, padding: '6px 14px' }}>Download</a>
                <button onClick={() => remove(c.id)} style={{ ...S.iconBtn, fontSize: 12 }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Content Calendar Tab ─────────────────────────────────────────────

function ContentCalendarTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => { const d = now(); return { year: d.getFullYear(), month: d.getMonth() }; });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('content_calendar').select('*').order('scheduled_for', { ascending: true });
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this content item?')) return;
    await supabase.from('content_calendar').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const calendarDays = useMemo(() => {
    const { year, month } = viewMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDow = firstDay.getDay(); // 0=Sun
    startDow = startDow === 0 ? 6 : startDow - 1; // convert to Mon=0
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);
    return cells;
  }, [viewMonth]);

  const itemsByDate = useMemo(() => {
    const map = {};
    items.forEach(item => {
      if (!item.scheduled_for) return;
      const d = new Date(item.scheduled_for);
      if (d.getFullYear() === viewMonth.year && d.getMonth() === viewMonth.month) {
        const key = d.getDate();
        if (!map[key]) map[key] = [];
        map[key].push(item);
      }
    });
    return map;
  }, [items, viewMonth]);

  const prevMonth = () => setViewMonth(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  const nextMonth = () => setViewMonth(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });
  const monthLabel = new Date(viewMonth.year, viewMonth.month).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const todayDate = now().getDate();
  const isCurrentMonth = viewMonth.year === now().getFullYear() && viewMonth.month === now().getMonth();

  return (
    <>
      <div style={S.statsRow}>
        <StatCard label="Total items" value={items.length} icon="📅" />
        <StatCard label="Planned" value={items.filter(i => i.status === 'planned').length} icon="📝" />
        <StatCard label="Published" value={items.filter(i => i.status === 'published').length} icon="✅" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button onClick={() => setShowModal(true)} style={S.primaryBtn}>+ New content</button>
      </div>
      {/* Calendar */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button onClick={prevMonth} style={S.iconBtn}>←</button>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{monthLabel}</h3>
          <button onClick={nextMonth} style={S.iconBtn}>→</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {DAYS.map(d => <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{d}</div>)}
          {calendarDays.map((day, i) => (
            <div key={i} style={{ minHeight: 72, padding: 4, border: '1px solid #f1f5f9', borderRadius: 6, background: day && isCurrentMonth && day === todayDate ? '#fffbeb' : day ? '#fafafa' : 'transparent' }}>
              {day && (
                <>
                  <div style={{ fontSize: 12, fontWeight: isCurrentMonth && day === todayDate ? 800 : 500, color: isCurrentMonth && day === todayDate ? '#D4A853' : '#0f172a', marginBottom: 4 }}>{day}</div>
                  {(itemsByDate[day] || []).map(item => (
                    <div key={item.id} style={{ fontSize: 9, padding: '2px 4px', borderRadius: 3, marginBottom: 2, background: CHANNEL_COLORS[item.channel] || '#94a3b8', color: 'white', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'default' }} title={`${item.title} (${item.channel})`}>
                      {item.title}
                    </div>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* List view */}
      {loading ? <div style={S.empty}>Loading...</div> : items.length > 0 && (
        <div style={S.tableWrap}><table style={S.table}>
          <thead><tr>
            <th style={S.th}>Date</th><th style={S.th}>Title</th><th style={S.th}>Channel</th>
            <th style={S.th}>Status</th><th style={S.th}></th>
          </tr></thead>
          <tbody>{items.map(item => (
            <tr key={item.id}>
              <td style={{ ...S.td, fontSize: 12 }}>{toDate(item.scheduled_for)}</td>
              <td style={{ ...S.td, fontWeight: 600 }}>{item.title}</td>
              <td style={S.td}>
                <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, color: 'white', background: CHANNEL_COLORS[item.channel] || '#94a3b8' }}>
                  {item.channel}
                </span>
              </td>
              <td style={S.td}><StatusBadge status={item.status} /></td>
              <td style={S.td}><button onClick={() => deleteItem(item.id)} style={S.iconBtn} title="Delete">🗑️</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {showModal && <ContentModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </>
  );
}

function ContentModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', description: '', channel: 'instagram', scheduled_for: '', status: 'planned' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    const { error: err } = await supabase.from('content_calendar').insert(form);
    if (err) setError(err.message); else onSaved();
    setSaving(false);
  };

  return (
    <Modal title="📅 New Content Item" onClose={onClose}>
      {error && <div style={S.error}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <Field label="Title"><input value={form.title} onChange={e => set('title', e.target.value)} style={S.input} required /></Field>
        <Field label="Description"><textarea value={form.description} onChange={e => set('description', e.target.value)} style={{ ...S.input, minHeight: 60, resize: 'vertical' }} /></Field>
        <div style={S.formRow}>
          <div style={{ flex: 1 }}><Field label="Channel">
            <select value={form.channel} onChange={e => set('channel', e.target.value)} style={S.input}>
              {CHANNELS.map(ch => <option key={ch} value={ch}>{ch.charAt(0).toUpperCase() + ch.slice(1)}</option>)}
            </select></Field>
          </div>
          <div style={{ flex: 1 }}><Field label="Status">
            <select value={form.status} onChange={e => set('status', e.target.value)} style={S.input}>
              {CAL_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select></Field>
          </div>
        </div>
        <Field label="Scheduled for"><input type="date" value={form.scheduled_for} onChange={e => set('scheduled_for', e.target.value)} style={S.input} required /></Field>
        <div style={S.formActions}>
          <button type="button" onClick={onClose} style={S.cancelBtn}>Cancel</button>
          <button type="submit" disabled={saving} style={S.primaryBtn}>{saving ? 'Creating...' : 'Create item'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main component ───────────────────────────────────────────────────

export default function CampaignTools() {
  const { staff } = useAuth();
  const [tab, setTab] = useState('flash-sales');

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div>
          <h1 style={S.title}>Campaign Tools</h1>
          <p style={S.subtitle}>Flash sales, banners, QR codes, and content planning</p>
        </div>
      </header>

      {/* Tabs */}
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

      {tab === 'flash-sales' && <FlashSalesTab />}
      {tab === 'banners' && <BannersTab />}
      {tab === 'qr-codes' && <QRCodesTab />}
      {tab === 'calendar' && <ContentCalendarTab />}
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
  tabs: { display: 'flex', gap: '4px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', overflowX: 'auto' },
  tab: { padding: '10px 18px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', marginBottom: '-1px', whiteSpace: 'nowrap' },
  tableWrap: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '10px 14px', background: '#f8fafc', color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', color: '#0f172a' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' },
  toggle: { position: 'relative', width: 40, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', transition: 'background 150ms', padding: 0 },
  toggleDot: { position: 'absolute', top: 3, left: 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'transform 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  iconBtn: { width: '32px', height: '32px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'transparent', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' },
  empty: { padding: '60px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px' },
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 100 },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', zIndex: 101, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' },
  error: { background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#dc2626', fontSize: '13px', fontWeight: 600 },
  field: { marginBottom: '16px' },
  formRow: { display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-end', flexWrap: 'wrap' },
  formActions: { display: 'flex', gap: '10px', marginTop: '24px' },
  label: { display: 'block', fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', color: '#0f172a', background: 'white', boxSizing: 'border-box' },
  cancelBtn: { flex: 1, padding: '12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#475569', fontFamily: 'inherit' },
};
