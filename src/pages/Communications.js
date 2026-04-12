import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// Communications — WhatsApp, SMS, Push Notifications, Event Reminders
// =====================================================================

const TABS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'sms', label: 'SMS', icon: '📱' },
  { id: 'push', label: 'Push Notifications', icon: '🔔' },
  { id: 'reminders', label: 'Event Reminders', icon: '⏰' },
];

const STATUS_STYLES = {
  draft: { bg: '#f1f5f9', color: '#475569' },
  scheduled: { bg: '#fef3c7', color: '#92400e' },
  sent: { bg: '#dcfce7', color: '#166534' },
};

const TRIGGER_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'order_ready', label: 'Order Ready' },
  { value: 'event_reminder', label: 'Event Reminder' },
  { value: 'fine_due', label: 'Fine Due' },
  { value: 'custom', label: 'Custom' },
];

const REMINDER_TYPES = ['email', 'sms', 'whatsapp', 'push'];
const TIMING_OPTIONS = [
  { value: '1h_before', label: '1 hour before' },
  { value: '24h_before', label: '24 hours before' },
  { value: '3d_before', label: '3 days before' },
  { value: '1w_before', label: '1 week before' },
  { value: 'after', label: 'After event' },
];

const INFO_BANNERS = {
  whatsapp: 'Connect WhatsApp Business API to enable actual sending. For now, use this to plan and track broadcasts.',
  sms: 'Connect MSG91 or Twilio API key in Settings to enable sending.',
  push: 'Web push requires a service worker. Configuration coming soon.',
};

export default function Communications() {
  const { staff } = useAuth();
  const [tab, setTab] = useState('whatsapp');
  const [data, setData] = useState([]);
  const [segments, setSegments] = useState([]);
  const [stats, setStats] = useState({ sent: 0, drafts: 0, subscriptions: 0 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'create' | 'schedule' | null
  const [editing, setEditing] = useState(null);
  const [scheduleId, setScheduleId] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const tableMap = { whatsapp: 'whatsapp_broadcasts', sms: 'sms_alerts', push: 'push_notifications', reminders: 'event_reminders' };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const table = tableMap[tab];
      const { data: rows } = await supabase.from(table).select('*').order('created_at', { ascending: false });
      setData(rows || []);

      if (tab !== 'reminders') {
        const all = rows || [];
        const sent = all.filter(r => r.status === 'sent').length;
        const drafts = all.filter(r => r.status === 'draft').length;
        let subscriptions = 0;
        if (tab === 'push') {
          const { count } = await supabase.from('push_subscriptions').select('id', { count: 'exact', head: true });
          subscriptions = count || 0;
        }
        setStats({ sent, drafts, subscriptions });
      }

      if (tab === 'whatsapp') {
        const { data: segs } = await supabase.from('member_segments').select('*').order('name');
        setSegments(segs || []);
      }
    } catch (err) {
      console.error('Communications load error:', err);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    if (tab === 'whatsapp') setForm({ title: '', message: '', segment_id: '', status: 'draft' });
    else if (tab === 'sms') setForm({ title: '', message: '', trigger_type: 'manual', status: 'draft' });
    else if (tab === 'push') setForm({ title: '', body: '', url: '', icon: '📢', status: 'draft' });
    else setForm({ event_name: '', event_date: '', reminder_type: 'email', timing: '24h_before', message: '', status: 'draft' });
  };

  const openCreate = () => { resetForm(); setEditing(null); setModal('create'); };

  const openEdit = (row) => {
    if (tab === 'whatsapp') setForm({ title: row.title, message: row.message, segment_id: row.segment_id || '', status: row.status });
    else if (tab === 'sms') setForm({ title: row.title, message: row.message, trigger_type: row.trigger_type || 'manual', status: row.status });
    else if (tab === 'push') setForm({ title: row.title, body: row.body, url: row.url || '', icon: row.icon || '📢', status: row.status });
    else setForm({ event_name: row.event_name, event_date: row.event_date ? row.event_date.slice(0, 16) : '', reminder_type: row.reminder_type, timing: row.timing, message: row.message || '', status: row.status });
    setEditing(row.id);
    setModal('create');
  };

  const save = async () => {
    setSaving(true);
    try {
      const table = tableMap[tab];
      const payload = { ...form, updated_at: new Date().toISOString() };
      if (!editing) payload.created_at = new Date().toISOString();
      if (editing) await supabase.from(table).update(payload).eq('id', editing);
      else await supabase.from(table).insert(payload);
      setModal(null);
      load();
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const markSent = async (id) => {
    await supabase.from(tableMap[tab]).update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id);
    load();
  };

  const scheduleItem = async () => {
    if (!scheduleDate) return;
    await supabase.from(tableMap[tab]).update({ status: 'scheduled', scheduled_at: scheduleDate }).eq('id', scheduleId);
    setModal(null);
    setScheduleId(null);
    setScheduleDate('');
    load();
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    await supabase.from(tableMap[tab]).delete().eq('id', id);
    load();
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const preview = (s, n = 50) => s && s.length > n ? s.slice(0, n) + '...' : s || '';
  const isUpcoming = (d) => d && new Date(d) > new Date();

  // ---- Render Helpers ----
  const renderWhatsAppForm = () => (
    <>
      <FormField label="Title"><input style={inputStyle} value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Broadcast title" /></FormField>
      <FormField label={`Message (${(form.message || '').length}/1024)`}>
        <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} maxLength={1024} value={form.message || ''} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Write your message..." />
      </FormField>
      <FormField label="Segment">
        <select style={inputStyle} value={form.segment_id || ''} onChange={e => setForm({ ...form, segment_id: e.target.value })}>
          <option value="">All members</option>
          {segments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </FormField>
    </>
  );

  const renderSmsForm = () => (
    <>
      <FormField label="Title"><input style={inputStyle} value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Alert title" /></FormField>
      <FormField label={`Message (${(form.message || '').length}/160)`}>
        <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} maxLength={160} value={form.message || ''} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="SMS content..." />
        <div style={{ fontSize: 12, color: (form.message || '').length > 140 ? '#dc2626' : '#94a3b8', marginTop: 4 }}>{160 - (form.message || '').length} characters remaining</div>
      </FormField>
      <FormField label="Trigger Type">
        <select style={inputStyle} value={form.trigger_type || 'manual'} onChange={e => setForm({ ...form, trigger_type: e.target.value })}>
          {TRIGGER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </FormField>
    </>
  );

  const renderPushForm = () => (
    <>
      <FormField label="Title"><input style={inputStyle} value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Notification title" /></FormField>
      <FormField label="Body"><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.body || ''} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Notification body..." /></FormField>
      <FormField label="URL (optional)"><input style={inputStyle} value={form.url || ''} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></FormField>
      <FormField label="Icon Emoji"><input style={inputStyle} value={form.icon || ''} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="📢" /></FormField>
    </>
  );

  const renderReminderForm = () => (
    <>
      <FormField label="Event Name"><input style={inputStyle} value={form.event_name || ''} onChange={e => setForm({ ...form, event_name: e.target.value })} placeholder="Event name" /></FormField>
      <FormField label="Event Date & Time"><input type="datetime-local" style={inputStyle} value={form.event_date || ''} onChange={e => setForm({ ...form, event_date: e.target.value })} /></FormField>
      <FormField label="Reminder Type">
        <select style={inputStyle} value={form.reminder_type || 'email'} onChange={e => setForm({ ...form, reminder_type: e.target.value })}>
          {REMINDER_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </FormField>
      <FormField label="Timing">
        <select style={inputStyle} value={form.timing || '24h_before'} onChange={e => setForm({ ...form, timing: e.target.value })}>
          {TIMING_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </FormField>
      <FormField label="Message"><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.message || ''} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Reminder message..." /></FormField>
    </>
  );

  const renderTable = () => {
    if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div>;
    if (!data.length) return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No records yet. Click "Create" to get started.</div>;

    if (tab === 'whatsapp') return (
      <DataTable headers={['Title', 'Message', 'Segment', 'Status', 'Date', 'Actions']}>
        {data.map(r => (
          <tr key={r.id} style={rowStyle}>
            <td style={cellStyle}>{r.title}</td>
            <td style={cellStyle}>{preview(r.message)}</td>
            <td style={cellStyle}>{segments.find(s => s.id === r.segment_id)?.name || 'All'}</td>
            <td style={cellStyle}><StatusBadge status={r.status} /></td>
            <td style={cellStyle}>{fmtDate(r.created_at)}</td>
            <td style={cellStyle}><ActionButtons id={r.id} row={r} /></td>
          </tr>
        ))}
      </DataTable>
    );

    if (tab === 'sms') return (
      <DataTable headers={['Title', 'Message', 'Trigger', 'Status', 'Date', 'Actions']}>
        {data.map(r => (
          <tr key={r.id} style={rowStyle}>
            <td style={cellStyle}>{r.title}</td>
            <td style={cellStyle}>{preview(r.message)}</td>
            <td style={cellStyle}>{TRIGGER_TYPES.find(t => t.value === r.trigger_type)?.label || r.trigger_type}</td>
            <td style={cellStyle}><StatusBadge status={r.status} /></td>
            <td style={cellStyle}>{fmtDate(r.created_at)}</td>
            <td style={cellStyle}><ActionButtons id={r.id} row={r} /></td>
          </tr>
        ))}
      </DataTable>
    );

    if (tab === 'push') return (
      <DataTable headers={['Icon', 'Title', 'Body', 'Status', 'Date', 'Actions']}>
        {data.map(r => (
          <tr key={r.id} style={rowStyle}>
            <td style={cellStyle}>{r.icon || '📢'}</td>
            <td style={cellStyle}>{r.title}</td>
            <td style={cellStyle}>{preview(r.body)}</td>
            <td style={cellStyle}><StatusBadge status={r.status} /></td>
            <td style={cellStyle}>{fmtDate(r.created_at)}</td>
            <td style={cellStyle}><ActionButtons id={r.id} row={r} /></td>
          </tr>
        ))}
      </DataTable>
    );

    return (
      <DataTable headers={['Event', 'Date', 'Type', 'Timing', 'Status', 'Actions']}>
        {data.map(r => (
          <tr key={r.id} style={{ ...rowStyle, background: isUpcoming(r.event_date) ? '#fffbeb' : undefined }}>
            <td style={cellStyle}>{r.event_name}</td>
            <td style={cellStyle}>{fmtDate(r.event_date)}</td>
            <td style={cellStyle}>{(r.reminder_type || '').charAt(0).toUpperCase() + (r.reminder_type || '').slice(1)}</td>
            <td style={cellStyle}>{TIMING_OPTIONS.find(t => t.value === r.timing)?.label || r.timing}</td>
            <td style={cellStyle}><StatusBadge status={r.status} /></td>
            <td style={cellStyle}><ActionButtons id={r.id} row={r} noSchedule /></td>
          </tr>
        ))}
      </DataTable>
    );
  };

  const ActionButtons = ({ id, row, noSchedule }) => (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <SmallBtn onClick={() => openEdit(row)}>Edit</SmallBtn>
      {!noSchedule && row.status !== 'sent' && (
        <SmallBtn onClick={() => { setScheduleId(id); setScheduleDate(''); setModal('schedule'); }} color="#92400e" bg="#fef3c7">Schedule</SmallBtn>
      )}
      {row.status !== 'sent' && <SmallBtn onClick={() => markSent(id)} color="#166534" bg="#dcfce7">Mark Sent</SmallBtn>}
      <SmallBtn onClick={() => deleteItem(id)} color="#dc2626" bg="#fef2f2">Delete</SmallBtn>
    </div>
  );

  const formRenderers = { whatsapp: renderWhatsAppForm, sms: renderSmsForm, push: renderPushForm, reminders: renderReminderForm };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#0f172a', minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Communications</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Manage broadcasts, alerts, and reminders</p>
          </div>
          <button style={primaryBtnStyle} onClick={openCreate}>+ Create</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e2e8f0', marginBottom: 20, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 18px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              background: 'none', color: tab === t.id ? '#D4A853' : '#64748b', whiteSpace: 'nowrap',
              borderBottom: tab === t.id ? '2px solid #D4A853' : '2px solid transparent', marginBottom: -2,
            }}>{t.icon} {t.label}</button>
          ))}
        </div>

        {/* Info Banner */}
        {INFO_BANNERS[tab] && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ fontSize: 16 }}>ℹ️</span>
            <span>{INFO_BANNERS[tab]}</span>
          </div>
        )}

        {/* Stats */}
        {tab !== 'reminders' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
            <StatCard label="Total Sent" value={stats.sent} icon="✅" />
            <StatCard label="Drafts" value={stats.drafts} icon="📝" />
            {tab === 'push' && <StatCard label="Subscriptions" value={stats.subscriptions} icon="👥" />}
          </div>
        )}

        {/* Table */}
        {renderTable()}
      </div>

      {/* Create / Edit Modal */}
      {modal === 'create' && (
        <Modal title={editing ? 'Edit' : 'Create'} onClose={() => setModal(null)}>
          {formRenderers[tab]()}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button style={secondaryBtnStyle} onClick={() => setModal(null)}>Cancel</button>
            <button style={primaryBtnStyle} onClick={save} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </Modal>
      )}

      {/* Schedule Modal */}
      {modal === 'schedule' && (
        <Modal title="Schedule" onClose={() => { setModal(null); setScheduleId(null); }}>
          <FormField label="Send Date & Time">
            <input type="datetime-local" style={inputStyle} value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
          </FormField>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button style={secondaryBtnStyle} onClick={() => setModal(null)}>Cancel</button>
            <button style={primaryBtnStyle} onClick={scheduleItem} disabled={!scheduleDate}>Schedule</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// =====================================================================
// Shared Components
// =====================================================================

function StatCard({ label, value, icon }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ fontSize: 24 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{value}</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
      </div>
    </div>
  );
}

function DataTable({ headers, children }) {
  return (
    <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {headers.map(h => <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>{status || 'draft'}</span>;
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function SmallBtn({ children, onClick, color = '#475569', bg = '#f1f5f9' }) {
  return <button onClick={onClick} style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', background: bg, color }}>{children}</button>;
}

// =====================================================================
// Shared Styles
// =====================================================================

const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14,
  fontFamily: 'inherit', color: '#0f172a', background: '#f8fafc', boxSizing: 'border-box',
};

const primaryBtnStyle = {
  padding: '9px 20px', background: '#D4A853', color: '#fff', border: 'none', borderRadius: 8,
  fontSize: 14, fontWeight: 600, cursor: 'pointer',
};

const secondaryBtnStyle = {
  padding: '9px 20px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
  borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
};

const rowStyle = { borderBottom: '1px solid #f1f5f9' };
const cellStyle = { padding: '10px 14px', verticalAlign: 'middle' };
