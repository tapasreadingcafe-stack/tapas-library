import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { buildBillNumbers } from '../utils/invoiceNumber';
import { streamOf } from '../utils/revenueStreams';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import ViewOnlyBanner from '../components/ViewOnlyBanner';
import { exportToCSV } from '../utils/exportCSV';
import { todayYmd, ymdToTs } from '../utils/backdate';

// Every refundable deposit taken on a POS bill, and what has been paid back.
//
// A deposit is a bill line whose stream is 'deposit' (the same classifier
// Accounts uses, so "Deposit (Refundable)" ₹1000 and "Casual Deposit
// (Refundable)" ₹500 both count). Refunds live in deposit_refunds, one row per
// payment back, so a deposit can be returned in part — e.g. keeping a damage
// charge — and shows as Held, Part refunded or Refunded.

const fmt = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const fmtDate = (ts) => (ts ? new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const METHODS = [['cash', '💵 Cash'], ['upi', '📱 UPI'], ['card', '💳 Card'], ['bank', '🏦 Bank']];

async function loadDeposits() {
  const { data: items, error } = await supabase
    .from('pos_transaction_items')
    .select('id, transaction_id, item_type, item_name, total_price')
    .or('item_type.eq.deposit,item_name.ilike.*deposit*')
    .limit(5000);
  if (error) throw error;
  const deposits = (items || []).filter(i => streamOf(i) === 'deposit' && Number(i.total_price) > 0);
  if (!deposits.length) return { rows: [], refundsReady: true };

  const txnIds = [...new Set(deposits.map(d => d.transaction_id))];
  const txns = [];
  for (let i = 0; i < txnIds.length; i += 200) {
    const { data, error: tErr } = await supabase
      .from('pos_transactions')
      .select('id, created_at, payment_method, invoice_no, member_id, members(name, phone)')
      .in('id', txnIds.slice(i, i + 200));
    if (tErr) throw tErr;
    txns.push(...(data || []));
  }
  const txnById = new Map(txns.map(t => [t.id, t]));

  // Bill numbers are sequenced within each day, so read every bill on the days
  // these deposits fall on — one small query per day, with a day either side
  // so the local (IST) day is always complete.
  const shift = (ymd, n) => { const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const days = [...new Set(txns.map(t => (t.created_at || '').slice(0, 10)).filter(Boolean))];
  const perDay = await Promise.all(days.map(day => supabase
    .from('pos_transactions').select('id, created_at, invoice_no')
    .gte('created_at', `${shift(day, -1)}T00:00:00`)
    .lte('created_at', `${shift(day, 1)}T23:59:59`)
    .then(({ data }) => data || [])));
  const dayBills = [...new Map(perDay.flat().map(b => [b.id, b])).values()];
  const billNo = buildBillNumbers(dayBills);

  let refunds = [];
  let refundsReady = true;
  const { data: refData, error: refErr } = await supabase
    .from('deposit_refunds')
    .select('id, deposit_item_id, amount, method, note, refunded_at')
    .in('deposit_item_id', deposits.map(d => d.id));
  if (refErr) refundsReady = false; // table not created yet
  else refunds = refData || [];

  const rows = deposits.map(d => {
    const t = txnById.get(d.transaction_id) || {};
    const mine = refunds.filter(r => r.deposit_item_id === d.id).sort((a, b) => a.refunded_at.localeCompare(b.refunded_at));
    const refunded = mine.reduce((s, r) => s + Number(r.amount || 0), 0);
    const amount = Number(d.total_price) || 0;
    return {
      id: d.id,
      transactionId: d.transaction_id,
      memberId: t.member_id || null,
      name: t.members?.name || 'Walk-in',
      phone: t.members?.phone || '',
      kind: /casual/i.test(d.item_name) ? 'Casual' : 'Member',
      itemName: d.item_name,
      paidAt: t.created_at,
      method: t.payment_method,
      billNo: t.invoice_no || billNo[t.id] || '—',
      amount,
      refunds: mine,
      refunded,
      held: Math.max(0, amount - refunded),
      status: refunded <= 0 ? 'held' : refunded >= amount ? 'refunded' : 'partial',
    };
  }).sort((a, b) => (b.paidAt || '').localeCompare(a.paidAt || ''));
  return { rows, refundsReady };
}

export default function AccountsDeposits() {
  const toast = useToast();
  const confirm = useConfirm();
  const { staff } = useAuth();
  const { isReadOnly } = usePermission();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refundsReady, setRefundsReady] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [refundFor, setRefundFor] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [refundDate, setRefundDate] = useState(todayYmd());
  const [refundNote, setRefundNote] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await loadDeposits();
      setRows(r.rows);
      setRefundsReady(r.refundsReady);
    } catch (e) {
      console.error(e);
      toast.error('Could not load deposits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []); // eslint-disable-line

  const shown = useMemo(() => rows.filter(r => {
    if (statusFilter === 'held' && r.status === 'refunded') return false;
    if (statusFilter === 'refunded' && r.status === 'held') return false;
    const q = search.trim().toLowerCase();
    if (q && !r.name.toLowerCase().includes(q) && !r.phone.includes(q) && !String(r.billNo).toLowerCase().includes(q)) return false;
    return true;
  }), [rows, statusFilter, search]);

  const totals = useMemo(() => rows.reduce((t, r) => ({
    collected: t.collected + r.amount,
    refunded: t.refunded + r.refunded,
    held: t.held + r.held,
    heldCount: t.heldCount + (r.held > 0 ? 1 : 0),
  }), { collected: 0, refunded: 0, held: 0, heldCount: 0 }), [rows]);

  const openRefund = (r) => {
    setRefundFor(r);
    setRefundAmount(String(r.held));
    setRefundMethod('cash');
    setRefundDate(todayYmd());
    setRefundNote('');
  };

  const saveRefund = async () => {
    const amt = Number(refundAmount);
    if (!amt || amt <= 0) { toast.error('Enter the amount you gave back'); return; }
    if (amt > refundFor.held) { toast.error(`Only ${fmt(refundFor.held)} of this deposit is still held`); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('deposit_refunds').insert({
        deposit_item_id: refundFor.id,
        transaction_id: refundFor.transactionId,
        member_id: refundFor.memberId,
        amount: amt,
        method: refundMethod,
        note: refundNote.trim() || null,
        refunded_at: ymdToTs(refundDate),
        refunded_by: staff?.id || null,
      });
      if (error) throw error;
      toast.success(`Refund of ${fmt(amt)} to ${refundFor.name} recorded`);
      setRefundFor(null);
      refresh();
    } catch (e) {
      toast.error('Could not record the refund: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const undoRefund = async (r, ref) => {
    if (!await confirm({ title: 'Undo refund', message: `Remove the ${fmt(ref.amount)} refund to ${r.name} on ${fmtDate(ref.refunded_at)}? The deposit goes back to held.`, variant: 'danger' })) return;
    const { error } = await supabase.from('deposit_refunds').delete().eq('id', ref.id);
    if (error) { toast.error('Could not undo: ' + error.message); return; }
    toast.success('Refund removed');
    refresh();
  };

  const exportRows = () => exportToCSV(shown.map(r => ({
    'Paid on': r.paidAt ? r.paidAt.slice(0, 10) : '',
    Customer: r.name,
    Phone: r.phone,
    Type: r.kind,
    'Bill #': r.billNo,
    'Paid by': (r.method || '').toUpperCase(),
    Deposit: r.amount,
    Refunded: r.refunded,
    'Still held': r.held,
    Status: r.status === 'held' ? 'Held' : r.status === 'refunded' ? 'Refunded' : 'Part refunded',
    'Refund details': r.refunds.map(x => `${x.refunded_at.slice(0, 10)} ${x.method} ₹${x.amount}${x.note ? ` (${x.note})` : ''}`).join('; '),
  })), 'deposits');

  const cardStyle = { background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };
  const thStyle = { padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', borderBottom: '2px solid #f0f0f0' };
  const tdStyle = { padding: '10px 12px', fontSize: '14px', borderBottom: '1px solid #f5f5f5', verticalAlign: 'top' };
  const STATUS = {
    held:     { bg: '#e0f2fe', color: '#0369a1', label: 'Held' },
    partial:  { bg: '#fef3c7', color: '#92400e', label: 'Part refunded' },
    refunded: { bg: '#dcfce7', color: '#166534', label: 'Refunded' },
  };

  return (
    <div style={{ padding: '20px' }}>
      {isReadOnly && <ViewOnlyBanner />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '28px', margin: 0 }}>Deposits</h1>
          <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Refundable deposits taken at the till, and what has been paid back.</div>
        </div>
        <button onClick={exportRows} disabled={!shown.length}
          style={{ padding: '10px 18px', background: shown.length ? '#10b981' : '#c7cbd1', color: '#fff', border: 'none', borderRadius: '8px', cursor: shown.length ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: '14px' }}>
          📥 Export
        </button>
      </div>

      {!refundsReady && (
        <div style={{ ...cardStyle, background: '#fff3cd', color: '#856404', fontSize: '13px' }}>
          <strong>Refunds can't be recorded yet.</strong> Run <code>supabase/migrations/20261011_deposit_refunds.sql</code> in the Supabase SQL Editor, then refresh. Deposits below are still accurate.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Held now', value: fmt(totals.held), note: `${totals.heldCount} customer${totals.heldCount === 1 ? '' : 's'}`, color: '#0369a1', icon: '🔐' },
          { label: 'Collected (all time)', value: fmt(totals.collected), note: `${rows.length} deposits`, color: '#6b7280', icon: '📥' },
          { label: 'Refunded', value: fmt(totals.refunded), color: '#16a34a', icon: '↩️' },
        ].map(s => (
          <div key={s.label} style={{ ...cardStyle, marginBottom: 0, borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: '12px', color: '#888' }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: s.color, marginTop: '4px' }}>{s.value}</div>
            {s.note && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{s.note}</div>}
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone or bill #…"
          style={{ flex: '1 1 220px', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px' }} />
        {[['all', 'All'], ['held', 'Still held'], ['refunded', 'Refunded']].map(([k, label]) => (
          <button key={k} onClick={() => setStatusFilter(k)}
            style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              background: statusFilter === k ? '#667eea' : '#f0f0f0', color: statusFilter === k ? 'white' : '#555' }}>
            {label}
          </button>
        ))}
        <button onClick={refresh} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', background: '#f0f0f0' }}>🔄 Refresh</button>
      </div>

      <div style={cardStyle}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>Loading deposits…</p>
        ) : shown.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>No deposits match.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
              <thead>
                <tr>
                  {['Paid on', 'Customer', 'Type', 'Bill #', 'Deposit', 'Status', ''].map(h => (
                    <th key={h} style={{ ...thStyle, textAlign: h === 'Deposit' ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map(r => {
                  const st = STATUS[r.status];
                  return (
                    <tr key={r.id}>
                      <td style={tdStyle}>
                        {fmtDate(r.paidAt)}
                        <div style={{ fontSize: '11px', color: '#999' }}>{(r.method || '').toUpperCase()}</div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        <div style={{ fontSize: '12px', color: '#888' }}>{r.phone}</div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: r.kind === 'Casual' ? '#ecfdf5' : '#f3e8ff', color: r.kind === 'Casual' ? '#0f766e' : '#7c3aed' }}>
                          {r.kind}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#667eea', fontSize: '13px' }}>{r.billNo}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>
                        {fmt(r.amount)}
                        {r.status === 'partial' && <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 600 }}>{fmt(r.held)} still held</div>}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>{st.label}</span>
                        {r.refunds.map(ref => (
                          <div key={ref.id} style={{ fontSize: '12px', color: '#555', marginTop: '6px' }}>
                            ↩️ {fmt(ref.amount)} · {fmtDate(ref.refunded_at)} · {(ref.method || '').toUpperCase()}
                            {ref.note && <div style={{ color: '#888', fontStyle: 'italic' }}>{ref.note}</div>}
                            {!isReadOnly && (
                              <button onClick={() => undoRefund(r, ref)}
                                style={{ marginLeft: '6px', padding: 0, border: 'none', background: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}>
                                undo
                              </button>
                            )}
                          </div>
                        ))}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {r.held > 0 && refundsReady && !isReadOnly && (
                          <button onClick={() => openRefund(r)}
                            style={{ padding: '6px 14px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            ↩️ Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {refundFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => !saving && setRefundFor(null)}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '420px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px' }}>↩️ Refund deposit</h2>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#666' }}>
              {refundFor.name} · {refundFor.kind} deposit {fmt(refundFor.amount)} paid {fmtDate(refundFor.paidAt)}
              {refundFor.refunded > 0 && <> · {fmt(refundFor.refunded)} already refunded</>}
            </p>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#888', marginBottom: '6px' }}>AMOUNT GIVEN BACK</label>
            <input type="number" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} min="1" max={refundFor.held}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box', marginBottom: '4px' }} />
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '14px' }}>Up to {fmt(refundFor.held)}. Enter less to keep back a damage or late charge.</div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#888', marginBottom: '6px' }}>PAID BACK BY</label>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
              {METHODS.map(([k, label]) => (
                <button key={k} onClick={() => setRefundMethod(k)}
                  style={{ flex: '1 1 70px', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                    border: `2px solid ${refundMethod === k ? '#f97316' : '#e5e5e5'}`, background: refundMethod === k ? '#fff7ed' : 'white', color: refundMethod === k ? '#c2410c' : '#555' }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <label style={{ flex: 1, fontSize: '11px', fontWeight: 700, color: '#888' }}>DATE
                <input type="date" value={refundDate} max={todayYmd()} onChange={e => setRefundDate(e.target.value)}
                  style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
              </label>
            </div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#888', marginBottom: '6px' }}>NOTE (OPTIONAL)</label>
            <input value={refundNote} onChange={e => setRefundNote(e.target.value)} placeholder="e.g. Membership ended · ₹100 kept for torn cover"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', marginBottom: '18px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setRefundFor(null)} disabled={saving}
                style={{ flex: 1, padding: '10px', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveRefund} disabled={saving}
                style={{ flex: 2, padding: '10px', background: saving ? '#9ca3af' : '#f97316', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
                {saving ? 'Saving…' : `Record refund of ${fmt(refundAmount)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
