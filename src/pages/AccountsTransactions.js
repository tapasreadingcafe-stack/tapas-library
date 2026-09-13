/* Transactions — every sale, day by day, for any period.
 *
 * What the previous version got wrong, and must not regress:
 *
 *  - It read "library sales" from the legacy `sales` table, which the POS only
 *    writes to on installs without pos_transactions. Every real bill from both
 *    tills lives in pos_transactions, so this page showed none of them.
 *
 *  - It listed every cafe_order — but the POS writes a mirror cafe order for
 *    the kitchen screen whenever a bill contains cafe items ("Billed via ...").
 *    Those are the same sale as the bill, and a mirror outlives its bill when
 *    the bill is deleted. Only cafe orders raised on their own are listed.
 *
 *  - It built dates with toISOString(), which is UTC: a day was shifted by
 *    5h30m, and before 05:30 IST "today" meant yesterday. Periods here are
 *    local calendar days, converted to exact instants for the query.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { STREAMS, splitByStream } from '../utils/revenueStreams';
import { buildBillNumbers } from '../utils/invoiceNumber';
import EditRecordDate from '../components/EditRecordDate';

const PRESETS = [
  { key: 'today',      label: 'Today' },
  { key: 'yesterday',  label: 'Yesterday' },
  { key: 'week',       label: 'This week' },
  { key: 'month',      label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'custom',     label: 'Custom' },
];

const METHODS = {
  cash:  { label: 'Cash', color: '#15803d' },
  upi:   { label: 'UPI',  color: '#7c3aed' },
  card:  { label: 'Card', color: '#2563eb' },
  other: { label: 'Other', color: '#6b7280' },
};

const n = (v) => Number(v) || 0;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, k) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + k);
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const money = (v) => `₹${n(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** [start, end) as local midnights. */
function rangeFor(unit, anchor, customFrom, customTo) {
  if (unit === 'day') {
    const s = startOfDay(anchor);
    return { start: s, end: addDays(s, 1) };
  }
  if (unit === 'week') {
    const s = startOfDay(anchor);
    const monday = addDays(s, -((s.getDay() + 6) % 7));
    return { start: monday, end: addDays(monday, 7) };
  }
  if (unit === 'month') {
    return {
      start: new Date(anchor.getFullYear(), anchor.getMonth(), 1),
      end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1),
    };
  }
  const today = startOfDay(new Date());
  const a = customFrom ? new Date(`${customFrom}T00:00:00`) : today;
  const b = customTo ? new Date(`${customTo}T00:00:00`) : today;
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return { start: lo, end: addDays(hi, 1) };
}

function labelFor(unit, start, end) {
  const f = (d, o) => d.toLocaleDateString('en-IN', o);
  if (unit === 'day') return f(start, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  if (unit === 'month') return f(start, { month: 'long', year: 'numeric' });
  const last = addDays(end, -1);
  if (ymd(start) === ymd(last)) return f(start, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `${f(start, { day: 'numeric', month: 'short' })} – ${f(last, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function presetToView(key) {
  const now = new Date();
  switch (key) {
    case 'yesterday':  return { unit: 'day', anchor: addDays(startOfDay(now), -1) };
    case 'week':       return { unit: 'week', anchor: now };
    case 'month':      return { unit: 'month', anchor: now };
    case 'last_month': return { unit: 'month', anchor: new Date(now.getFullYear(), now.getMonth() - 1, 1) };
    case 'custom':     return { unit: 'custom', anchor: now };
    default:           return { unit: 'day', anchor: now };
  }
}

export default function AccountsTransactions() {
  const [preset, setPreset] = useState('today');
  const [unit, setUnit] = useState('day');
  const [anchor, setAnchor] = useState(() => new Date());
  const [customFrom, setCustomFrom] = useState(ymd(addDays(new Date(), -6)));
  const [customTo, setCustomTo] = useState(ymd(new Date()));
  const [typeFilter, setTypeFilter] = useState('all');
  const [payFilter, setPayFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { start, end } = rangeFor(unit, anchor, customFrom, customTo);
  const startKey = start.getTime(), endKey = end.getTime();

  const choosePreset = (key) => {
    const v = presetToView(key);
    setPreset(key); setUnit(v.unit); setAnchor(v.anchor);
  };

  // Step one day / week / month back or forward.
  const step = (dir) => {
    setPreset(null);
    setAnchor((a) => (unit === 'day' ? addDays(a, dir)
      : unit === 'week' ? addDays(a, 7 * dir)
      : new Date(a.getFullYear(), a.getMonth() + dir, 1)));
  };
  const atPresent = unit !== 'custom' && end > new Date();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const from = new Date(startKey).toISOString();
    const to = new Date(endKey).toISOString();
    const [billsR, cafeR, salesR] = await Promise.all([
      supabase.from('pos_transactions').select('*, members(name), pos_transaction_items(*)')
        .gte('created_at', from).lt('created_at', to).order('created_at', { ascending: false }),
      supabase.from('cafe_orders').select('id, created_at, total_amount, payment_method, status, customer_name, notes')
        .gte('created_at', from).lt('created_at', to).order('created_at', { ascending: false }),
      supabase.from('sales').select('id, total_amount, sale_date, status, members(name)')
        .gte('sale_date', ymd(new Date(startKey))).lt('sale_date', ymd(new Date(endKey))),
    ]);
    if (billsR.error) setError(`Could not load bills: ${billsR.error.message}`);

    const bills = billsR.data || [];
    const numbers = buildBillNumbers(bills);
    const out = [];

    bills.forEach((b) => {
      // GST and round-off aren't revenue; strip them before splitting the bill
      // into what it was made of. The row still shows what was actually paid.
      const lines = (b.pos_transaction_items || []).map((l) =>
        (l.taxable_value !== null && l.taxable_value !== undefined ? { ...l, total_price: n(l.taxable_value) } : l));
      const gst = n(b.cgst_amount) + n(b.sgst_amount) + n(b.igst_amount);
      const split = lines.length ? splitByStream(lines, { [b.id]: n(b.total_amount) - gst - n(b.round_off) }) : null;
      const chips = split
        ? Object.keys(STREAMS).filter((k) => split[k] > 0).map((k) => ({ ...STREAMS[k], amount: split[k] }))
        : [];
      const types = new Set();
      if (!split) types.add('library');
      else {
        if (split.cafe > 0) types.add('cafe');
        if (split.library + split.membership + split.fines + split.deposit > 0) types.add('library');
      }
      out.push({
        key: `b-${b.id}`, at: new Date(b.created_at), ref: b.invoice_no || numbers[b.id] || '',
        customer: b.members?.name || 'Walk-in', chips, amount: n(b.total_amount),
        method: METHODS[(b.payment_method || '').toLowerCase()] ? b.payment_method.toLowerCase() : 'other',
        gst, deposit: split ? split.deposit : 0, types, counts: true,
        edit: { table: 'pos_transactions', id: b.id, column: 'created_at', kind: 'timestamp', record: b, what: 'Bill' },
      });
    });

    (cafeR.data || [])
      .filter((o) => !String(o.notes || '').startsWith('Billed via'))
      .forEach((o) => out.push({
        key: `c-${o.id}`, at: new Date(o.created_at), ref: 'Cafe order',
        customer: o.customer_name || 'Walk-in', chips: [{ ...STREAMS.cafe, amount: n(o.total_amount) }],
        amount: n(o.total_amount),
        method: METHODS[(o.payment_method || '').toLowerCase()] ? o.payment_method.toLowerCase() : 'other',
        gst: 0, deposit: 0, types: new Set(['cafe']),
        status: o.status, counts: !o.status || o.status === 'completed',
        edit: { table: 'cafe_orders', id: o.id, column: 'created_at', kind: 'timestamp', record: o, what: 'Cafe order' },
      }));

    // Older sales, from before pos_transactions existed. The POS writes to one
    // table or the other, never both, so these can't double-count a bill.
    if (!salesR.error) {
      (salesR.data || []).forEach((s) => out.push({
        key: `s-${s.id}`, at: new Date(`${s.sale_date}T12:00:00`), noTime: true, ref: 'Older sale',
        customer: s.members?.name || 'Walk-in', chips: [{ ...STREAMS.library, amount: n(s.total_amount) }],
        amount: n(s.total_amount), method: 'other', gst: 0, deposit: 0, types: new Set(['library']),
        status: s.status, counts: !s.status || s.status === 'completed',
        edit: { table: 'sales', id: s.id, column: 'sale_date', kind: 'date', record: s, what: 'Older sale' },
      }));
    }

    out.sort((a, b) => b.at - a.at);
    setRows(out);
    setLoading(false);
  }, [startKey, endKey]);

  useEffect(() => { load(); }, [load]);

  const q = search.trim().toLowerCase();
  const shown = rows.filter((r) =>
    (typeFilter === 'all' || r.types.has(typeFilter)) &&
    (payFilter === 'all' || r.method === payFilter) &&
    (!q || r.customer.toLowerCase().includes(q) || r.ref.toLowerCase().includes(q)));

  const counted = shown.filter((r) => r.counts);
  const total = counted.reduce((s, r) => s + r.amount, 0);
  const byMethod = Object.fromEntries(Object.keys(METHODS).map((m) => [m, counted.filter((r) => r.method === m).reduce((s, r) => s + r.amount, 0)]));
  const deposits = counted.reduce((s, r) => s + r.deposit, 0);
  const gstTotal = counted.reduce((s, r) => s + r.gst, 0);

  // Group by local day, newest first.
  const days = [];
  shown.forEach((r) => {
    const k = ymd(r.at);
    let g = days[days.length - 1];
    if (!g || g.key !== k) { g = { key: k, date: startOfDay(r.at), rows: [], total: 0 }; days.push(g); }
    g.rows.push(r);
    if (r.counts) g.total += r.amount;
  });
  const maxDay = Math.max(1, ...days.map((d) => d.total));
  const multiDay = unit !== 'day';

  const chipBtn = (on) => ({
    padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
    fontFamily: 'inherit', whiteSpace: 'nowrap', background: on ? '#667eea' : '#fff', color: on ? '#fff' : '#555',
    boxShadow: on ? 'none' : 'inset 0 0 0 1px #e5e7eb',
  });
  const arrowBtn = (disabled) => ({
    width: 38, height: 38, borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', fontSize: 18,
    cursor: disabled ? 'default' : 'pointer', color: disabled ? '#d1d5db' : '#374151', fontFamily: 'inherit', flexShrink: 0,
  });
  const select = { padding: '9px 10px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit' };

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
      <style>{`
        .txn-row { display: grid; grid-template-columns: 58px minmax(0,1.2fr) minmax(0,2fr) 62px 100px; gap: 12px;
          align-items: center; padding: 11px 14px; border-top: 1px solid #f2f3f5; }
        .txn-chip { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 11px;
          font-size: 11px; font-weight: 700; white-space: nowrap; margin: 2px 4px 2px 0; }
        @media (max-width: 700px) {
          .txn-row { grid-template-columns: 1fr auto; grid-template-areas: "who amt" "chips chips" "meta meta"; gap: 4px 10px; }
          .txn-when { grid-area: meta; order: 5; }
          .txn-who { grid-area: who; }
          .txn-chips { grid-area: chips; }
          .txn-method { display: none; }
          .txn-amt { grid-area: amt; }
          .txn-head { display: none !important; }
        }
      `}</style>

      <h1 style={{ fontSize: 26, margin: '0 0 14px' }}>💸 Transactions</h1>

      {/* Period */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 10 }}>
        {PRESETS.map((p) => (
          <button key={p.key} style={chipBtn(preset === p.key)} onClick={() => choosePreset(p.key)}>{p.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {unit !== 'custom' ? (
          <>
            <button style={arrowBtn(false)} onClick={() => step(-1)} aria-label="Previous period">‹</button>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', minWidth: 0 }}>{labelFor(unit, start, end)}</div>
            <button style={arrowBtn(atPresent)} onClick={() => !atPresent && step(1)} disabled={atPresent} aria-label="Next period">›</button>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={select} />
            <span style={{ color: '#9ca3af' }}>to</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={select} />
          </div>
        )}
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', borderTop: '3px solid #667eea' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.5px' }}>COLLECTED</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{money(total)}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{counted.length} {counted.length === 1 ? 'sale' : 'sales'}</div>
        </div>
        {['cash', 'upi', 'card'].map((m) => (
          <div key={m} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', borderTop: `3px solid ${METHODS[m].color}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.5px' }}>{METHODS[m].label.toUpperCase()}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: METHODS[m].color, fontVariantNumeric: 'tabular-nums' }}>{money(byMethod[m])}</div>
          </div>
        ))}
      </div>
      {(deposits > 0 || gstTotal > 0) && (
        <div style={{ fontSize: 12, color: '#6b7280', margin: '-4px 0 14px' }}>
          Collected includes {deposits > 0 ? `${money(deposits)} refundable deposits` : ''}
          {deposits > 0 && gstTotal > 0 ? ' and ' : ''}
          {gstTotal > 0 ? `${money(gstTotal)} GST` : ''} — neither is income.
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={select}>
          <option value="all">Cafe &amp; library</option>
          <option value="cafe">Cafe only</option>
          <option value="library">Library only</option>
        </select>
        <select value={payFilter} onChange={(e) => setPayFilter(e.target.value)} style={select}>
          <option value="all">Any payment</option>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer or bill no."
          style={{ ...select, flex: '1 1 180px', minWidth: 0 }} />
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#999', textAlign: 'center', padding: 30 }}>Loading…</p>
      ) : shown.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 36, textAlign: 'center', color: '#9ca3af' }}>
          {rows.length === 0 ? 'No sales in this period' : 'No sales match these filters'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {days.map((day) => (
            <div key={day.key} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              {multiDay && (
                <div style={{ padding: '11px 14px', background: '#fafbfc', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', whiteSpace: 'nowrap' }}>
                    {day.date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                  <div style={{ flex: 1, height: 6, background: '#eef0f4', borderRadius: 3, minWidth: 30 }}>
                    <div style={{ width: `${(day.total / maxDay) * 100}%`, height: '100%', background: '#667eea', borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{day.rows.length} · </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#111827', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{money(day.total)}</div>
                </div>
              )}
              <div className="txn-row txn-head" style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.5px', padding: '8px 14px', borderTop: multiDay ? '1px solid #f2f3f5' : 0 }}>
                <div>TIME</div><div>CUSTOMER</div><div>WHAT</div><div>PAID BY</div><div style={{ textAlign: 'right' }}>AMOUNT</div>
              </div>
              {day.rows.map((r) => (
                <div key={r.key} className="txn-row" style={{ opacity: r.counts ? 1 : 0.55 }}>
                  <div className="txn-when" style={{ fontSize: 12, color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
                    {r.noTime ? '—' : r.at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="txn-who" style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.customer}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'ui-monospace, monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{r.ref}{r.status && r.status !== 'completed' ? ` · ${r.status}` : ''}</span>
                      {r.edit && (
                        <EditRecordDate
                          table={r.edit.table}
                          id={r.edit.id}
                          record={r.edit.record}
                          what={r.edit.what}
                          label="Change the date of this sale"
                          fields={[{ column: r.edit.column, label: 'Date of sale', kind: r.edit.kind }]}
                          onSaved={load}
                          buttonStyle={{ padding: '1px 5px', border: '1px solid #e5e7eb', borderRadius: 5, background: '#fff', cursor: 'pointer', fontSize: 10, lineHeight: 1.4 }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="txn-chips" style={{ minWidth: 0 }}>
                    {r.chips.map((c) => (
                      <span key={c.key} className="txn-chip" style={{ color: c.color, background: `${c.color}14` }}>
                        {c.icon} {c.label} {money(c.amount)}
                      </span>
                    ))}
                  </div>
                  <div className="txn-method">
                    <span style={{ fontSize: 11, fontWeight: 700, color: METHODS[r.method].color }}>{METHODS[r.method].label}</span>
                  </div>
                  <div className="txn-amt" style={{ textAlign: 'right', fontSize: 15, fontWeight: 800, color: '#111827', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {money(r.amount)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
