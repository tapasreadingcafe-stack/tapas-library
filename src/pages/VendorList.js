import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';
import { usePermission } from '../hooks/usePermission';
import ViewOnlyBanner from '../components/ViewOnlyBanner';

const SETUP_SQL = `CREATE TABLE IF NOT EXISTS vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, contact_person TEXT, phone TEXT, email TEXT, address TEXT,
  vendor_type TEXT DEFAULT 'books', notes TEXT, is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON vendors FOR ALL USING (true) WITH CHECK (true);`;

export default function VendorList() {
  const toast = useToast();
  const { isReadOnly, canManageVendors } = usePermission();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editVendor, setEditVendor] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '', vendor_type: 'books', notes: '', is_active: true });

  useEffect(() => {
    const check = async () => {
      const { error } = await supabase.from('vendors').select('id').limit(0);
      if (error) { setTableReady(false); setLoading(false); return; }
      fetchVendors();
    };
    check();
  }, []);

  const fetchVendors = async () => {
    setLoading(true);
    const { data } = await supabase.from('vendors').select('*').order('name');
    setVendors(data || []);
    setLoading(false);
  };

  const openAdd = () => { setEditVendor(null); setForm({ name: '', contact_person: '', phone: '', email: '', address: '', vendor_type: 'books', notes: '', is_active: true }); setShowModal(true); };
  const openEdit = (v) => { setEditVendor(v); setForm({ name: v.name, contact_person: v.contact_person || '', phone: v.phone || '', email: v.email || '', address: v.address || '', vendor_type: v.vendor_type, notes: v.notes || '', is_active: v.is_active }); setShowModal(true); };

  const saveVendor = async () => {
    if (!form.name) return toast.warning('Name required');
    if (editVendor) await supabase.from('vendors').update(form).eq('id', editVendor.id);
    else await supabase.from('vendors').insert([form]);
    setShowModal(false);
    fetchVendors();
  };

  const deleteVendor = async (id) => { if (window.confirm('Delete vendor?')) { await supabase.from('vendors').delete().eq('id', id); fetchVendors(); } };

  const filtered = vendors.filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.contact_person?.toLowerCase().includes(search.toLowerCase()));

  if (!tableReady) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>🏪 Vendors</h1>
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
      {isReadOnly && <ViewOnlyBanner />}
      <style>{`@media(max-width:768px){.vendor-page h1{font-size:22px!important}}`}</style>
      <div className="vendor-page" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '28px', margin: 0 }}>🏪 Vendors</h1>
        {!isReadOnly && canManageVendors && <button onClick={openAdd} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>+ Add Vendor</button>}
      </div>
      <input placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', maxWidth: '400px', padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', marginBottom: '16px' }} />

      {loading ? <p style={{ color: '#999' }}>Loading...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
          {filtered.length === 0 ? <p style={{ color: '#999' }}>No vendors found</p> : filtered.map(v => (
            <div key={v.id} style={{ background: 'white', borderRadius: '10px', padding: '16px', borderLeft: `4px solid ${v.is_active ? '#1dd1a1' : '#e0e0e0'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>{v.name}</h3>
                <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: v.is_active ? '#d4edda' : '#f8d7da', color: v.is_active ? '#155724' : '#721c24' }}>{v.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              {v.contact_person && <p style={{ fontSize: '13px', color: '#666', margin: '2px 0' }}>👤 {v.contact_person}</p>}
              {v.phone && <p style={{ fontSize: '13px', color: '#666', margin: '2px 0' }}>📞 {v.phone}</p>}
              {v.email && <p style={{ fontSize: '13px', color: '#666', margin: '2px 0' }}>📧 {v.email}</p>}
              <p style={{ fontSize: '11px', color: '#999', marginTop: '6px', textTransform: 'capitalize' }}>Type: {v.vendor_type}</p>
              <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                <button onClick={() => openEdit(v)} disabled={isReadOnly || !canManageVendors} style={{ padding: '4px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: (isReadOnly || !canManageVendors) ? 'not-allowed' : 'pointer', fontSize: '12px', opacity: (isReadOnly || !canManageVendors) ? 0.5 : 1 }}>Edit</button>
                {!isReadOnly && canManageVendors && <button onClick={() => deleteVendor(v.id)} style={{ padding: '4px 12px', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>{editVendor ? 'Edit Vendor' : 'Add Vendor'}</h2>
            {[{ k: 'name', l: 'Name *' }, { k: 'contact_person', l: 'Contact Person' }, { k: 'phone', l: 'Phone' }, { k: 'email', l: 'Email' }, { k: 'address', l: 'Address' }].map(f => (
              <div key={f.k} style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '2px' }}>{f.l}</label>
                <input value={form[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
              </div>
            ))}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '2px' }}>Type</label>
              <select value={form.vendor_type} onChange={e => setForm({ ...form, vendor_type: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
                <option value="books">Books</option><option value="cafe">Cafe</option><option value="stationery">Stationery</option><option value="other">Other</option>
              </select>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '2px' }}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', minHeight: '60px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              <label style={{ fontSize: '13px' }}>Active vendor</label>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={saveVendor} disabled={isReadOnly} style={{ flex: 1, padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: isReadOnly ? 'not-allowed' : 'pointer', opacity: isReadOnly ? 0.5 : 1 }}>{editVendor ? 'Update' : 'Add'}</button>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', background: '#e0e0e0', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
