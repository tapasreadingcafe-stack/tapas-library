import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function AccountsTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => { fetchTransactions(); }, [dateFilter, typeFilter]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // Merge sales + cafe orders into unified view
      const [{ data: sales }, cafeResult] = await Promise.all([
        supabase.from('sales').select('id, total_amount, sale_date, status, members(name)').eq('sale_date', dateFilter).order('sale_date', { ascending: false }),
        supabase.from('cafe_orders').select('id, total_amount, payment_method, status, customer_name, created_at').gte('created_at', dateFilter + 'T00:00:00').lte('created_at', dateFilter + 'T23:59:59').order('created_at', { ascending: false }).then(r => r).catch(() => ({ data: [] })),
      ]);

      const merged = [];
      (sales || []).forEach(s => merged.push({ id: s.id, type: 'library', name: s.members?.name || 'N/A', amount: s.total_amount, status: s.status, date: s.sale_date, time: '' }));
      (cafeResult?.data || []).forEach(c => merged.push({ id: c.id, type: 'cafe', name: c.customer_name || 'Walk-in', amount: c.total_amount, status: c.status, date: dateFilter, time: new Date(c.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }));

      const filtered = typeFilter === 'all' ? merged : merged.filter(t => t.type === typeFilter);
      setTransactions(filtered);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const totalAmount = transactions.filter(t => t.status === 'completed').reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div style={{ padding: '20px' }}>
      <style>{`
        @media (max-width: 768px) { .txn-controls { flex-direction: column; } .txn-controls input, .txn-controls select { width: 100%; } }
      `}</style>
      <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>💸 Transactions</h1>

      <div className="txn-controls" style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }}>
          <option value="all">All Types</option>
          <option value="library">Library Sales</option>
          <option value="cafe">Cafe Orders</option>
        </select>
        <div style={{ background: 'white', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', color: '#667eea' }}>
          Total: ₹{totalAmount.toLocaleString('en-IN')}
        </div>
      </div>

      {loading ? <p style={{ color: '#999' }}>Loading...</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Type', 'Customer', 'Amount', 'Status', 'Time'].map(h => (
                  <th key={h} style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: '600' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', color: '#999', padding: '30px' }}>No transactions for this date</td></tr>
              ) : transactions.map(t => (
                <tr key={t.id + t.type} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: t.type === 'library' ? '#667eea20' : '#1dd1a120', color: t.type === 'library' ? '#667eea' : '#1dd1a1' }}>
                      {t.type === 'library' ? '📚 Library' : '☕ Cafe'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '500' }}>{t.name}</td>
                  <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '600', color: '#27ae60' }}>₹{t.amount?.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: t.status === 'completed' ? '#d4edda' : '#f8d7da', color: t.status === 'completed' ? '#155724' : '#721c24' }}>{t.status}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '12px', color: '#999' }}>{t.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
