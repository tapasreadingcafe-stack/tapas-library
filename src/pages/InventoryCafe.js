import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';

const SETUP_SQL = `CREATE TABLE IF NOT EXISTS cafe_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  category TEXT DEFAULT 'ingredient',
  unit TEXT DEFAULT 'kg',
  current_stock NUMERIC DEFAULT 0,
  min_stock_level NUMERIC DEFAULT 0,
  cost_per_unit NUMERIC DEFAULT 0,
  supplier_name TEXT,
  last_restocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE cafe_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON cafe_inventory FOR ALL USING (true) WITH CHECK (true);`;

export default function InventoryCafe() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ item_name: '', category: 'ingredient', unit: 'kg', current_stock: '', min_stock_level: '', cost_per_unit: '', supplier_name: '' });

  useEffect(() => {
    const check = async () => {
      const { error } = await supabase.from('cafe_inventory').select('id').limit(0);
      if (error) { setTableReady(false); setLoading(false); return; }
      fetchItems();
    };
    check();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.from('cafe_inventory').select('*').order('item_name');
    setItems(data || []);
    setLoading(false);
  };

  const openAdd = () => { setEditItem(null); setForm({ item_name: '', category: 'ingredient', unit: 'kg', current_stock: '', min_stock_level: '', cost_per_unit: '', supplier_name: '' }); setShowModal(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ item_name: item.item_name, category: item.category, unit: item.unit, current_stock: item.current_stock, min_stock_level: item.min_stock_level, cost_per_unit: item.cost_per_unit, supplier_name: item.supplier_name || '' }); setShowModal(true); };

  const saveItem = async () => {
    if (!form.item_name) return toast.warning('Item name is required');
    const payload = { ...form, current_stock: parseFloat(form.current_stock) || 0, min_stock_level: parseFloat(form.min_stock_level) || 0, cost_per_unit: parseFloat(form.cost_per_unit) || 0, updated_at: new Date().toISOString() };
    if (editItem) await supabase.from('cafe_inventory').update(payload).eq('id', editItem.id);
    else await supabase.from('cafe_inventory').insert([payload]);
    setShowModal(false);
    fetchItems();
  };

  const restock = async (item, qty) => {
    const newStock = (item.current_stock || 0) + qty;
    await supabase.from('cafe_inventory').update({ current_stock: newStock, last_restocked_at: new Date().toISOString() }).eq('id', item.id);
    fetchItems();
  };

  const deleteItem = async (id) => { if (window.confirm('Delete?')) { await supabase.from('cafe_inventory').delete().eq('id', id); fetchItems(); } };

  const filtered = items.filter(i => {
    if (search && !i.item_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'low') return i.current_stock <= i.min_stock_level && i.current_stock > 0;
    if (filter === 'out') return i.current_stock <= 0;
    return true;
  });

  const lowStock = items.filter(i => i.current_stock <= i.min_stock_level && i.current_stock > 0).length;
  const outOfStock = items.filter(i => i.current_stock <= 0).length;

  if (!tableReady) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>☕ Cafe Stock</h1>
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
      <style>{`
        @media (max-width: 768px) { .inv-cafe-controls { flex-direction: column; } .inv-cafe-controls input, .inv-cafe-controls select { width: 100%; } }
        @media (max-width: 480px) { .inv-cafe-table th, .inv-cafe-table td { padding: 8px 6px; font-size: 12px; } }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '28px', margin: 0 }}>☕ Cafe Stock</h1>
        <button onClick={openAdd} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>+ Add Item</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: 'white', padding: '14px', borderRadius: '8px', textAlign: 'center', borderTop: '3px solid #667eea' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#667eea' }}>{items.length}</div>
          <div style={{ fontSize: '11px', color: '#999' }}>TOTAL ITEMS</div>
        </div>
        <div style={{ background: 'white', padding: '14px', borderRadius: '8px', textAlign: 'center', borderTop: '3px solid #f39c12' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#f39c12' }}>{lowStock}</div>
          <div style={{ fontSize: '11px', color: '#999' }}>LOW STOCK</div>
        </div>
        <div style={{ background: 'white', padding: '14px', borderRadius: '8px', textAlign: 'center', borderTop: '3px solid #e74c3c' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#e74c3c' }}>{outOfStock}</div>
          <div style={{ fontSize: '11px', color: '#999' }}>OUT OF STOCK</div>
        </div>
      </div>

      <div className="inv-cafe-controls" style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }}>
          <option value="all">All</option><option value="low">Low Stock</option><option value="out">Out of Stock</option>
        </select>
      </div>

      {loading ? <p style={{ color: '#999' }}>Loading...</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="inv-cafe-table" style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: '600' }}>Item</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: '600' }}>Category</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: '600' }}>Stock</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: '600' }}>Min Level</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: '600' }}>Cost/Unit</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: '#999', padding: '30px' }}>No items found</td></tr>
              ) : filtered.map(item => {
                const isLow = item.current_stock <= item.min_stock_level;
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '600', fontSize: '13px' }}>{item.item_name}</td>
                    <td style={{ padding: '10px 12px', fontSize: '13px', textTransform: 'capitalize' }}>{item.category}</td>
                    <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '600', color: isLow ? '#e74c3c' : '#27ae60' }}>
                      {item.current_stock} {item.unit}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '13px', color: '#999' }}>{item.min_stock_level} {item.unit}</td>
                    <td style={{ padding: '10px 12px', fontSize: '13px' }}>₹{item.cost_per_unit}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <button onClick={() => restock(item, 10)} style={{ padding: '3px 8px', background: '#1dd1a1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>+10</button>
                        <button onClick={() => openEdit(item)} style={{ padding: '3px 8px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Edit</button>
                        <button onClick={() => deleteItem(item.id)} style={{ padding: '3px 8px', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '450px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>{editItem ? 'Edit Item' : 'Add Inventory Item'}</h2>
            {['item_name', 'category', 'unit', 'current_stock', 'min_stock_level', 'cost_per_unit', 'supplier_name'].map(field => (
              <div key={field} style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '2px' }}>{field.replace(/_/g, ' ').toUpperCase()}</label>
                {field === 'category' ? (
                  <select value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
                    <option value="ingredient">Ingredient</option><option value="packaging">Packaging</option><option value="equipment">Equipment</option>
                  </select>
                ) : field === 'unit' ? (
                  <select value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
                    <option value="kg">kg</option><option value="liters">liters</option><option value="pieces">pieces</option><option value="packets">packets</option>
                  </select>
                ) : (
                  <input type={['current_stock', 'min_stock_level', 'cost_per_unit'].includes(field) ? 'number' : 'text'}
                    value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={saveItem} style={{ flex: 1, padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>{editItem ? 'Update' : 'Add'}</button>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', background: '#e0e0e0', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
