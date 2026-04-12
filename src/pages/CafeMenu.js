import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { usePermission } from '../hooks/usePermission';
import ViewOnlyBanner from '../components/ViewOnlyBanner';

const CATEGORIES = ['tea', 'coffee', 'juice', 'bakery', 'snacks', 'other'];
const CAT_ICONS = { tea: '🍵', coffee: '☕', juice: '🧃', bakery: '🍰', snacks: '🍿', other: '🍽️' };

export default function CafeMenu() {
  const toast = useToast();
  const confirm = useConfirm();
  const { isReadOnly } = usePermission();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterCat, setFilterCat] = useState('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', category: 'tea', price: '', cost_price: '', description: '', image_url: '', is_available: true });

  useEffect(() => { checkAndFetch(); }, []);

  const checkAndFetch = async () => {
    const { error } = await supabase.from('cafe_menu_items').select('id').limit(0);
    if (error) { setTableReady(false); setLoading(false); return; }
    fetchItems();
  };

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.from('cafe_menu_items').select('*').order('display_order').order('name');
    setItems(data || []);
    setLoading(false);
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', category: 'tea', price: '', cost_price: '', description: '', image_url: '', is_available: true });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name, category: item.category, price: item.price, cost_price: item.cost_price || '', description: item.description || '', image_url: item.image_url || '', is_available: item.is_available });
    setShowModal(true);
  };

  const saveItem = async () => {
    if (!form.name || !form.price) return toast.warning('Name and price are required');
    const payload = { ...form, price: parseFloat(form.price), cost_price: parseFloat(form.cost_price) || 0, updated_at: new Date().toISOString() };
    if (editItem) {
      await supabase.from('cafe_menu_items').update(payload).eq('id', editItem.id);
    } else {
      await supabase.from('cafe_menu_items').insert([payload]);
    }
    setShowModal(false);
    fetchItems();
  };

  const deleteItem = async (id) => {
    if (!await confirm({ title: 'Delete Menu Item', message: 'Delete this menu item?', variant: 'danger' })) return;
    await supabase.from('cafe_menu_items').delete().eq('id', id);
    fetchItems();
  };

  const toggleAvail = async (item) => {
    await supabase.from('cafe_menu_items').update({ is_available: !item.is_available }).eq('id', item.id);
    fetchItems();
  };

  const filtered = items.filter(i => {
    if (filterCat !== 'all' && i.category !== filterCat) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (!tableReady) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>📝 Manage Cafe Menu</h1>
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '20px' }}>
          <p>Cafe tables not found. Please set up from the Cafe POS page first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cafe-menu-page">
      {isReadOnly && <ViewOnlyBanner />}
      <style>{`
        .cafe-menu-page { padding: 20px; }
        .cafe-menu-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .cafe-menu-header h1 { font-size: 28px; margin: 0; }
        .cafe-menu-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; align-items: center; }
        .cafe-menu-filters input { padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; min-width: 200px; }
        .cafe-menu-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .cafe-menu-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
        .cafe-menu-table th { text-align: left; padding: 12px; font-size: 12px; color: #666; background: #f8f9fa; font-weight: 600; white-space: nowrap; }
        .cafe-menu-table td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; vertical-align: middle; }
        .cafe-menu-item-img { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; }
        .cafe-menu-item-placeholder { width: 40px; height: 40px; border-radius: 6px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .cafe-avail-badge { padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; cursor: pointer; border: none; }
        .cafe-avail-badge.available { background: #d4edda; color: #155724; }
        .cafe-avail-badge.unavailable { background: #f8d7da; color: #721c24; }
        .cafe-menu-actions { display: flex; gap: 6px; }
        .cafe-menu-actions button { padding: 4px 10px; border-radius: 4px; border: none; cursor: pointer; font-size: 12px; font-weight: 600; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
        .cafe-form-modal { background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; }
        .cafe-form-modal h2 { margin: 0 0 16px; font-size: 20px; }
        .cafe-form-group { margin-bottom: 12px; }
        .cafe-form-group label { display: block; font-size: 12px; color: #666; font-weight: 600; margin-bottom: 4px; }
        .cafe-form-group input, .cafe-form-group select, .cafe-form-group textarea { width: 100%; padding: 8px 10px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; font-family: inherit; }
        .cafe-form-group textarea { resize: vertical; min-height: 60px; }
        .cafe-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .cafe-form-actions { display: flex; gap: 8px; margin-top: 16px; }
        .cafe-form-actions button { flex: 1; padding: 10px; border-radius: 6px; font-weight: 600; font-size: 14px; cursor: pointer; border: none; }
        @media (max-width: 768px) {
          .cafe-menu-page { padding: 12px; }
          .cafe-menu-header h1 { font-size: 22px; }
          .cafe-menu-filters input { min-width: 0; flex: 1; }
          .cafe-form-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .cafe-menu-page { padding: 8px; }
          .cafe-menu-table th, .cafe-menu-table td { padding: 8px 6px; font-size: 12px; }
        }
      `}</style>

      <div className="cafe-menu-header">
        <h1>📝 Manage Cafe Menu</h1>
        {!isReadOnly && <button onClick={openAdd} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
          + Add Item
        </button>}
      </div>

      <div className="cafe-menu-filters">
        <input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>

      {loading ? <p style={{ color: '#999' }}>Loading...</p> : (
        <div className="cafe-menu-table-wrap">
          <table className="cafe-menu-table">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Cost</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: '#999', padding: '30px' }}>No menu items found</td></tr>
              ) : filtered.map(item => (
                <tr key={item.id}>
                  <td>
                    {item.image_url ? <img src={item.image_url} alt="" className="cafe-menu-item-img" /> :
                      <div className="cafe-menu-item-placeholder">{CAT_ICONS[item.category] || '🍽️'}</div>}
                  </td>
                  <td style={{ fontWeight: '600' }}>{item.name}</td>
                  <td><span style={{ textTransform: 'capitalize' }}>{item.category}</span></td>
                  <td style={{ fontWeight: '600', color: '#667eea' }}>₹{item.price}</td>
                  <td style={{ color: '#999' }}>₹{item.cost_price || 0}</td>
                  <td>
                    <button className={`cafe-avail-badge ${item.is_available ? 'available' : 'unavailable'}`} onClick={() => toggleAvail(item)} disabled={isReadOnly}>
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </button>
                  </td>
                  <td>
                    <div className="cafe-menu-actions">
                      <button onClick={() => openEdit(item)} style={{ background: '#667eea', color: 'white' }} disabled={isReadOnly}>Edit</button>
                      {!isReadOnly && <button onClick={() => deleteItem(item.id)} style={{ background: '#ff6b6b', color: 'white' }}>Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="cafe-form-modal" onClick={e => e.stopPropagation()}>
            <h2>{editItem ? 'Edit Item' : 'Add Menu Item'}</h2>
            <div className="cafe-form-group">
              <label>Item Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Masala Chai" />
            </div>
            <div className="cafe-form-group">
              <label>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="cafe-form-row">
              <div className="cafe-form-group">
                <label>Price (₹)</label>
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0" />
              </div>
              <div className="cafe-form-group">
                <label>Cost Price (₹)</label>
                <input type="number" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div className="cafe-form-group">
              <label>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div className="cafe-form-group">
              <label>Image URL</label>
              <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="cafe-form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={form.is_available} onChange={e => setForm({ ...form, is_available: e.target.checked })} />
              <label style={{ margin: 0 }}>Available for ordering</label>
            </div>
            <div className="cafe-form-actions">
              <button onClick={saveItem} style={{ background: '#667eea', color: 'white' }} disabled={isReadOnly}>{editItem ? 'Update' : 'Add Item'}</button>
              <button onClick={() => setShowModal(false)} style={{ background: '#e0e0e0', color: '#333' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
