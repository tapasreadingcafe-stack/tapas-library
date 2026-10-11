import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';
import { usePermission } from '../hooks/usePermission';
import ViewOnlyBanner from '../components/ViewOnlyBanner';
import { exportToCSV } from '../utils/exportCSV';

// Stationery stock: what the library counter sells, its price, and how many
// are left. Every change to a count goes through the stationery_move() SQL
// function, which also writes a history row — so restocks, sales (from the
// POS) and corrections can always explain the number on screen.

const CATEGORIES = ['Pens & pencils', 'Notebooks', 'Art supplies', 'Bookmarks', 'Gifts', 'Other'];
const EMOJIS = ['🖊️', '✏️', '🖍️', '📓', '📒', '📔', '🔖', '📎', '✂️', '🎨', '🎁', '📏'];
const EMPTY = { name: '', emoji: '🖊️', category: 'Other', price: '', cost_price: '', low_stock_at: '5', barcode: '', opening: '' };
const REASONS = { opening: 'Opening stock', restock: 'Restocked', sale: 'Sold', correction: 'Count corrected', return: 'Returned' };

const fmt = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function Stationery() {
  const toast = useToast();
  const { isReadOnly } = usePermission();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(true);
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const [form, setForm] = useState(null);       // add / edit
  const [editing, setEditing] = useState(null);
  const [stockModal, setStockModal] = useState(null); // { item, mode: 'restock' | 'count' }
  const [qty, setQty] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [note, setNote] = useState('');
  const [history, setHistory] = useState(null); // { item, moves }
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('stationery_items').select('*').order('name');
    if (error) { setReady(false); setLoading(false); return; }
    setReady(true);
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const isLow = (i) => i.stock <= (i.low_stock_at ?? 5);

  const shown = useMemo(() => items.filter(i => {
    if (!showHidden && !i.is_active) return false;
    if (lowOnly && !isLow(i)) return false;
    const q = search.trim().toLowerCase();
    if (q && !i.name.toLowerCase().includes(q) && !(i.category || '').toLowerCase().includes(q) && !(i.barcode || '').toLowerCase().includes(q)) return false;
    return true;
  }), [items, search, lowOnly, showHidden]);

  const active = items.filter(i => i.is_active);
  const stats = {
    items: active.length,
    units: active.reduce((s, i) => s + Math.max(0, i.stock), 0),
    value: active.reduce((s, i) => s + Math.max(0, i.stock) * (Number(i.cost_price) || Number(i.price) || 0), 0),
    low: active.filter(isLow).length,
  };

  const openAdd = () => { setEditing(null); setForm(EMPTY); };
  const openEdit = (i) => {
    setEditing(i);
    setForm({ name: i.name, emoji: i.emoji || '🖊️', category: i.category || 'Other', price: String(i.price ?? ''), cost_price: i.cost_price == null ? '' : String(i.cost_price), low_stock_at: String(i.low_stock_at ?? 5), barcode: i.barcode || '', opening: '' });
  };

  const move = (item, change, reason, extra = {}) => supabase.rpc('stationery_move', {
    p_item_id: item.id, p_change: change, p_reason: reason,
    p_bill_id: null, p_note: extra.note || null, p_unit_cost: extra.unitCost ?? null,
  });

  const saveItem = async () => {
    if (!form.name.trim()) { toast.error('Give the item a name'); return; }
    if (form.price === '' || Number(form.price) < 0) { toast.error('Enter a selling price'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        emoji: form.emoji || '🖊️',
        category: form.category || 'Other',
        price: Number(form.price) || 0,
        cost_price: form.cost_price === '' ? null : Number(form.cost_price),
        low_stock_at: Math.max(0, parseInt(form.low_stock_at, 10) || 0),
        barcode: form.barcode.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (editing) {
        const { error } = await supabase.from('stationery_items').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success(`${payload.name} updated`);
      } else {
        const { data, error } = await supabase.from('stationery_items').insert(payload).select().single();
        if (error) throw error;
        const opening = parseInt(form.opening, 10) || 0;
        if (opening > 0) {
          const { error: mErr } = await move(data, opening, 'opening', { unitCost: payload.cost_price });
          if (mErr) throw mErr;
        }
        toast.success(`${payload.name} added${opening > 0 ? ` with ${opening} in stock` : ''}`);
      }
      setForm(null);
      fetchItems();
    } catch (e) {
      toast.error('Could not save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const openStock = (item, mode) => {
    setStockModal({ item, mode });
    setQty(mode === 'count' ? String(item.stock) : '');
    setUnitCost(item.cost_price == null ? '' : String(item.cost_price));
    setNote('');
  };

  const saveStock = async () => {
    const { item, mode } = stockModal;
    const n = parseInt(qty, 10);
    if (Number.isNaN(n) || (mode === 'restock' && n <= 0) || (mode === 'count' && n < 0)) {
      toast.error(mode === 'restock' ? 'Enter how many came in' : 'Enter the number on the shelf');
      return;
    }
    const change = mode === 'restock' ? n : n - item.stock;
    if (change === 0) { setStockModal(null); return; }
    setSaving(true);
    const { error } = await move(item, change, mode === 'restock' ? 'restock' : 'correction', {
      note: note.trim() || null,
      unitCost: mode === 'restock' && unitCost !== '' ? Number(unitCost) : null,
    });
    setSaving(false);
    if (error) { toast.error('Could not update stock: ' + error.message); return; }
    toast.success(mode === 'restock' ? `+${n} ${item.name}` : `${item.name} count set to ${n}`);
    setStockModal(null);
    fetchItems();
  };

  const toggleActive = async (i) => {
    const { error } = await supabase.from('stationery_items').update({ is_active: !i.is_active, updated_at: new Date().toISOString() }).eq('id', i.id);
    if (error) { toast.error(error.message); return; }
    toast.success(i.is_active ? `${i.name} hidden from the POS` : `${i.name} back on the POS`);
    fetchItems();
  };

  const openHistory = async (item) => {
    setHistory({ item, moves: null });
    const { data } = await supabase.from('stationery_stock_moves')
      .select('id, change, stock_after, reason, unit_cost, note, created_at, staff(name)')
      .eq('item_id', item.id).order('created_at', { ascending: false }).limit(200);
    setHistory({ item, moves: data || [] });
  };

  const exportStock = () => exportToCSV(shown.map(i => ({
    Item: i.name, Category: i.category, 'Selling price': Number(i.price) || 0, 'Cost price': i.cost_price ?? '',
    'In stock': i.stock, 'Low-stock warning at': i.low_stock_at, 'Stock value (cost)': Math.max(0, i.stock) * (Number(i.cost_price) || 0),
    Barcode: i.barcode || '', 'On POS': i.is_active ? 'Yes' : 'No',
  })), 'stationery_stock');

  const card = { background: 'white', borderRadius: '12px', padding: '18px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };
  const th = { padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', borderBottom: '2px solid #f0f0f0' };
  const td = { padding: '10px 12px', fontSize: '14px', borderBottom: '1px solid #f5f5f5', verticalAlign: 'middle' };
  const input = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };
  const label = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#888', margin: '0 0 6px', letterSpacing: '0.4px' };
  const btn = (bg, color = 'white') => ({ padding: '6px 11px', background: bg, color, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' });

  if (!ready) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>✏️ Stationery</h1>
        <div style={{ ...card, background: '#fff3cd', color: '#856404' }}>
          <strong>One-time setup needed.</strong> Run <code>supabase/migrations/20261011_stationery_inventory.sql</code> in the Supabase SQL Editor, then refresh this page.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {isReadOnly && <ViewOnlyBanner />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <div>
          <h1 style={{ fontSize: '28px', margin: 0 }}>✏️ Stationery</h1>
          <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Items sold at the library counter. Sales in Library POS take them out of stock automatically.</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={exportStock} disabled={!shown.length} style={{ ...btn('#f0f0f0', '#333'), padding: '10px 16px', fontSize: '13px' }}>📥 Export</button>
          {!isReadOnly && <button onClick={openAdd} style={{ ...btn('#667eea'), padding: '10px 18px', fontSize: '14px' }}>+ Add item</button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {[
          { l: 'Items on sale', v: stats.items, c: '#667eea', i: '🖊️' },
          { l: 'Units in stock', v: stats.units, c: '#0f766e', i: '📦' },
          { l: 'Stock value (at cost)', v: fmt(stats.value), c: '#6b7280', i: '💰' },
          { l: 'Running low', v: stats.low, c: stats.low ? '#dc2626' : '#16a34a', i: '⚠️' },
        ].map(s => (
          <div key={s.l} style={{ ...card, marginBottom: 0, borderTop: `3px solid ${s.c}` }}>
            <div style={{ fontSize: '12px', color: '#888' }}>{s.i} {s.l}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: s.c, marginTop: '4px' }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ ...card, display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item, category or barcode…" style={{ ...input, flex: '1 1 220px', width: 'auto' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
          <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} /> Running low only
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} /> Show hidden items
        </label>
      </div>

      <div style={card}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>Loading…</p>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
            <div style={{ fontSize: '40px' }}>✏️</div>
            <p>No stationery yet. Add your first item — pens, notebooks, bookmarks…</p>
            {!isReadOnly && <button onClick={openAdd} style={{ ...btn('#667eea'), padding: '10px 18px', fontSize: '14px' }}>+ Add item</button>}
          </div>
        ) : shown.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>Nothing matches.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
              <thead>
                <tr>{['Item', 'Price', 'Cost', 'In stock', ''].map(h => <th key={h} style={{ ...th, textAlign: h === 'Price' || h === 'Cost' || h === 'In stock' ? 'right' : 'left' }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {shown.map(i => {
                  const low = isLow(i);
                  return (
                    <tr key={i.id} style={{ opacity: i.is_active ? 1 : 0.5 }}>
                      <td style={td}>
                        <span style={{ fontSize: '20px', marginRight: '8px' }}>{i.emoji || '🖊️'}</span>
                        <strong>{i.name}</strong>
                        <div style={{ fontSize: '12px', color: '#888', marginLeft: '30px' }}>{i.category}{i.barcode ? ` · ${i.barcode}` : ''}{!i.is_active ? ' · hidden from POS' : ''}</div>
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmt(i.price)}</td>
                      <td style={{ ...td, textAlign: 'right', color: '#888' }}>{i.cost_price == null ? '—' : fmt(i.cost_price)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '13px',
                          background: i.stock <= 0 ? '#fee2e2' : low ? '#fef3c7' : '#dcfce7',
                          color: i.stock <= 0 ? '#b91c1c' : low ? '#92400e' : '#166534' }}>
                          {i.stock <= 0 ? 'Out of stock' : `${i.stock}${low ? ' · low' : ''}`}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {!isReadOnly && <button onClick={() => openStock(i, 'restock')} style={btn('#16a34a')}>➕ Restock</button>}
                          {!isReadOnly && <button onClick={() => openStock(i, 'count')} style={btn('#f0f0f0', '#333')}>🔢 Count</button>}
                          <button onClick={() => openHistory(i)} style={btn('#f0f0f0', '#333')}>📜 History</button>
                          {!isReadOnly && <button onClick={() => openEdit(i)} style={btn('#f0f0f0', '#333')}>✏️ Edit</button>}
                          {!isReadOnly && <button onClick={() => toggleActive(i)} style={btn('#f0f0f0', '#666')}>{i.is_active ? 'Hide' : 'Show'}</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / edit */}
      {form && (
        <Modal onClose={() => !saving && setForm(null)}>
          <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>{editing ? `Edit ${editing.name}` : 'Add stationery item'}</h2>
          <div style={{ marginBottom: '12px' }}>
            <span style={label}>ICON</span>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))}
                  style={{ fontSize: '20px', padding: '4px 6px', borderRadius: '6px', cursor: 'pointer', border: `2px solid ${form.emoji === e ? '#667eea' : 'transparent'}`, background: form.emoji === e ? '#eef2ff' : '#f7f7f7' }}>{e}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <span style={label}>NAME *</span>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Blue gel pen" style={input} autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <span style={label}>CATEGORY</span>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={input}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <span style={label}>BARCODE (OPTIONAL)</span>
              <input value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} placeholder="Scan or type" style={input} />
            </div>
            <div>
              <span style={label}>SELLING PRICE ₹ *</span>
              <input type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} style={input} />
            </div>
            <div>
              <span style={label}>COST PRICE ₹</span>
              <input type="number" min="0" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} placeholder="What we paid" style={input} />
            </div>
            <div>
              <span style={label}>WARN WHEN DOWN TO</span>
              <input type="number" min="0" value={form.low_stock_at} onChange={e => setForm(f => ({ ...f, low_stock_at: e.target.value }))} style={input} />
            </div>
            {!editing && (
              <div>
                <span style={label}>HOW MANY IN STOCK NOW</span>
                <input type="number" min="0" value={form.opening} onChange={e => setForm(f => ({ ...f, opening: e.target.value }))} placeholder="0" style={input} />
              </div>
            )}
          </div>
          {editing && <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>To change how many are in stock, use ➕ Restock or 🔢 Count — so the history stays right.</div>}
          <ModalButtons onCancel={() => setForm(null)} onSave={saveItem} saving={saving} label={editing ? 'Save changes' : 'Add item'} />
        </Modal>
      )}

      {/* Restock / count */}
      {stockModal && (
        <Modal onClose={() => !saving && setStockModal(null)}>
          <h2 style={{ margin: '0 0 4px', fontSize: '18px' }}>{stockModal.mode === 'restock' ? '➕ Restock' : '🔢 Correct the count'} — {stockModal.item.name}</h2>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#666' }}>{stockModal.item.stock} in stock now.</p>
          <div style={{ marginBottom: '12px' }}>
            <span style={label}>{stockModal.mode === 'restock' ? 'HOW MANY CAME IN' : 'HOW MANY ARE ON THE SHELF'}</span>
            <input type="number" min="0" value={qty} onChange={e => setQty(e.target.value)} style={input} autoFocus />
            {stockModal.mode === 'restock' && Number(qty) > 0 && <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>New count: {stockModal.item.stock + Number(qty)}</div>}
            {stockModal.mode === 'count' && qty !== '' && Number(qty) !== stockModal.item.stock && (
              <div style={{ fontSize: '12px', color: '#92400e', marginTop: '4px' }}>{Number(qty) > stockModal.item.stock ? '+' : ''}{Number(qty) - stockModal.item.stock} from the system count</div>
            )}
          </div>
          {stockModal.mode === 'restock' && (
            <div style={{ marginBottom: '12px' }}>
              <span style={label}>COST PER ITEM ₹ (OPTIONAL)</span>
              <input type="number" min="0" value={unitCost} onChange={e => setUnitCost(e.target.value)} style={input} />
            </div>
          )}
          <div style={{ marginBottom: '16px' }}>
            <span style={label}>NOTE (OPTIONAL)</span>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder={stockModal.mode === 'restock' ? 'e.g. from Sharma Stationers' : 'e.g. 2 found damaged'} style={input} />
          </div>
          <ModalButtons onCancel={() => setStockModal(null)} onSave={saveStock} saving={saving} label={stockModal.mode === 'restock' ? 'Add to stock' : 'Set count'} />
        </Modal>
      )}

      {/* History */}
      {history && (
        <Modal onClose={() => setHistory(null)} wide>
          <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>📜 {history.item.name} — stock history</h2>
          {history.moves === null ? <p style={{ color: '#999' }}>Loading…</p> : history.moves.length === 0 ? <p style={{ color: '#999' }}>No changes recorded yet.</p> : (
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['When', 'What', 'Change', 'Left', 'By / note'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {history.moves.map(m => (
                    <tr key={m.id}>
                      <td style={{ ...td, fontSize: '13px' }}>{new Date(m.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={{ ...td, fontSize: '13px' }}>{REASONS[m.reason] || m.reason}{m.unit_cost != null ? ` @ ${fmt(m.unit_cost)}` : ''}</td>
                      <td style={{ ...td, fontWeight: 700, color: m.change > 0 ? '#16a34a' : '#dc2626' }}>{m.change > 0 ? `+${m.change}` : m.change}</td>
                      <td style={td}>{m.stock_after}</td>
                      <td style={{ ...td, fontSize: '12px', color: '#666' }}>{m.staff?.name || ''}{m.note ? `${m.staff?.name ? ' · ' : ''}${m.note}` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, wide }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: wide ? '680px' : '460px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ModalButtons({ onCancel, onSave, saving, label }) {
  return (
    <div style={{ display: 'flex', gap: '10px' }}>
      <button onClick={onCancel} disabled={saving} style={{ flex: 1, padding: '10px', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
      <button onClick={onSave} disabled={saving} style={{ flex: 2, padding: '10px', background: saving ? '#9ca3af' : '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
        {saving ? 'Saving…' : label}
      </button>
    </div>
  );
}
