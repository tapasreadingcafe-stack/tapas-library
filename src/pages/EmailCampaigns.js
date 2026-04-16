import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';

// =====================================================================
// /marketing/campaigns — Compose + send email broadcasts to newsletter
// subscribers.
//
// The composer is intentionally simple: subject + HTML body. Preview
// pane renders the body in an iframe so rogue <style>/<script> can't
// break the dashboard. Send invokes the send-email-campaign edge
// function, which fans out via Resend (or logs a dry-run if
// RESEND_API_KEY isn't configured).
// =====================================================================

const STATUS_META = {
  draft:   { label: 'Draft',   bg: '#e5e7eb', text: '#374151' },
  sending: { label: 'Sending…', bg: '#fef3c7', text: '#92400e' },
  sent:    { label: 'Sent',    bg: '#d1fae5', text: '#065f46' },
  failed:  { label: 'Failed',  bg: '#fee2e2', text: '#991b1b' },
};

function wrapEmailHtml(subject, bodyHtml) {
  // Minimal responsive email shell — neutral typography, centered,
  // 600px max. Staff just writes the body.
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${subject || ''}</title></head><body style="margin:0;padding:0;background:#f5f5dc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5dc;padding:40px 16px;"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;padding:32px 28px;"><tr><td style="color:#26170c;font-size:16px;line-height:1.65;">${bodyHtml || ''}</td></tr></table></td></tr></table></body></html>`;
}

export default function EmailCampaigns() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // campaign row being edited, or null
  const [draft, setDraft] = useState({ name: '', subject: '', from_name: '', preheader: '', body_html: '' });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [subscriberCount, setSubscriberCount] = useState(null);

  const fetchRows = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [c, s] = await Promise.all([
        supabase.from('email_campaigns').select('id, name, subject, status, recipient_count, sent_at, created_at, updated_at').order('created_at', { ascending: false }).limit(200),
        supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      ]);
      if (c.error) throw c.error;
      setRows(c.data || []);
      setSubscriberCount(s.count ?? null);
    } catch (err) {
      setError(err.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const startNew = () => {
    setEditing({ _new: true });
    setDraft({ name: 'Untitled campaign', subject: '', from_name: '', preheader: '', body_html: '<p>Hi there,</p>\n<p>Write your email here…</p>\n<p>— Tapas Reading Cafe</p>' });
  };

  const openExisting = async (row) => {
    try {
      const { data, error: err } = await supabase.from('email_campaigns').select('*').eq('id', row.id).single();
      if (err) throw err;
      setEditing(data);
      setDraft({
        name: data.name || '',
        subject: data.subject || '',
        from_name: data.from_name || '',
        preheader: data.preheader || '',
        body_html: data.body_html || '',
      });
    } catch (err) {
      alert('Failed to open: ' + err.message);
    }
  };

  const saveDraft = async () => {
    if (saving) return;
    setSaving(true); setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...draft, created_by_email: user?.email || null };
      if (editing?._new) {
        const { data, error: err } = await supabase.from('email_campaigns').insert([payload]).select().single();
        if (err) throw err;
        setEditing(data);
        setRows(prev => [data, ...prev]);
      } else {
        const { data, error: err } = await supabase.from('email_campaigns').update(payload).eq('id', editing.id).select().single();
        if (err) throw err;
        setEditing(data);
        setRows(prev => prev.map(r => r.id === data.id ? { ...r, ...data } : r));
      }
    } catch (err) {
      setError('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const sendCampaign = async () => {
    if (sending) return;
    if (editing?._new || !editing?.id) { alert('Save the draft first.'); return; }
    if (!draft.subject.trim()) { alert('Subject is required.'); return; }
    if (!window.confirm(`Send "${draft.subject}" to all ${subscriberCount ?? '?'} active subscribers? This cannot be undone.`)) return;
    setSending(true); setError('');
    try {
      // Save latest draft first
      await saveDraft();
      const { data, error: err } = await supabase.functions.invoke('send-email-campaign', {
        body: { campaign_id: editing.id },
      });
      if (err) throw err;
      if (data?.ok === false) throw new Error(data.error || 'Send failed');
      alert(data?.dryRun
        ? `Dry run: would have sent to ${data.recipients} subscribers. Set RESEND_API_KEY on the send-email-campaign function to send for real.`
        : `Sent to ${data?.sent ?? '?'} subscribers.`);
      await fetchRows();
      setEditing(null);
    } catch (err) {
      setError('Send failed: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const deleteRow = async (row) => {
    if (!window.confirm(`Delete "${row.name || row.subject}"? This cannot be undone.`)) return;
    try {
      const { error: err } = await supabase.from('email_campaigns').delete().eq('id', row.id);
      if (err) throw err;
      setRows(prev => prev.filter(r => r.id !== row.id));
      if (editing?.id === row.id) setEditing(null);
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const previewSrcDoc = useMemo(() => wrapEmailHtml(draft.subject, draft.body_html), [draft.subject, draft.body_html]);

  if (editing) {
    return (
      <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px', height: 'calc(100vh - 90px)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => setEditing(null)} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #dfe4ea', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>← Back</button>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#2c3e50', flex: 1, minWidth: '200px' }}>
              ✉ {editing._new ? 'New campaign' : draft.name || 'Campaign'}
            </h1>
            {editing?.status && !editing._new && (
              <span style={{ padding: '3px 10px', background: STATUS_META[editing.status]?.bg, color: STATUS_META[editing.status]?.text, borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                {STATUS_META[editing.status]?.label || editing.status}
              </span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Will send to <b>{subscriberCount ?? '…'}</b> active newsletter subscriber{subscriberCount === 1 ? '' : 's'}.
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Internal name</label>
            <input type="text" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #dfe4ea', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Subject line</label>
            <input type="text" value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })} placeholder="Goes in the inbox list — make it compelling"
              style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #dfe4ea', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>
              Body (HTML) — use &lt;p&gt;, &lt;a href&gt;, &lt;img src&gt;, &lt;strong&gt;…
            </label>
            <textarea value={draft.body_html} onChange={e => setDraft({ ...draft, body_html: e.target.value })}
              rows={18}
              style={{
                width: '100%', padding: '10px 12px', fontSize: '12px',
                border: '1px solid #dfe4ea', borderRadius: '6px', outline: 'none', boxSizing: 'border-box',
                fontFamily: 'ui-monospace, monospace', lineHeight: 1.55, resize: 'vertical',
              }} />
          </div>
          {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '6px', fontSize: '12px' }}>⚠ {error}</div>}
          {editing?.error_message && (
            <div style={{ padding: '10px 14px', background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', borderRadius: '6px', fontSize: '12px' }}>
              Last send message: {editing.error_message}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
            <button onClick={saveDraft} disabled={saving}
              style={{ padding: '10px 18px', background: '#fff', border: '1px solid #dfe4ea', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '13px' }}
            >{saving ? 'Saving…' : '💾 Save draft'}</button>
            <button onClick={sendCampaign} disabled={sending || editing?._new || editing?.status === 'sent'}
              style={{ padding: '10px 22px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '6px', cursor: (sending || editing?._new || editing?.status === 'sent') ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '13px', opacity: (sending || editing?._new || editing?.status === 'sent') ? 0.6 : 1 }}
            >{sending ? 'Sending…' : '🚀 Send campaign'}</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Preview</div>
          <iframe title="Preview" srcDoc={previewSrcDoc} sandbox=""
            style={{ flex: 1, width: '100%', border: '1px solid #dfe4ea', borderRadius: '8px', background: '#f5f5dc' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#2c3e50' }}>
            ✉ Email campaigns
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6b7280' }}>
            Compose a broadcast and send it to your {subscriberCount ?? '…'} newsletter subscribers.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchRows} style={{ padding: '8px 16px', background: '#fff', color: '#2c3e50', border: '1.5px solid #dfe4ea', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>↻ Refresh</button>
          <button onClick={startNew} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>+ New campaign</button>
        </div>
      </div>

      {error && <div style={{ padding: '12px 16px', marginBottom: '16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', fontSize: '13px' }}>⚠️ {error}</div>}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#8B6914' }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#999', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✉</div>
          <p style={{ margin: 0, fontWeight: 600 }}>No campaigns yet.</p>
          <p style={{ margin: '6px 0 0', fontSize: '13px' }}>
            Click <b>+ New campaign</b> above to compose your first broadcast.
          </p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Campaign</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sent to</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Created</th>
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const s = STATUS_META[row.status] || STATUS_META.draft;
                return (
                  <tr key={row.id} style={{ borderBottom: idx === rows.length - 1 ? 'none' : '1px solid #f1f5f9', cursor: 'pointer' }}
                    onClick={() => openExisting(row)}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{row.name || 'Untitled'}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{row.subject}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', background: s.bg, color: s.text, borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>{s.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#111827', fontWeight: 600 }}>
                      {row.status === 'sent' ? row.recipient_count : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '12px' }}>
                      {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '8px 16px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => deleteRow(row)}
                        style={{ padding: '5px 10px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      >🗑</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
