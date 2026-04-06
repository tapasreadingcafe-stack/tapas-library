import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const SETUP_SQL = `CREATE TABLE IF NOT EXISTS cafe_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL, description TEXT NOT NULL, amount NUMERIC NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE, receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE cafe_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON cafe_expenses FOR ALL USING (true) WITH CHECK (true);`;

const EXP_CATEGORIES = ['ingredients', 'equipment', 'utilities', 'rent', 'salary', 'maintenance', 'marketing', 'other'];

export default function AccountsExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({ category: 'ingredients', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    const check = async () => {
      const { error } = await supabase.from('cafe_expenses').select('id').limit(0);
      if (error) { setTableReady(false); setLoading(false); return; }
      fetchExpenses();
    };
    check();
  }, []);

  useEffect(() => { if (tableReady) fetchExpenses(); }, [monthFilter]);

  const fetchExpenses = async () => {
    setLoading(true);
    const startDate = monthFilter + '-01';
    const endDate = (() => { const d = new Date(startDate); d.setMonth(d.getMonth() + 1); d.setDate(0); return d.toISOString().split('T')[0]; })();
    const { data } = await supabase.from('cafe_expenses').select('*').gte('expense_date', startDate).lte('expense_date', endDate).order('expense_date', { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  };

  const addExpense = async () => {
    if (!form.description || !form.amount) return alert('Description and amount required');
    await supabase.from('cafe_expenses').insert([{ ...form, amount: parseFloat(form.amount) }]);
    setShowModal(false);
    setForm({ category: 'ingredients', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0] });
    fetchExpenses();
  };

  const deleteExpense = async (id) => { if (window.confirm('Delete?')) { await supabase.from('cafe_expenses').delete().eq('id', id); fetchExpenses(); } };

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const byCategory = {};
  expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
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

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '28px', margin: 0 }}>🧾 Expenses</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
          <button onClick={() => setShowModal(true)} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>+ Add Expense</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: 'white', padding: '16px', borderRadius: '8px', textAlign: 'center', borderTop: '3px solid #e74c3c' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#e74c3c' }}>₹{totalExpenses.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '11px', color: '#999' }}>TOTAL EXPENSES</div>
        </div>
        {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cat, amt]) => (
          <div key={cat} style={{ background: 'white', padding: '16px', borderRadius: '8px', textAlign: 'center', borderTop: `3px solid ${catColors[cat] || '#999'}` }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: catColors[cat] || '#999' }}>₹{amt.toLocaleString('en-IN')}</div>
            <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase' }}>{cat}</div>
          </div>
        ))}
      </div>

      {loading ? <p style={{ color: '#999' }}>Loading...</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Date', 'Category', 'Description', 'Amount', ''].map(h => (
                  <th key={h} style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: '600' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', color: '#999', padding: '30px' }}>No expenses recorded</td></tr>
              ) : expenses.map(exp => (
                <tr key={exp.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 12px', fontSize: '12px', color: '#999' }}>{new Date(exp.expense_date).toLocaleDateString('en-IN')}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: (catColors[exp.category] || '#999') + '20', color: catColors[exp.category] || '#999', textTransform: 'capitalize' }}>{exp.category}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '13px' }}>{exp.description}</td>
                  <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '600', color: '#e74c3c' }}>₹{exp.amount?.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => deleteExpense(exp.id)} style={{ padding: '3px 8px', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '450px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>Add Expense</h2>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '2px' }}>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
                {EXP_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '2px' }}>Description *</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} placeholder="What was this expense for?" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '2px' }}>Amount (₹) *</label>
                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '2px' }}>Date</label>
                <input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={addExpense} style={{ flex: 1, padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Add</button>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', background: '#e0e0e0', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
