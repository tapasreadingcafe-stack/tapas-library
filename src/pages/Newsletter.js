import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// Newsletter — compose, schedule, and manage email newsletters
// =====================================================================

const TEMPLATES = [
  { id: 'book_of_week', name: 'Book of the Week', desc: 'Weekly pick with cover, author, and a short review', emoji: '\uD83D\uDCD6' },
  { id: 'event_invite', name: 'Event Invite', desc: 'Upcoming event with date, location, and RSVP link', emoji: '\uD83C\uDF89' },
  { id: 'monthly_recap', name: 'Monthly Recap', desc: 'Top books, new arrivals, and member milestones', emoji: '\uD83D\uDCCA' },
  { id: 'custom', name: 'Custom', desc: 'Start from scratch', emoji: '\u270F\uFE0F' },
];

const TEMPLATE_BODIES = {
  book_of_week: `# Book of the Week\n\n**Title:** [Book Title]\n**Author:** [Author Name]\n\n![Book Cover](https://...)\n\n## Our Review\n[Write a short 2-3 sentence review here]\n\n## Why We Love It\n- [Reason 1]\n- [Reason 2]\n\n---\nHappy reading!\nTapas Reading Cafe`,
  event_invite: `# You're Invited!\n\n## [Event Name]\n\n**Date:** [Day, Month Date, Year]\n**Time:** [Start Time] - [End Time]\n**Location:** Tapas Reading Cafe\n\n## About This Event\n[Describe the event in 2-3 sentences]\n\n## RSVP\nReply to this email or visit [link] to reserve your spot.\n\nSpaces are limited \u2014 don't miss out!\n\n---\nTapas Reading Cafe`,
  monthly_recap: `# Monthly Recap \u2014 [Month Year]\n\n## Top Books This Month\n1. [Book 1] by [Author]\n2. [Book 2] by [Author]\n3. [Book 3] by [Author]\n\n## New Arrivals\n- [New Book 1]\n- [New Book 2]\n\n## Member Milestones\n- [X] new members joined\n- [Y] books borrowed\n- [Z] events hosted\n\n## Coming Up Next Month\n[Preview of upcoming events or releases]\n\n---\nTapas Reading Cafe`,
  custom: '',
  default: '',
};

const STATUS_COLORS = {
  draft: { bg: '#f1f5f9', color: '#475569' },
  scheduled: { bg: '#fef3c7', color: '#92400e' },
  sent: { bg: '#dcfce7', color: '#166534' },
};

export default function Newsletter() {
  const { staff } = useAuth();
  const [tab, setTab] = useState('compose');
  const [drafts, setDrafts] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [form, setForm] = useState({
    subject: '',
    template: 'default',
    body: '',
    segment_id: '',
    status: 'draft',
    scheduled_at: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [draftsRes, segmentsRes] = await Promise.all([
        supabase.from('newsletter_drafts').select('*').order('updated_at', { ascending: false }),
        supabase.from('member_segments').select('*').order('name'),
      ]);
      setDrafts(draftsRes.data || []);
      setSegments(segmentsRes.data || []);
    } catch (err) {
      console.error('Newsletter load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Select a draft to edit
  const selectDraft = (draft) => {
    setSelectedId(draft.id);
    setForm({
      subject: draft.subject || '',
      template: draft.template || 'default',
      body: draft.body || '',
      segment_id: draft.segment_id || '',
      status: draft.status || 'draft',
      scheduled_at: draft.scheduled_at ? draft.scheduled_at.slice(0, 16) : '',
    });
    setError('');
    setSuccess('');
    setTab('compose');
  };

  // New draft
  const newDraft = (templateId) => {
    setSelectedId(null);
    setForm({
      subject: '',
      template: templateId || 'default',
      body: TEMPLATE_BODIES[templateId] || '',
      segment_id: '',
      status: 'draft',
      scheduled_at: '',
    });
    setError('');
    setSuccess('');
    setTab('compose');
  };

  // Save draft
  const saveDraft = async () => {
    if (!form.subject.trim()) return setError('Subject is required.');
    setSaving(true); setError(''); setSuccess('');
    try {
      const payload = {
        subject: form.subject.trim(),
        template: form.template,
        body: form.body,
        segment_id: form.segment_id || null,
        status: form.status,
        scheduled_at: form.scheduled_at || null,
        updated_at: new Date().toISOString(),
      };
      if (selectedId) {
        const { error: err } = await supabase.from('newsletter_drafts').update(payload).eq('id', selectedId);
        if (err) throw err;
      } else {
        payload.created_by = staff?.id;
        payload.created_at = new Date().toISOString();
        const { data, error: err } = await supabase.from('newsletter_drafts').insert(payload).select().single();
        if (err) throw err;
        setSelectedId(data.id);
      }
      setSuccess('Draft saved!');
      load();
    } catch (err) {
      setError(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  // Schedule
  const scheduleDraft = async () => {
    if (!form.scheduled_at) return setError('Pick a schedule date first.');
    setForm(f => ({ ...f, status: 'scheduled' }));
    // Save after state update
    setTimeout(async () => {
      setSaving(true); setError(''); setSuccess('');
      try {
        const payload = {
          subject: form.subject.trim(),
          template: form.template,
          body: form.body,
          segment_id: form.segment_id || null,
          status: 'scheduled',
          scheduled_at: form.scheduled_at,
          updated_at: new Date().toISOString(),
        };
        if (selectedId) {
          const { error: err } = await supabase.from('newsletter_drafts').update(payload).eq('id', selectedId);
          if (err) throw err;
        } else {
          payload.created_by = staff?.id;
          payload.created_at = new Date().toISOString();
          const { data, error: err } = await supabase.from('newsletter_drafts').insert(payload).select().single();
          if (err) throw err;
          setSelectedId(data.id);
        }
        setSuccess('Newsletter scheduled!');
        load();
      } catch (err) {
        setError(err.message || 'Failed to schedule.');
      } finally {
        setSaving(false);
      }
    }, 0);
  };

  // Mark as sent
  const markSent = async () => {
    if (!selectedId) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const { error: err } = await supabase.from('newsletter_drafts').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', selectedId);
      if (err) throw err;
      setForm(f => ({ ...f, status: 'sent' }));
      setSuccess('Marked as sent!');
      load();
    } catch (err) {
      setError(err.message || 'Failed to update.');
    } finally {
      setSaving(false);
    }
  };

  // Delete draft
  const deleteDraft = async () => {
    if (!selectedId || !window.confirm('Delete this draft?')) return;
    await supabase.from('newsletter_drafts').delete().eq('id', selectedId);
    setSelectedId(null);
    setForm({ subject: '', template: 'default', body: '', segment_id: '', status: 'draft', scheduled_at: '' });
    load();
  };

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div>
          <h1 style={S.title}>{'\uD83D\uDCE8'} Newsletter</h1>
          <p style={S.subtitle}>Compose, schedule, and manage email newsletters</p>
        </div>
        <button onClick={() => newDraft('default')} style={S.primaryBtn}>+ New draft</button>
      </header>

      {/* Tabs */}
      <div style={S.tabs}>
        {['compose', 'templates'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            ...S.tab,
            color: tab === t ? '#0f172a' : '#64748b',
            borderBottom: tab === t ? '2px solid #D4A853' : '2px solid transparent',
            fontWeight: tab === t ? 700 : 500,
          }}>
            {t === 'compose' ? 'Compose' : 'Templates'}
          </button>
        ))}
      </div>

      {tab === 'compose' && (
        <div style={S.composeLayout}>
          {/* Sidebar — draft list */}
          <aside style={S.sidebar}>
            <div style={S.sidebarHeader}>Drafts ({drafts.length})</div>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading\u2026</div>
            ) : drafts.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No drafts yet</div>
            ) : (
              <div style={S.draftList}>
                {drafts.map(d => {
                  const statusStyle = STATUS_COLORS[d.status] || STATUS_COLORS.draft;
                  return (
                    <div
                      key={d.id}
                      onClick={() => selectDraft(d)}
                      style={{
                        ...S.draftItem,
                        background: selectedId === d.id ? '#f1f5f9' : 'transparent',
                        borderLeft: selectedId === d.id ? '3px solid #D4A853' : '3px solid transparent',
                      }}
                    >
                      <div style={S.draftSubject}>{d.subject || 'Untitled'}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ ...S.statusBadge, background: statusStyle.bg, color: statusStyle.color }}>
                          {d.status}
                        </span>
                        <span style={S.draftDate}>
                          {new Date(d.updated_at || d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>

          {/* Editor */}
          <main style={S.editor}>
            {error && <div style={S.errorBox}>{error}</div>}
            {success && <div style={S.successBox}>{success}</div>}

            <div style={S.field}>
              <label style={S.label}>SUBJECT</label>
              <input
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Newsletter subject line\u2026"
                style={S.input}
              />
            </div>

            <div style={S.formRow}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>TEMPLATE</label>
                <select
                  value={form.template}
                  onChange={e => {
                    const t = e.target.value;
                    setForm(f => ({ ...f, template: t, body: TEMPLATE_BODIES[t] || f.body }));
                  }}
                  style={S.input}
                >
                  <option value="default">Default</option>
                  <option value="book_of_week">Book of the Week</option>
                  <option value="event_invite">Event Invite</option>
                  <option value="monthly_recap">Monthly Recap</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>SEGMENT</label>
                <select
                  value={form.segment_id}
                  onChange={e => setForm(f => ({ ...f, segment_id: e.target.value }))}
                  style={S.input}
                >
                  <option value="">All members</option>
                  {segments.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={S.field}>
              <label style={S.label}>BODY</label>
              <textarea
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Write your newsletter content here (Markdown supported)\u2026"
                rows={16}
                style={S.textarea}
              />
            </div>

            <div style={S.field}>
              <label style={S.label}>SCHEDULE DATE (optional)</label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                style={{ ...S.input, maxWidth: '280px' }}
              />
            </div>

            {/* Action buttons */}
            <div style={S.actionBar}>
              <button onClick={saveDraft} disabled={saving} style={S.saveBtn}>
                {saving ? '\u23F3 Saving\u2026' : '\uD83D\uDCBE Save draft'}
              </button>
              <button onClick={scheduleDraft} disabled={saving || !form.scheduled_at} style={S.scheduleBtn}>
                {'\uD83D\uDCC5'} Schedule
              </button>
              {selectedId && form.status !== 'sent' && (
                <button onClick={markSent} disabled={saving} style={S.sentBtn}>
                  {'\u2705'} Mark as sent
                </button>
              )}
              {selectedId && (
                <button onClick={deleteDraft} style={S.deleteBtn}>
                  {'\uD83D\uDDD1'} Delete
                </button>
              )}
            </div>

            {form.status !== 'draft' && (
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748b' }}>
                Status: <span style={{
                  ...S.statusBadge,
                  background: (STATUS_COLORS[form.status] || STATUS_COLORS.draft).bg,
                  color: (STATUS_COLORS[form.status] || STATUS_COLORS.draft).color,
                }}>{form.status}</span>
                {form.scheduled_at && form.status === 'scheduled' && (
                  <span style={{ marginLeft: '8px' }}>
                    \u2014 {new Date(form.scheduled_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            )}
          </main>
        </div>
      )}

      {tab === 'templates' && (
        <div style={S.templateGrid}>
          {TEMPLATES.map(t => (
            <div key={t.id} style={S.templateCard}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>{t.emoji}</div>
              <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{t.name}</h3>
              <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>{t.desc}</p>
              <button onClick={() => newDraft(t.id)} style={S.useTemplateBtn}>
                Use template
              </button>
            </div>
          ))}
        </div>
      )}
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
  tabs: { display: 'flex', gap: '4px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' },
  tab: { padding: '10px 18px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', marginBottom: '-1px' },

  // Compose layout
  composeLayout: { display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', minHeight: '500px' },
  sidebar: { background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' },
  sidebarHeader: { padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' },
  draftList: { maxHeight: '460px', overflowY: 'auto' },
  draftItem: { padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background 100ms' },
  draftSubject: { fontSize: '13px', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  draftDate: { fontSize: '11px', color: '#94a3b8' },
  statusBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' },

  // Editor
  editor: { background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '24px' },
  field: { marginBottom: '16px' },
  formRow: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  label: { display: 'block', fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', color: '#0f172a', background: 'white', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: '#0f172a', background: '#f8fafc', boxSizing: 'border-box', lineHeight: '1.6', resize: 'vertical' },
  errorBox: { background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#dc2626', fontSize: '13px', fontWeight: 600 },
  successBox: { background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#166534', fontSize: '13px', fontWeight: 600 },

  // Action bar
  actionBar: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' },
  saveBtn: { padding: '10px 20px', background: 'linear-gradient(135deg, #D4A853, #C49040)', color: '#1a0f08', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' },
  scheduleBtn: { padding: '10px 20px', background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#475569' },
  sentBtn: { padding: '10px 20px', background: '#dcfce7', border: '1.5px solid #bbf7d0', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#166534' },
  deleteBtn: { padding: '10px 20px', background: 'transparent', border: '1.5px solid #fecaca', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#dc2626' },

  // Templates tab
  templateGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '16px' },
  templateCard: { background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '28px 20px', textAlign: 'center' },
  useTemplateBtn: { padding: '10px 24px', background: 'linear-gradient(135deg, #D4A853, #C49040)', color: '#1a0f08', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' },
};
