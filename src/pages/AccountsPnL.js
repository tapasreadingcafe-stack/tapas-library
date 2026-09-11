/* Profit & loss — one statement per side of the business.
 *
 * The cafe and the library are run as two sets of books. Revenue is split per
 * bill line (revenueStreams.js), expenses carry the side they belong to
 * (cafe / library / shared), and shared costs — rent, power, most salaries —
 * are divided by a percentage the owner sets here.
 *
 * Three things the previous version of this page got wrong, and must not
 * regress:
 *
 *  - It took "library sales" from bill TOTALS, which contain the cafe lines,
 *    memberships and refundable deposits of the same bill, then added cafe
 *    orders and member plan prices on top. A coffee rung on the book till was
 *    counted twice; a ₹1,000 deposit was counted as income.
 *
 *  - It estimated GST at guessed rates on every rupee of revenue and
 *    subtracted that from profit — inventing a tax liability on sales that
 *    never had GST charged. GST shown here is what bills actually collected.
 *
 *  - A bill's total_amount includes any GST and round-off. Revenue is derived
 *    only after both are stripped: GST is held for the government, not earned.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { splitByStream, streamOf } from '../utils/revenueStreams';

const EXP_CATEGORIES = ['ingredients', 'equipment', 'utilities', 'rent', 'salary', 'maintenance', 'marketing', 'other'];
const STREAM_VERTICAL = { cafe: 'cafe', library: 'library', membership: 'library', fines: 'library' };
const DEFAULT_CAFE_PCT = 50;
const CAFE = '#0f9c7c';
const LIBRARY = '#5560d8';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_quarter', label: 'This Quarter' },
  { key: 'this_year', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
];

// Local dates, not toISOString() — that is UTC, so late-night IST would land
// a sale on the wrong day.
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const num = (v) => Number(v) || 0;

function getPeriodDates(period, customStart, customEnd) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  switch (period) {
    case 'today': return { start: ymd(now), end: ymd(now) };
    case 'this_week': {
      const dow = (now.getDay() + 6) % 7; // week starts Monday
      return { start: ymd(new Date(y, m, now.getDate() - dow)), end: ymd(now) };
    }
    case 'last_month': return { start: ymd(new Date(y, m - 1, 1)), end: ymd(new Date(y, m, 0)) };
    case 'this_quarter': {
      const q = Math.floor(m / 3) * 3;
      return { start: ymd(new Date(y, q, 1)), end: ymd(new Date(y, q + 3, 0)) };
    }
    case 'this_year': return { start: ymd(new Date(y, 0, 1)), end: ymd(new Date(y, 11, 31)) };
    case 'custom': return { start: customStart || ymd(new Date(y, m, 1)), end: customEnd || ymd(now) };
    default: return { start: ymd(new Date(y, m, 1)), end: ymd(new Date(y, m + 1, 0)) };
  }
}

// The same number of days immediately before the chosen period.
function getPreviousPeriodDates(period, customStart, customEnd) {
  const { start, end } = getPeriodDates(period, customStart, customEnd);
  const s = new Date(`${start}T00:00:00`), e = new Date(`${end}T00:00:00`);
  const days = Math.round((e - s) / 86400000) + 1;
  const pe = new Date(s); pe.setDate(pe.getDate() - 1);
  const ps = new Date(pe); ps.setDate(ps.getDate() - (days - 1));
  return { start: ymd(ps), end: ymd(pe) };
}

function pctChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function formatINR(n) {
  const v = num(n);
  return (v < 0 ? '−₹' : '₹') + Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function loadCafePct() {
  try {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'accounts_split').maybeSingle();
    const v = Number(data?.value?.cafe_pct);
    return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : DEFAULT_CAFE_PCT;
  } catch { return DEFAULT_CAFE_PCT; }
}

async function fetchPeriodData(startDate, endDate, cafePct) {
  const from = `${startDate}T00:00:00`, to = `${endDate}T23:59:59`;
  const settled = await Promise.allSettled([
    // `*` rather than named columns: the GST columns only exist once that
    // migration has run, and naming a missing column fails the whole query.
    supabase.from('pos_transactions').select('*, pos_transaction_items(*)').gte('created_at', from).lte('created_at', to),
    supabase.from('sales').select('total_amount').gte('sale_date', startDate).lte('sale_date', endDate).eq('status', 'completed'),
    supabase.from('cafe_orders').select('total_amount, notes').gte('created_at', from).lte('created_at', to).eq('status', 'completed'),
    supabase.from('event_registrations').select('amount_paid').gte('registration_date', from).lte('registration_date', to).neq('status', 'cancelled'),
    supabase.from('cafe_expenses').select('*').gte('expense_date', startDate).lte('expense_date', endDate),
    supabase.from('cafe_order_items').select('quantity, menu_item_id, cafe_orders!inner(created_at, status)').gte('cafe_orders.created_at', from).lte('cafe_orders.created_at', to).eq('cafe_orders.status', 'completed'),
    supabase.from('cafe_menu_items').select('id, cost_price'),
  ]);
  const ok = (i) => (settled[i].status === 'fulfilled' && !settled[i].value.error ? (settled[i].value.data || []) : []);
  const taxOf = (x) => num(x.cgst_amount) + num(x.sgst_amount) + num(x.igst_amount);

  // ── Revenue, per line ────────────────────────────────────────────────────
  const bills = ok(0);
  const lines = bills.flatMap((b) => b.pos_transaction_items || [])
    .map((l) => (l.taxable_value !== null && l.taxable_value !== undefined ? { ...l, total_price: num(l.taxable_value) } : l));
  const billTotals = {};
  bills.forEach((b) => { billTotals[b.id] = num(b.total_amount) - taxOf(b) - num(b.round_off); });
  const streams = splitByStream(lines, billTotals);
  // Old bills stored no lines — they can't be attributed, so they land under
  // books rather than vanishing.
  const unattributed = lines.length === 0
    ? Math.max(bills.reduce((s, b) => s + billTotals[b.id], 0), ok(1).reduce((s, r) => s + num(r.total_amount), 0))
    : 0;

  // Cafe orders mirrored from a POS bill are already inside that bill's lines.
  const standaloneCafe = ok(2)
    .filter((o) => !String(o.notes || '').startsWith('Billed via'))
    .reduce((s, o) => s + num(o.total_amount), 0);
  const events = ok(3).reduce((s, r) => s + num(r.amount_paid), 0);

  // ── GST actually collected, by the stream of each taxed line ─────────────
  const gst = { cafe: 0, library: 0 };
  bills.forEach((b) => (b.pos_transaction_items || []).forEach((l) => {
    const t = taxOf(l);
    if (!t) return;
    gst[STREAM_VERTICAL[streamOf(l)] || 'library'] += t;
  }));

  // ── Expenses, by side ────────────────────────────────────────────────────
  const expenseRows = ok(4);
  // Before the verticals migration the column is absent on every row.
  const verticalTracked = expenseRows.length === 0 || expenseRows.some((r) => r.vertical !== undefined);
  const byVertical = { cafe: {}, library: {}, shared: {} };
  expenseRows.forEach((r) => {
    const v = ['cafe', 'library', 'shared'].includes(r.vertical) ? r.vertical : 'shared';
    const c = EXP_CATEGORIES.includes(r.category) ? r.category : 'other';
    byVertical[v][c] = (byVertical[v][c] || 0) + num(r.amount);
  });

  // ── Cafe cost of goods — every cafe item sold, whichever till rang it ────
  const costMap = {};
  ok(6).forEach((m) => { if (m.cost_price) costMap[m.id] = num(m.cost_price); });
  const cogs = ok(5).reduce((s, it) => s + (costMap[it.menu_item_id] || 0) * (num(it.quantity) || 1), 0);

  const sharedTotal = Object.values(byVertical.shared).reduce((s, v) => s + v, 0);
  const cafeShare = (sharedTotal * cafePct) / 100;

  return {
    cafe: {
      revenue: [{ key: 'cafeSales', label: 'Cafe sales', value: streams.cafe + standaloneCafe }],
      cogs, direct: byVertical.cafe, sharedShare: cafeShare, gst: gst.cafe,
    },
    library: {
      revenue: [
        { key: 'books', label: 'Books & library sales', value: streams.library + unattributed },
        { key: 'membership', label: 'Membership fees', value: streams.membership },
        { key: 'fines', label: 'Fines & charges', value: streams.fines },
        { key: 'events', label: 'Event tickets', value: events },
      ],
      cogs: 0, direct: byVertical.library, sharedShare: sharedTotal - cafeShare, gst: gst.library,
    },
    shared: byVertical.shared,
    sharedTotal,
    deposits: streams.deposit,
    verticalTracked,
  };
}

function summarise(side) {
  const revenue = side.revenue.reduce((s, r) => s + r.value, 0);
  const directTotal = Object.values(side.direct).reduce((s, v) => s + v, 0);
  const gross = revenue - side.cogs;
  const net = gross - directTotal - side.sharedShare;
  return { revenue, directTotal, gross, net };
}

/* ---------- styles ---------- */
const card = { background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const sectionTitle = { fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', borderBottom: '2px solid', paddingBottom: '6px' };
const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f3f3f3' };
const labelStyle = { fontSize: '14px', color: '#555' };
const valStyle = { fontSize: '14px', fontWeight: 500, fontFamily: 'ui-monospace, monospace', color: '#333', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const btnBase = { padding: '8px 14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit' };
const periodBtn = (active) => ({ ...btnBase, background: active ? '#667eea' : '#f0f0f0', color: active ? 'white' : '#555' });

function ChangeIndicator({ value }) {
  if (!value || Number.isNaN(value)) return <span style={{ fontSize: '11px', color: '#bbb', marginLeft: '8px', minWidth: 52, textAlign: 'right' }}>—</span>;
  const up = value > 0;
  return (
    <span style={{ fontSize: '11px', fontWeight: 600, marginLeft: '8px', minWidth: 52, textAlign: 'right', color: up ? '#27ae60' : '#e74c3c' }}>
      {up ? '▲' : '▼'} {Math.abs(value).toFixed(0)}%
    </span>
  );
}

function Row({ label, value, prev, deduct, indent, muted, strong, color }) {
  return (
    <div style={{ ...rowStyle, paddingLeft: indent ? 16 : 0, ...(strong ? { borderBottom: 0, borderTop: '2px solid #333', marginTop: 4, paddingTop: 10 } : {}) }}>
      <span style={{ ...labelStyle, ...(muted ? { color: '#aaa', fontStyle: 'italic' } : {}), ...(strong ? { fontWeight: 700, color: '#222', fontSize: 15 } : {}) }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ ...valStyle, ...(strong ? { fontWeight: 700, fontSize: 15 } : {}), ...(color ? { color } : {}), ...(muted ? { color: '#bbb' } : {}) }}>
          {deduct && value ? `− ${formatINR(value)}` : formatINR(value)}
        </span>
        {prev !== undefined && <ChangeIndicator value={pctChange(value, prev)} />}
      </span>
    </div>
  );
}

function Statement({ side, prevSide, isCafe, cafePct, shared, deposits }) {
  const accent = isCafe ? CAFE : LIBRARY;
  const s = summarise(side);
  const p = prevSide ? summarise(prevSide) : null;
  const sharePct = isCafe ? cafePct : 100 - cafePct;
  const directCats = EXP_CATEGORIES.filter((c) => (side.direct[c] || 0) > 0);
  const sharedCats = EXP_CATEGORIES.filter((c) => (shared[c] || 0) > 0);

  return (
    <>
      <div style={card}>
        <div style={{ ...sectionTitle, color: accent, borderBottomColor: accent }}>Revenue</div>
        {side.revenue.map((r) => (
          <Row key={r.key} indent label={r.label} value={r.value} prev={prevSide?.revenue.find((x) => x.key === r.key)?.value} />
        ))}
        <Row strong label="Total revenue" value={s.revenue} prev={p?.revenue} color="#27ae60" />
        {isCafe && (
          <>
            <Row indent label="Cost of goods sold" value={side.cogs} deduct muted={!side.cogs} />
            {!side.cogs && (
              <div style={{ fontSize: 11, color: '#aaa', padding: '4px 0 0 16px' }}>
                Set a cost price on menu items and this fills in automatically.
              </div>
            )}
            <Row strong label="Gross profit" value={s.gross} prev={p?.gross} color={s.gross >= 0 ? '#27ae60' : '#e74c3c'} />
          </>
        )}
      </div>

      <div style={card}>
        <div style={{ ...sectionTitle, color: '#e74c3c', borderBottomColor: '#e74c3c' }}>
          Expenses — {isCafe ? 'cafe' : 'library'} only
        </div>
        {directCats.map((c) => <Row key={c} indent label={cap(c)} value={side.direct[c]} deduct />)}
        {directCats.length === 0 && <Row indent muted label={`Nothing booked to the ${isCafe ? 'cafe' : 'library'} this period`} value={0} />}

        <div style={{ ...sectionTitle, color: '#6b7280', borderBottomColor: '#d1d5db', marginTop: 18 }}>
          Share of shared costs — {sharePct}%
        </div>
        {sharedCats.map((c) => (
          <Row key={c} indent label={`${cap(c)} · ${sharePct}% of ${formatINR(shared[c])}`} value={(shared[c] * sharePct) / 100} deduct />
        ))}
        {sharedCats.length === 0 && <Row indent muted label="No shared costs this period" value={0} />}
        <Row strong label="Total expenses" value={s.directTotal + side.sharedShare} deduct color="#e74c3c" />
      </div>

      <div style={{ ...card, borderTop: `3px solid ${accent}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#222' }}>Net profit</span>
          <span style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'ui-monospace, monospace', color: s.net >= 0 ? '#27ae60' : '#e74c3c', fontVariantNumeric: 'tabular-nums' }}>
              {formatINR(s.net)}
            </span>
            {p && <ChangeIndicator value={pctChange(s.net, p.net)} />}
          </span>
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed #e5e7eb', display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280' }}>
            <span>GST collected · held for the government, not income</span>
            <span style={{ fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap' }}>{formatINR(side.gst)}</span>
          </div>
          {!isCafe && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280' }}>
              <span>Refundable deposits taken · owed back, not income</span>
              <span style={{ fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap' }}>{formatINR(deposits)}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Combined({ cur, prev, cafePct }) {
  const c = summarise(cur.cafe), l = summarise(cur.library);
  const pc = prev ? summarise(prev.cafe) : null, pl = prev ? summarise(prev.library) : null;
  const rows = [
    { label: 'Revenue', c: c.revenue, l: l.revenue },
    { label: 'Cost of goods sold', c: -cur.cafe.cogs, l: 0 },
    { label: 'Direct expenses', c: -c.directTotal, l: -l.directTotal },
    { label: `Shared costs (${cafePct}% / ${100 - cafePct}%)`, c: -cur.cafe.sharedShare, l: -cur.library.sharedShare },
  ];
  const cell = { padding: '10px 10px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontSize: 14 };
  const head = { padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' };
  const totalNet = c.net + l.net;
  const prevNet = pc && pl ? pc.net + pl.net : undefined;

  return (
    <div style={card}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 460, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333' }}>
              <th style={{ ...head, textAlign: 'left', color: '#888' }} />
              <th style={{ ...head, color: CAFE }}>☕ Cafe</th>
              <th style={{ ...head, color: LIBRARY }}>📚 Library</th>
              <th style={{ ...head, color: '#333' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} style={{ borderBottom: '1px solid #f3f3f3' }}>
                <td style={{ padding: '10px 10px', fontSize: 14, color: '#555' }}>{r.label}</td>
                <td style={cell}>{formatINR(r.c)}</td>
                <td style={cell}>{formatINR(r.l)}</td>
                <td style={{ ...cell, fontWeight: 600 }}>{formatINR(r.c + r.l)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '3px double #333' }}>
              <td style={{ padding: '14px 10px', fontSize: 16, fontWeight: 800 }}>Net profit</td>
              <td style={{ ...cell, fontWeight: 800, fontSize: 16, color: c.net >= 0 ? '#27ae60' : '#e74c3c' }}>{formatINR(c.net)}</td>
              <td style={{ ...cell, fontWeight: 800, fontSize: 16, color: l.net >= 0 ? '#27ae60' : '#e74c3c' }}>{formatINR(l.net)}</td>
              <td style={{ ...cell, fontWeight: 800, fontSize: 17, color: totalNet >= 0 ? '#27ae60' : '#e74c3c' }}>
                {formatINR(totalNet)}
                {prevNet !== undefined && <ChangeIndicator value={pctChange(totalNet, prevNet)} />}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #e5e7eb', display: 'grid', gap: 6, fontSize: 13, color: '#6b7280' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <span>GST collected · held for the government</span>
          <span style={{ fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap' }}>{formatINR(cur.cafe.gst + cur.library.gst)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <span>Refundable deposits taken · owed back</span>
          <span style={{ fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap' }}>{formatINR(cur.deposits)}</span>
        </div>
      </div>
    </div>
  );
}

export default function AccountsPnL() {
  const [period, setPeriod] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [view, setView] = useState('cafe');
  const [cafePct, setCafePct] = useState(DEFAULT_CAFE_PCT);
  const [pctDraft, setPctDraft] = useState(String(DEFAULT_CAFE_PCT));
  const [savingPct, setSavingPct] = useState(false);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(null);
  const [previous, setPrevious] = useState(null);

  useEffect(() => {
    loadCafePct().then((p) => { setCafePct(p); setPctDraft(String(p)); });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = getPeriodDates(period, customStart, customEnd);
      const pd = getPreviousPeriodDates(period, customStart, customEnd);
      const [cur, prev] = await Promise.all([
        fetchPeriodData(d.start, d.end, cafePct),
        fetchPeriodData(pd.start, pd.end, cafePct),
      ]);
      setCurrent(cur);
      setPrevious(prev);
    } catch (err) {
      console.error('PnL fetch error:', err);
    }
    setLoading(false);
  }, [period, customStart, customEnd, cafePct]);

  useEffect(() => { load(); }, [load]);

  const draftPct = Math.min(100, Math.max(0, Math.round(Number(pctDraft))));
  const draftValid = pctDraft !== '' && Number.isFinite(draftPct);

  const savePct = async () => {
    if (!draftValid) return;
    setSavingPct(true);
    try {
      await supabase.from('app_settings').upsert({
        key: 'accounts_split', value: { cafe_pct: draftPct }, updated_at: new Date().toISOString(),
      });
    } catch (e) { console.error('Could not save split', e); }
    setCafePct(draftPct);
    setPctDraft(String(draftPct));
    setSavingPct(false);
  };

  const d = getPeriodDates(period, customStart, customEnd);
  const tab = (key, text, color) => (
    <button key={key} onClick={() => setView(key)} style={{
      ...btnBase, flex: '1 1 0', padding: '11px 10px', fontSize: 14,
      background: view === key ? color : '#fff', color: view === key ? '#fff' : '#444',
      border: `1px solid ${view === key ? color : '#e5e7eb'}`,
    }}>{text}</button>
  );

  return (
    <div style={{ padding: '16px', maxWidth: '900px', margin: '0 auto' }}>
      <style>{`
        @media print { .no-print { display: none !important; } body { background: white; } }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <h1 style={{ fontSize: '26px', margin: 0 }}>Profit &amp; Loss</h1>
        <button className="no-print" onClick={() => window.print()} style={{ ...btnBase, background: '#667eea', color: 'white' }}>Print</button>
      </div>

      {/* Which set of books */}
      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {tab('cafe', '☕ Cafe', CAFE)}
        {tab('library', '📚 Library', LIBRARY)}
        {tab('combined', 'Both', '#374151')}
      </div>

      {/* Period */}
      <div className="no-print" style={{ ...card, padding: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: 2 }}>
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)} style={{ ...periodBtn(period === p.key), whiteSpace: 'nowrap' }}>{p.label}</button>
          ))}
        </div>
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }} />
            <span style={{ color: '#999' }}>to</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }} />
          </div>
        )}
      </div>

      {/* Shared-cost split */}
      <div className="no-print" style={{ ...card, padding: '14px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>Shared costs</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: CAFE, fontWeight: 700 }}>
            ☕ Cafe
            <input type="number" inputMode="numeric" min="0" max="100" value={pctDraft}
              onChange={(e) => setPctDraft(e.target.value)}
              style={{ width: 62, padding: '7px 8px', border: '1px solid #ddd', borderRadius: 7, fontSize: 14, textAlign: 'right' }} />
            %
          </label>
          <span style={{ fontSize: 14, color: LIBRARY, fontWeight: 700 }}>📚 Library {draftValid ? 100 - draftPct : '—'}%</span>
          {draftValid && draftPct !== cafePct && (
            <button onClick={savePct} disabled={savingPct} style={{ ...btnBase, background: '#667eea', color: '#fff' }}>
              {savingPct ? 'Saving…' : 'Save split'}
            </button>
          )}
        </div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6, lineHeight: 1.5 }}>
          Rent, power, internet and most salaries serve both sides. This decides how they're divided between the two statements.
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: '12px', color: '#888', marginBottom: '10px' }}>
        {d.start === d.end ? d.start : `${d.start} to ${d.end}`} · revenue excludes GST and refundable deposits
      </div>

      {loading || !current ? (
        <p style={{ color: '#999', textAlign: 'center', padding: 30 }}>Loading financial data…</p>
      ) : (
        <>
          {!current.verticalTracked && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 10, padding: '11px 14px', fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
              ⚠️ Expenses aren't tagged cafe or library yet, so every expense is being treated as shared and split {cafePct}/{100 - cafePct}.
              Run <code>supabase/migrations/20260911_expense_verticals.sql</code>, then tag each expense.
            </div>
          )}

          {view === 'combined' ? (
            <Combined cur={current} prev={previous} cafePct={cafePct} />
          ) : (
            <Statement
              isCafe={view === 'cafe'}
              side={view === 'cafe' ? current.cafe : current.library}
              prevSide={previous ? (view === 'cafe' ? previous.cafe : previous.library) : null}
              cafePct={cafePct}
              shared={current.shared}
              deposits={current.deposits}
            />
          )}
        </>
      )}

      <div style={{ textAlign: 'center', fontSize: '11px', color: '#bbb', margin: '8px 0 20px' }}>
        Generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}
