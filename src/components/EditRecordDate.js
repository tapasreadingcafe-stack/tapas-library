import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { logActivity } from '../utils/activityLog';
import { tsToYmd, ymdToTs, prettyYmd } from '../utils/backdate';

/* Admin-only "correct the date on a record that is already saved".
 *
 * The trigger renders as a small calendar button next to a row; non-admins see
 * nothing, so a staff-facing list is unchanged. Every correction is written to
 * the activity log with both the old and the new day — moving a sale between
 * days changes what the books say for both of them, and that needs a trail.
 *
 * `fields` describes which columns to offer:
 *   { column, label, kind: 'timestamp' | 'date' }
 * A 'timestamp' column keeps its original clock time so re-dating a bill does
 * not reshuffle it against the other bills on the day it moves to.
 */
export default function EditRecordDate({
  table,
  id,
  fields,
  record,
  label = 'Change date',
  what,
  onSaved,
  buttonStyle,
}) {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({});

  if (!isAdmin()) return null;

  const start = () => {
    const next = {};
    for (const f of fields) next[f.column] = tsToYmd(record?.[f.column]);
    setDraft(next);
    setOpen(true);
  };

  const save = async () => {
    const updates = {};
    const changes = [];
    for (const f of fields) {
      const was = tsToYmd(record?.[f.column]);
      const now = draft[f.column];
      if (now === was) continue;
      if (!now) {
        // Clearing a date is a different operation from correcting one, and
        // most of these columns are what a record is filed under.
        toast.warning(`${f.label} cannot be left empty`);
        return;
      }
      updates[f.column] = f.kind === 'date' ? now : ymdToTs(now, record?.[f.column] || undefined);
      changes.push(`${f.label}: ${was ? prettyYmd(was) : '—'} → ${prettyYmd(now)}`);
    }
    if (changes.length === 0) { setOpen(false); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from(table).update(updates).eq('id', id);
      if (error) throw error;
      logActivity('record_date_corrected', `${what || table} re-dated — ${changes.join(', ')}`, { table, record_id: id, changes });
      toast.success('Date updated');
      setOpen(false);
      onSaved?.();
    } catch (err) {
      console.error('Re-date failed', err);
      toast.error(`Could not change the date: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); start(); }}
        title={label}
        style={buttonStyle || {
          padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: '6px',
          background: '#fff', cursor: 'pointer', fontSize: '12px', lineHeight: 1,
        }}
      >
        📅
      </button>

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}
          onClick={() => setOpen(false)}
        >
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '360px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px', fontSize: '17px' }}>📅 {label}</h3>
            <p style={{ margin: '0 0 18px', fontSize: '12px', color: '#6b7280' }}>
              {what ? `${what} — ` : ''}this moves the record between days in Reports and Accounts.
            </p>

            {fields.map(f => (
              <div key={f.column} style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>{f.label}</label>
                <input
                  type="date"
                  value={draft[f.column] || ''}
                  onChange={e => setDraft({ ...draft, [f.column]: e.target.value })}
                  style={{ width: '100%', padding: '9px 10px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
                {tsToYmd(record?.[f.column]) !== (draft[f.column] || '') && (
                  <div style={{ marginTop: '5px', fontSize: '11px', color: '#b45309', fontWeight: '600' }}>
                    was {record?.[f.column] ? prettyYmd(tsToYmd(record[f.column])) : '—'}
                  </div>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setOpen(false)} style={{ padding: '9px 18px', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={save} disabled={saving} style={{ padding: '9px 18px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>
                {saving ? 'Saving…' : 'Save date'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
