import React from 'react';
import { useAuth } from '../context/AuthContext';
import { todayYmd, isBackdated, daysFromToday, prettyYmd } from '../utils/backdate';

/* Admin-only date picker for recording something on a day other than today.
 *
 * Renders nothing at all for non-admin staff — they keep the old behaviour of
 * everything landing on today, with no field to get wrong. For an admin it is
 * deliberately loud once the date leaves today, because a backdated entry
 * moves money between days in Reports, Accounts and the GST return.
 */
export default function DateOverride({
  value,
  onChange,
  label = 'Date',
  hint,
  max = todayYmd(),
  min,
  disabled = false,
  compact = false,
}) {
  const { isAdmin } = useAuth();
  if (!isAdmin()) return null;

  const off = isBackdated(value);
  const days = daysFromToday(value);

  return (
    <div style={{
      border: `1px solid ${off ? '#fcd34d' : '#e5e7eb'}`,
      background: off ? '#fffbeb' : '#fafafa',
      borderRadius: '10px',
      padding: compact ? '8px 10px' : '10px 12px',
      marginBottom: compact ? '8px' : '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '12px', fontWeight: '700', color: off ? '#92400e' : '#6b7280', whiteSpace: 'nowrap' }}>
          {off ? '📅' : '🗓️'} {label}
        </label>
        <input
          type="date"
          value={value || ''}
          max={max || undefined}
          min={min || undefined}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value || todayYmd())}
          style={{
            padding: '6px 8px',
            border: `1px solid ${off ? '#fcd34d' : '#e0e0e0'}`,
            borderRadius: '7px',
            fontSize: '13px',
            background: '#fff',
            color: '#111',
          }}
        />
        {off && (
          <>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#b45309' }}>
              {days < 0 ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} back` : `${days} day${days === 1 ? '' : 's'} ahead`}
            </span>
            <button
              type="button"
              onClick={() => onChange(todayYmd())}
              style={{
                padding: '5px 10px', border: '1px solid #fcd34d', borderRadius: '7px',
                background: '#fff', color: '#92400e', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              }}
            >
              Reset to today
            </button>
          </>
        )}
      </div>
      {off && (
        <div style={{ marginTop: '6px', fontSize: '11px', color: '#b45309', lineHeight: 1.5 }}>
          This will be recorded on <strong>{prettyYmd(value)}</strong>, not today — it will appear under that day in Reports and Accounts.
        </div>
      )}
      {!off && hint && (
        <div style={{ marginTop: '6px', fontSize: '11px', color: '#9ca3af' }}>{hint}</div>
      )}
    </div>
  );
}
