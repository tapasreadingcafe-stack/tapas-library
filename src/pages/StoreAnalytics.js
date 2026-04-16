import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';

// =====================================================================
// /store/analytics — Basic storefront analytics.
//
// What it shows (all scoped to the last 30 days by default, 7 / 90
// available):
//   - Overview tiles: subscribers, contact submissions, orders, revenue
//   - Daily trend chart (inline SVG sparkline for each metric)
//   - Top pages / sources for form submissions and newsletter signups
//
// Everything is computed client-side from three existing tables —
// no new migrations. Missing tables are tolerated so each section
// can render independently.
// =====================================================================

const RANGES = [
  { key: '7',  label: '7 days',   days: 7 },
  { key: '30', label: '30 days',  days: 30 },
  { key: '90', label: '90 days',  days: 90 },
];

function daysAgoIso(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function countByDay(rows, days) {
  const buckets = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of rows || []) {
    const iso = r.created_at || r.placed_at;
    if (!iso) continue;
    const key = iso.slice(0, 10);
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

function Spark({ series, color, height = 40 }) {
  const max = Math.max(1, ...series.map(s => s.count));
  const w = 220;
  const step = series.length > 1 ? w / (series.length - 1) : 0;
  const points = series.map((s, i) => `${(i * step).toFixed(1)},${(height - (s.count / max) * height).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

function Tile({ label, value, series, color }) {
  return (
    <div style={{
      padding: '18px 20px',
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '10px',
    }}>
      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</div>
      <div style={{ fontSize: '32px', fontWeight: 700, color: '#111827', marginTop: '4px', lineHeight: 1.1 }}>{value}</div>
      {series && <div style={{ marginTop: '10px' }}><Spark series={series} color={color} /></div>}
    </div>
  );
}

function TopList({ title, entries, emptyLabel }) {
  return (
    <div style={{
      padding: '16px 20px',
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px',
    }}>
      <div style={{ fontSize: '12px', color: '#374151', fontWeight: 700, marginBottom: '12px' }}>
        {title}
      </div>
      {entries.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#9ca3af', padding: '8px 0' }}>{emptyLabel || 'No data yet.'}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {entries.map(([key, val]) => (
            <div key={key} style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '13px', color: '#374151', alignItems: 'center',
            }}>
              <span style={{
                overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap', maxWidth: '180px',
                fontFamily: 'ui-monospace, monospace', fontSize: '12px',
              }}>{key || '(unknown)'}</span>
              <span style={{ fontWeight: 700, color: '#111827' }}>{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StoreAnalytics() {
  const [range, setRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subs, setSubs] = useState([]);
  const [forms, setForms] = useState([]);
  const [orders, setOrders] = useState([]);

  const days = RANGES.find(r => r.key === range)?.days || 30;

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    const since = daysAgoIso(days);
    try {
      const [s, f, o] = await Promise.allSettled([
        supabase.from('newsletter_subscribers').select('id, source_page, created_at').gte('created_at', since).limit(5000),
        supabase.from('contact_submissions').select('id, source_page, created_at').gte('created_at', since).limit(5000),
        supabase.from('customer_orders').select('id, total, status, created_at').gte('created_at', since).limit(5000),
      ]);
      setSubs(s.status === 'fulfilled' ? (s.value.data || []) : []);
      setForms(f.status === 'fulfilled' ? (f.value.data || []) : []);
      setOrders(o.status === 'fulfilled' ? (o.value.data || []) : []);
      // Surface any non-trivial error (e.g. RLS denial)
      const firstErr = [s, f, o].find(x => x.status === 'fulfilled' && x.value.error);
      if (firstErr) setError(firstErr.value.error.message);
    } catch (err) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const subSeries = useMemo(() => countByDay(subs, days), [subs, days]);
  const formSeries = useMemo(() => countByDay(forms, days), [forms, days]);
  const orderSeries = useMemo(() => countByDay(orders, days), [orders, days]);

  const revenue = useMemo(() => {
    return orders
      .filter(o => !['cancelled', 'refunded', 'pending'].includes(o.status))
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [orders]);

  const topFormSources = useMemo(() => {
    const map = new Map();
    for (const f of forms) {
      const k = f.source_page || '(unknown)';
      map.set(k, (map.get(k) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [forms]);

  const topSubSources = useMemo(() => {
    const map = new Map();
    for (const s of subs) {
      const k = s.source_page || '(unknown)';
      map.set(k, (map.get(k) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [subs]);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#2c3e50' }}>
            📊 Store analytics
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6b7280' }}>
            Subscribers, form submissions, and order volume from your public website.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              style={{
                padding: '7px 14px',
                background: range === r.key ? '#667eea' : 'white',
                color: range === r.key ? 'white' : '#2c3e50',
                border: `1.5px solid ${range === r.key ? '#667eea' : '#dfe4ea'}`,
                borderRadius: '20px', cursor: 'pointer',
                fontWeight: '600', fontSize: '12px',
              }}
            >{r.label}</button>
          ))}
          <button
            onClick={fetchAll}
            style={{
              padding: '7px 12px', background: '#667eea', color: 'white',
              border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px',
            }}
          >↻</button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', marginBottom: '16px',
          background: '#fef2f2', border: '1px solid #fecaca',
          color: '#991b1b', borderRadius: '8px', fontSize: '13px',
        }}>⚠️ {error}</div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#8B6914' }}>Loading analytics…</div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px', marginBottom: '20px',
          }}>
            <Tile label="Newsletter signups"    value={subs.length}  series={subSeries}   color="#667eea" />
            <Tile label="Contact submissions"   value={forms.length} series={formSeries}  color="#10b981" />
            <Tile label="Orders"                value={orders.length} series={orderSeries} color="#f59e0b" />
            <Tile label="Revenue (₹, ex-refunds)" value={`₹${revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '12px',
          }}>
            <TopList
              title="Top pages for form submissions"
              entries={topFormSources}
              emptyLabel="No form submissions yet."
            />
            <TopList
              title="Top pages for newsletter signups"
              entries={topSubSources}
              emptyLabel="No signups yet."
            />
          </div>
        </>
      )}
    </div>
  );
}
