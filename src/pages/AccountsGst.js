/* GST settings — who you are, and how each part of the business is taxed.
 *
 * Nothing here changes a bill until the master switch is on AND a valid GSTIN
 * is saved. Below that, every stream is configured on its own: charge GST or
 * not, the rate, and whether prices already contain the tax (inclusive) or
 * have it added at the till (exclusive). The preview runs the real engine, so
 * what it shows is exactly what a customer's bill will say.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';
import { usePermission } from '../hooks/usePermission';
import { taxForBill } from '../utils/gst';
import {
  DEFAULT_RATES, GST_SLABS, GST_STATE_CODES, validateGstin, mergeRates, rateForStream,
} from '../utils/gstSettings';

const card = { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' };
const label = { display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 5 };
const input = { width: '100%', padding: '9px 11px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' };
const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const STREAM_KEYS = Object.keys(DEFAULT_RATES);

const BLANK = {
  enabled: false, legal_name: '', trade_name: '', gstin: '',
  address_line1: '', address_line2: '', city: '', state: '', state_code: '',
  pincode: '', place_of_supply: '', invoice_prefix: 'INV', rates: mergeRates(null),
};

// A sample bill that exercises every kind of line the settings can produce.
const PREVIEW_CART = [
  { name: 'Masala Chai',          stream: 'cafe',       amount: 60 },
  { name: 'New Monthly',          stream: 'membership', amount: 600 },
  { name: 'Paper Towns',          stream: 'library',    amount: 299 },
  { name: 'Deposit (Refundable)', stream: 'deposit',    amount: 1000 },
];

function Switch({ on, onChange, disabled, title }) {
  return (
    <button type="button" role="switch" aria-checked={on} title={title} disabled={disabled}
      onClick={() => onChange(!on)}
      style={{
        width: 42, height: 24, borderRadius: 12, border: 0, padding: 2, flexShrink: 0,
        background: on ? '#059669' : '#d1d5db', cursor: disabled ? 'default' : 'pointer',
        transition: 'background 150ms', opacity: disabled ? 0.6 : 1,
      }}>
      <span style={{
        display: 'block', width: 20, height: 20, borderRadius: '50%', background: '#fff',
        transform: `translateX(${on ? 18 : 0}px)`, transition: 'transform 150ms',
        boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
      }} />
    </button>
  );
}

function Basis({ inclusive, onChange, disabled }) {
  const opt = (value, text) => {
    const on = inclusive === value;
    return (
      <button type="button" disabled={disabled} onClick={() => onChange(value)}
        style={{
          padding: '6px 11px', border: 0, fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
          background: on ? '#667eea' : 'transparent', color: on ? '#fff' : '#6b7280',
          borderRadius: 6, cursor: disabled ? 'default' : 'pointer', whiteSpace: 'nowrap',
        }}>{text}</button>
    );
  };
  return (
    <div style={{ display: 'inline-flex', background: '#f0f2f5', borderRadius: 8, padding: 2, opacity: disabled ? 0.45 : 1 }}>
      {opt(true, 'Inclusive')}
      {opt(false, 'Exclusive')}
    </div>
  );
}

export default function AccountsGst() {
  const toast = useToast();
  const { isReadOnly } = usePermission();
  const [form, setForm] = useState(BLANK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tableReady, setTableReady] = useState(true);

  const rates = mergeRates(form.rates);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setRate = (key, field, v) => setForm(f => {
    const r = mergeRates(f.rates);
    return { ...f, rates: { ...r, [key]: { ...r[key], [field]: v } } };
  });
  const setAll = (field, v) => setForm(f => {
    const r = mergeRates(f.rates);
    STREAM_KEYS.forEach(k => { r[k] = { ...r[k], [field]: v }; });
    return { ...f, rates: r };
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('gst_settings').select('*').eq('id', 1).maybeSingle();
    if (error) { setTableReady(false); setLoading(false); return; }
    if (data) setForm({ ...BLANK, ...data, rates: mergeRates(data.rates) });
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const gstinCheck = validateGstin(form.gstin);

  // Typing a GSTIN fills in the state from its first two digits — that pair IS
  // the state code, so asking for it separately invites a mismatch.
  const onGstin = (v) => {
    const up = v.toUpperCase().replace(/\s/g, '').slice(0, 15);
    setForm(f => {
      const next = { ...f, gstin: up };
      const code = up.slice(0, 2);
      if (GST_STATE_CODES[code]) {
        next.state_code = code;
        next.state = GST_STATE_CODES[code];
        if (!f.place_of_supply) next.place_of_supply = GST_STATE_CODES[code];
      }
      return next;
    });
  };

  const save = async () => {
    if (form.enabled && !gstinCheck.valid) {
      toast.error('A valid GSTIN is required before switching GST on'); return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('gst_settings')
        .update({ ...form, rates, id: 1, updated_at: new Date().toISOString() }).eq('id', 1);
      if (error) throw error;
      toast.success(form.enabled ? 'Saved — GST is ON for new bills' : 'Saved. GST is still off.');
      load();
    } catch (e) { toast.error('Save failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const preview = taxForBill(PREVIEW_CART.map(p => {
    const c = rateForStream({ rates }, p.stream);
    return { ...p, rate: c.rate || 0, inclusive: c.inclusive, exempt: c.exempt, untaxed: c.untaxed };
  }));
  const menuTotal = PREVIEW_CART.reduce((s, p) => s + p.amount, 0);

  const lineTag = (l) => {
    if (l.exempt) return 'no GST · deposit';
    if (l.untaxed) return 'no GST';
    if (!l.rate) return 'nil-rated';
    return l.inclusive ? `${l.rate}% incl.` : `+${l.rate}%`;
  };

  const exampleFor = (r) => {
    if (!r.enabled) return '₹100 · no GST';
    if (!r.rate) return '₹100 · nil-rated';
    if (r.inclusive) return `₹100 · ₹${(100 - 10000 / (100 + r.rate)).toFixed(2)} inside`;
    return `₹${(100 + r.rate).toFixed(2)}`;
  };

  const bulkBtn = { padding: '6px 11px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 7, fontSize: 12, fontWeight: 700, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' };
  const th = { textAlign: 'left', fontSize: 11, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '6px 8px', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap' };

  return (
    <div style={{ padding: 20, maxWidth: 940, margin: '0 auto' }}>
      <h1 style={{ fontSize: 26, margin: '0 0 4px' }}>🧾 GST Settings</h1>
      <p style={{ color: '#999', fontSize: 13, margin: '0 0 20px' }}>
        Controls what appears on every customer bill. Confirm rates and HSN/SAC codes with your accountant.
      </p>

      {!tableReady && (
        <div style={{ ...card, background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
          <strong>Preview only — not connected yet.</strong>
          <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.6 }}>
            Run <code>supabase/migrations/20260829_gst_billing.sql</code> in the Supabase SQL editor to
            save these settings. Until then you can change anything below and watch the preview update,
            but Save is disabled and no bill is affected.
          </p>
        </div>
      )}

      {loading ? <p style={{ color: '#999' }}>Loading…</p> : (
        <>
          {/* Master switch */}
          <div style={{ ...card, borderLeft: `4px solid ${form.enabled ? '#059669' : '#d1d5db'}`, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <Switch on={!!form.enabled} disabled={isReadOnly} onChange={v => set('enabled', v)} title="Charge GST on bills" />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Charge GST on bills</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3, lineHeight: 1.5 }}>
                Off: bills print as plain receipts, exactly as today. On: new bills become tax invoices, taxed
                stream by stream as set below. Bills already issued are never rewritten.
              </div>
            </div>
          </div>

          {/* Per-stream */}
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>How each part of the business is taxed</h2>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 14px', lineHeight: 1.55 }}>
              <strong>Inclusive</strong> — the price on the menu already contains GST; the customer pays exactly that.
              <br /><strong>Exclusive</strong> — GST is added at the till, so ₹60 becomes ₹63 at 5%.
              <br />Refundable deposits are never taxed and aren't listed: a deposit isn't a supply.
            </p>

            {!isReadOnly && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', alignItems: 'center', marginBottom: 12, padding: '10px 12px', background: '#fafbfc', borderRadius: 9 }}>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Charge GST on</span>
                  <button type="button" style={bulkBtn} onClick={() => setAll('enabled', true)}>All</button>
                  <button type="button" style={bulkBtn} onClick={() => setAll('enabled', false)}>None</button>
                </span>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Set every stream to</span>
                  <button type="button" style={bulkBtn} onClick={() => setAll('inclusive', true)}>Inclusive</button>
                  <button type="button" style={bulkBtn} onClick={() => setAll('inclusive', false)}>Exclusive</button>
                </span>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
                <thead><tr>
                  {['Category', 'Charge GST', 'Rate', 'Price basis', 'HSN / SAC', '₹100 becomes'].map(h => <th key={h} style={th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {STREAM_KEYS.map(k => {
                    const r = rates[k];
                    const dim = { opacity: r.enabled ? 1 : 0.5, transition: 'opacity 150ms' };
                    return (
                      <tr key={k} style={{ borderBottom: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '10px 8px', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.label}</td>
                        <td style={{ padding: '10px 8px' }}>
                          <Switch on={r.enabled} disabled={isReadOnly} onChange={v => setRate(k, 'enabled', v)} title={`Charge GST on ${r.label}`} />
                        </td>
                        <td style={{ padding: '10px 8px', ...dim }}>
                          <select value={r.rate} disabled={isReadOnly || !r.enabled}
                            onChange={e => setRate(k, 'rate', Number(e.target.value))}
                            style={{ ...input, width: 84, padding: '7px 8px' }}>
                            {GST_SLABS.map(v => <option key={v} value={v}>{v}%</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '10px 8px', ...dim }}>
                          <Basis inclusive={r.inclusive} disabled={isReadOnly || !r.enabled} onChange={v => setRate(k, 'inclusive', v)} />
                        </td>
                        <td style={{ padding: '10px 8px', ...dim }}>
                          <input style={{ ...input, width: 110, fontFamily: 'monospace', padding: '7px 8px' }}
                            value={r.hsn || ''} disabled={isReadOnly || !r.enabled}
                            onChange={e => setRate(k, 'hsn', e.target.value)} />
                        </td>
                        <td style={{ padding: '10px 8px', fontSize: 12, fontFamily: 'monospace', color: '#374151', whiteSpace: 'nowrap', ...dim }}>
                          {exampleFor(r)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Identity */}
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px' }}>Business details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
              <div>
                <span style={label}>GSTIN</span>
                <input style={{ ...input, fontFamily: 'monospace', letterSpacing: '0.5px',
                  borderColor: form.gstin ? (gstinCheck.valid ? (gstinCheck.warning ? '#f59e0b' : '#a7f3d0') : '#fca5a5') : '#e0e0e0' }}
                  value={form.gstin || ''} onChange={e => onGstin(e.target.value)}
                  placeholder="29AAACR5055K1Z5" disabled={isReadOnly} />
                {form.gstin && !gstinCheck.valid && (
                  <p style={{ fontSize: 11, color: '#dc2626', margin: '5px 0 0' }}>{gstinCheck.reason}</p>
                )}
                {gstinCheck.valid && gstinCheck.warning && (
                  <p style={{ fontSize: 11, color: '#b45309', margin: '5px 0 0' }}>⚠️ {gstinCheck.warning}</p>
                )}
                {gstinCheck.valid && !gstinCheck.warning && (
                  <p style={{ fontSize: 11, color: '#059669', margin: '5px 0 0' }}>✓ Valid · {gstinCheck.state}</p>
                )}
              </div>
              <div>
                <span style={label}>Legal name (as registered)</span>
                <input style={input} value={form.legal_name || ''} onChange={e => set('legal_name', e.target.value)}
                  placeholder="Tapas Reading Cafe Pvt Ltd" disabled={isReadOnly} />
              </div>
              <div>
                <span style={label}>Trade name</span>
                <input style={input} value={form.trade_name || ''} onChange={e => set('trade_name', e.target.value)}
                  placeholder="Tapas Reading Cafe" disabled={isReadOnly} />
              </div>
              <div>
                <span style={label}>Place of supply</span>
                <input style={input} value={form.place_of_supply || ''} onChange={e => set('place_of_supply', e.target.value)}
                  placeholder="Karnataka" disabled={isReadOnly} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={label}>Registered address</span>
                <input style={{ ...input, marginBottom: 8 }} value={form.address_line1 || ''}
                  onChange={e => set('address_line1', e.target.value)} placeholder="Address line 1" disabled={isReadOnly} />
                <input style={input} value={form.address_line2 || ''}
                  onChange={e => set('address_line2', e.target.value)} placeholder="Address line 2" disabled={isReadOnly} />
              </div>
              <div>
                <span style={label}>City</span>
                <input style={input} value={form.city || ''} onChange={e => set('city', e.target.value)} disabled={isReadOnly} />
              </div>
              <div>
                <span style={label}>PIN code</span>
                <input style={input} value={form.pincode || ''} onChange={e => set('pincode', e.target.value)} disabled={isReadOnly} />
              </div>
            </div>
          </div>

          {/* Live preview through the real engine */}
          <div style={{ ...card, background: '#fafbfc' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>How a bill will look</h2>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 14px' }}>
              {form.enabled
                ? 'A chai, a membership, a book and a deposit — through the same engine the tills use.'
                : 'GST is off, so today this bill is a plain receipt. This is what it becomes once you switch GST on.'}
            </p>
            <div style={{ background: '#fff', border: '1px solid #ececec', borderRadius: 10, padding: 16, fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', fontWeight: 700, marginBottom: 10 }}>
                <span>TAX INVOICE</span>
                {form.gstin && <span style={{ fontWeight: 400, fontSize: 11 }}>GSTIN {form.gstin}</span>}
              </div>
              {preview.lines.map((l, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '3px 0' }}>
                  <span>{l.name} <span style={{ color: '#9ca3af', fontSize: 11 }}>{lineTag(l)}</span></span>
                  <span style={{ whiteSpace: 'nowrap' }}>{money(l.total)}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px dashed #ddd', marginTop: 8, paddingTop: 8, color: '#555' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Taxable value</span><span>{money(preview.taxableValue)}</span></div>
                {preview.untaxedValue > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>No GST charged</span><span>{money(preview.untaxedValue)}</span></div>
                )}
                {preview.exemptValue > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Deposit (not a supply)</span><span>{money(preview.exemptValue)}</span></div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>CGST</span><span>{money(preview.cgst)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>SGST</span><span>{money(preview.sgst)}</span></div>
                {preview.roundOff !== 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Round off</span><span>{money(preview.roundOff)}</span></div>
                )}
              </div>
              <div style={{ borderTop: '2px solid #333', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15 }}>
                <span>TOTAL</span><span>₹{preview.payable.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: preview.payable !== menuTotal ? '#b45309' : '#6b7280' }}>
                {preview.payable !== menuTotal
                  ? `Menu prices add to ₹${menuTotal.toLocaleString('en-IN')} — the customer pays ₹${preview.payable.toLocaleString('en-IN')} because of exclusive GST.`
                  : `The customer pays exactly the menu prices (₹${menuTotal.toLocaleString('en-IN')}).`}
              </div>
            </div>
          </div>

          <button onClick={save} disabled={saving || isReadOnly || !tableReady}
            style={{ padding: '12px 26px', background: '#667eea', color: '#fff', border: 0, borderRadius: 9,
              fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving || !tableReady ? 0.6 : 1 }}>
            {saving ? 'Saving…' : tableReady ? 'Save GST settings' : 'Save (run the migration first)'}
          </button>
        </>
      )}
    </div>
  );
}
