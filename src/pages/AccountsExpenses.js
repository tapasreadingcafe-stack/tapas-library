import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';

const SETUP_SQL = `CREATE TABLE IF NOT EXISTS cafe_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL, description TEXT NOT NULL, amount NUMERIC NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE, receipt_url TEXT,
  vertical TEXT NOT NULL DEFAULT 'shared' CHECK (vertical IN ('cafe','library','shared')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE cafe_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON cafe_expenses FOR ALL USING (true) WITH CHECK (true);`;

const EXP_CATEGORIES = ['ingredients', 'equipment', 'utilities', 'rent', 'salary', 'maintenance', 'marketing', 'other'];

// Which side of the business a cost belongs to. Shared costs are divided
// between the two P&Ls by the split set on the P&L page.
const SIDES = [
  { key: 'cafe',    label: 'Cafe',    icon: '☕', color: '#0f9c7c', hint: 'Only the cafe uses it' },
  { key: 'library', label: 'Library', icon: '📚', color: '#5560d8', hint: 'Only the library uses it' },
  { key: 'shared',  label: 'Shared',  icon: '⇄', color: '#6b7280', hint: 'Both use it — rent, power, most salaries' },
];
const sideOf = (k) => SIDES.find(s => s.key === k) || SIDES[2];

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const blankForm = () => ({ vertical: '', category: 'ingredients', description: '', amount: '', expense_date: ymd(new Date()) });
const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

export default function AccountsExpenses() {
  const toast = useToast();
  const confirm = useConfirm();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  // The vertical column arrives with 20260911_expense_verticals.sql.
  const [verticalReady, setVerticalReady] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [monthFilter, setMonthFilter] = useState(ymd(new Date()).slice(0, 7));
  const [sideFilter, setSideFilter] = useState('all');
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { error } = await supabase.from('cafe_expenses').select('id').limit(0);
      if (error) { setTableReady(false); setLoading(false); return; }
      const { error: vErr } = await supabase.from('cafe_expenses').select('vertical').limit(0);
      setVerticalReady(!vErr);
      fetchExpenses();
    };
    check();
  }, []);

  useEffect(() => { if (tableReady) fetchExpenses(); }, [monthFilter]);

  const fetchExpenses = async () => {
    setLoading(true);
    const [y, m] = monthFilter.split('-').map(Number);
    const startDate = `${monthFilter}-01`;
    const endDate = ymd(new Date(y, m, 0));
    const { data } = await supabase.from('cafe_expenses').select('*')
      .gte('expense_date', startDate).lte('expense_date', endDate)
      .order('expense_date', { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  };

  // Ingredients are nearly always the cafe's — suggest it rather than make
  // staff pick it every time, but never overwrite a side they already chose.
  const setCategory = (category) => setForm(f => ({
    ...f, category, vertical: f.vertical || (category === 'ingredients' ? 'cafe' : f.vertical),
  }));

  const addExpense = async () => {
    if (verticalReady && !form.vertical) return toast.warning('Choose which side this expense belongs to — Cafe, Library or Shared');
    if (!form.description.trim() || !form.amount) return toast.warning('Description and amount are required');
    const amount = parseFloat(form.amount);
    if (!(amount > 0)) return toast.warning('Amount must be more than zero');
    setSaving(true);
    const row = { category: form.category, description: form.description.trim(), amount, expense_date: form.expense_date };
    if (verticalReady) row.vertical = form.vertical;
    const { error } = await supabase.from('cafe_expenses').insert([row]);
    setSaving(false);
    if (error) return toast.error('Could not save: ' + error.message);
    toast.success(`Added to ${sideOf(row.vertical).label}`);
    setShowModal(false);
    setForm(blankForm());
    fetchExpenses();
  };

  const deleteExpense = async (id) => {
    if (!await confirm({ title: 'Delete Expense', message: 'Delete this expense?', variant: 'danger' })) return;
    try {
      const { error } = await supabase.from('cafe_expenses').delete().eq('id', id);
      if (error) throw error;
      toast.success('Expense deleted');
      fetchExpenses();
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete: ' + err.message);
    }
  };

  const shown = sideFilter === 'all' ? expenses : expenses.filter(e => (e.vertical || 'shared') === sideFilter);
  const total = (list) => list.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const bySide = Object.fromEntries(SIDES.map(s => [s.key, total(expenses.filter(e => (e.vertical || 'shared') === s.key))]));
  const catColors = { ingredients: '#667eea', equipment: '#1dd1a1', utilities: '#f39c12', rent: '#e74c3c', salary: '#9b59b6', maintenance: '#3498db', marketing: '#e67e22', other: '#95a5a6' };

  if (!tableReady) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>🧾 Expenses</h1>
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '20px' }}>
          <h3>Setup Required</h3>
          <pre style={{ background: '#f8f9fa', padding: '16px', borderRadius: '6px', fontSize: '12px', overflow: 'auto', whiteSpace: 'pre-wrap', marginTop: '8px' }}>{SETUP_SQL}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '12px', padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Check Again</button>
        </div>
      </div>
    );
  }

  const chip = (active) => ({
    padding: '7px 13px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
    background: active ? '#667eea' : '#f0f2f5', color: active ? '#fff' : '#555', whiteSpace: 'nowrap', fontFamily: 'inherit',
  });

  return (
    <div style={{ padding: '16px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '26px', margin: 0 }}>🧾 Expenses</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={{ padding: '9px 12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px' }} />
          <button onClick={() => setShowModal(true)} style={{ padding: '9px 18px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: 14 }}>+ Add Expense</button>
        </div>
      </div>

      {!verticalReady && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 10, padding: '11px 14px', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
          ⚠️ Expenses can't be split between cafe and library yet. Run <code>supabase/migrations/20260911_expense_verticals.sql</code> in
          Supabase — until then every expense counts as shared.
        </div>
      )}

      {/* Where the money went, by side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        <div style={{ background: 'white', padding: '14px', borderRadius: '10px', borderTop: '3px solid #e74c3c' }}>
          <div style={{ fontSize: '11px', color: '#999', fontWeight: 700, letterSpacing: '0.5px' }}>TOTAL</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#e74c3c', fontVariantNumeric: 'tabular-nums' }}>{money(total(expenses))}</div>
        </div>
        {SIDES.map(s => (
          <div key={s.key} style={{ background: 'white', padding: '14px', borderRadius: '10px', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: '11px', color: '#999', fontWeight: 700, letterSpacing: '0.5px' }}>{s.icon} {s.label.toUpperCase()}</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: s.color, fontVariantNumeric: 'tabular-nums' }}>{money(bySide[s.key])}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
        <button style={chip(sideFilter === 'all')} onClick={() => setSideFilter('all')}>All</button>
        {SIDES.map(s => (
          <button key={s.key} style={chip(sideFilter === s.key)} onClick={() => setSideFilter(s.key)}>{s.icon} {s.label}</button>
        ))}
      </div>

      {loading ? <p style={{ color: '#999' }}>Loading...</p> : (
        <div style={{ overflowX: 'auto', background: 'white', borderRadius: 10 }}>
          <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Date', 'Side', 'Category', 'Description', 'Amount', ''].map(h => (
                  <th key={h} style={{ padding: '11px 12px', textAlign: h === 'Amount' ? 'right' : 'left', fontSize: '12px', color: '#666', fontWeight: '600' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: '#999', padding: '30px' }}>No expenses recorded</td></tr>
              ) : shown.map(exp => {
                const side = sideOf(exp.vertical);
                return (
                  <tr key={exp.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 12px', fontSize: '12px', color: '#999', whiteSpace: 'nowrap' }}>{new Date(exp.expense_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '3px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', background: side.color + '1a', color: side.color, whiteSpace: 'nowrap' }}>{side.icon} {side.label}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '3px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: (catColors[exp.category] || '#999') + '20', color: catColors[exp.category] || '#999', textTransform: 'capitalize' }}>{exp.category}</span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '13px' }}>{exp.description}</td>
                    <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '700', color: '#e74c3c', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{money(exp.amount)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button onClick={() => deleteExpense(exp.id)} style={{ padding: '4px 9px', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', borderRadius: '16px 16px 0 0', padding: '22px 20px 26px', maxWidth: '480px', width: '100%', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>Add Expense</h2>

            {verticalReady && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', fontWeight: '700', marginBottom: 6 }}>Which side is this for? *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {SIDES.map(s => {
                    const on = form.vertical === s.key;
                    return (
                      <button key={s.key} type="button" onClick={() => setForm({ ...form, vertical: s.key })}
                        style={{
                          padding: '12px 6px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                          border: `2px solid ${on ? s.color : '#e5e7eb'}`, background: on ? s.color + '12' : '#fff',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                        }}>
                        <span style={{ fontSize: 20 }}>{s.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: on ? s.color : '#374151' }}>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, minHeight: 15 }}>
                  {form.vertical ? sideOf(form.vertical).hint : 'Shared costs are divided between cafe and library on the P&L page.'}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', fontWeight: '700', marginBottom: '4px' }}>Category</label>
              <select value={form.category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', padding: '11px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: 15, background: '#fff' }}>
                {EXP_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', fontWeight: '700', marginBottom: '4px' }}>Description *</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: '11px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} placeholder="What was this expense for?" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', fontWeight: '700', marginBottom: '4px' }}>Amount (₹) *</label>
                <input type="number" inputMode="decimal" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={{ width: '100%', padding: '11px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', fontWeight: '700', marginBottom: '4px' }}>Date</label>
                <input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={addExpense} disabled={saving} style={{ flex: 1, padding: '13px', background: '#667eea', color: 'white', border: 'none', borderRadius: '9px', fontWeight: '700', fontSize: 15, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Add expense'}</button>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '13px', background: '#e0e0e0', border: 'none', borderRadius: '9px', fontWeight: '700', fontSize: 15, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
