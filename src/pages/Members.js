import React, { useState, useEffect } from 'react';
import BulkImport from '../BulkImport';
import { supabase } from '../utils/supabase';

export default function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    plan: 'basic',
    subscription_start: new Date().toISOString().split('T')[0],
    subscription_end: '',
    borrow_limit: 2,
    status: 'active',
  });

  useEffect(() => {
    fetchMembers();
  }, [filterStatus]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      let query = supabase.from('members').select('*');
      
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateEndDate = (startDate, months) => {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + parseInt(months));
    return date.toISOString().split('T')[0];
  };

  const handlePlanChange = (e) => {
    const plan = e.target.value;
    const monthsMap = { basic: 3, premium: 6, family: 12 };
    setFormData(prev => ({
      ...prev,
      plan,
      subscription_end: calculateEndDate(formData.subscription_start, monthsMap[plan])
    }));
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const { error } = await supabase
          .from('members')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;
        setEditingId(null);
      } else {
        const { error } = await supabase
          .from('members')
          .insert([formData]);
        if (error) throw error;
      }
      
      setFormData({
        name: '',
        phone: '',
        email: '',
        plan: 'basic',
        subscription_start: new Date().toISOString().split('T')[0],
        subscription_end: '',
        borrow_limit: 2,
        status: 'active',
      });
      setShowAddForm(false);
      fetchMembers();
      alert(editingId ? 'Member updated!' : 'Member added!');
    } catch (error) {
      console.error('Error saving member:', error);
      alert('Error saving member: ' + error.message);
    }
  };

  const handleEditMember = (member) => {
    setFormData(member);
    setEditingId(member.id);
    setShowAddForm(true);
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm('Are you sure you want to delete this member?')) return;
    
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchMembers();
      alert('Member deleted!');
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Error deleting member');
    }
  };

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone.includes(searchTerm) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>👥 Members</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => {
              setShowAddForm(true);
              setEditingId(null);
              setFormData({
                name: '',
                phone: '',
                email: '',
                plan: 'basic',
                subscription_start: new Date().toISOString().split('T')[0],
                subscription_end: '',
                borrow_limit: 2,
                status: 'active',
              });
            }}
            style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ➕ Add Member
          </button>
          <button
            onClick={() => setShowImport(true)}
            style={{ padding: '8px 16px', background: '#1dd1a1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            📤 Import CSV
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
        >
          <option value="all">All Members</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {showAddForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', maxWidth: '600px', width: '90%' }}>
            <h2>{editingId ? 'Edit Member' : 'Add New Member'}</h2>
            <form onSubmit={handleAddMember}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Plan *</label>
                  <select
                    name="plan"
                    value={formData.plan}
                    onChange={handlePlanChange}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    <option value="basic">Basic (3 months)</option>
                    <option value="premium">Premium (6 months)</option>
                    <option value="family">Family (12 months)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Borrow Limit</label>
                  <input
                    type="number"
                    name="borrow_limit"
                    value={formData.borrow_limit}
                    onChange={handleInputChange}
                    min="1"
                    max="10"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Start Date</label>
                  <input
                    type="date"
                    name="subscription_start"
                    value={formData.subscription_start}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>End Date</label>
                  <input
                    type="date"
                    name="subscription_end"
                    value={formData.subscription_end}
                    onChange={handleInputChange}
                    readOnly
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', background: '#f5f5f5' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="submit" style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {editingId ? 'Update Member' : 'Add Member'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{ padding: '8px 16px', background: '#e0e0e0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: '20px', textAlign: 'center' }}>Loading members...</p>
        ) : filteredMembers.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No members found</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Phone</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Plan</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px' }}>{member.name}</td>
                  <td style={{ padding: '12px' }}>{member.phone}</td>
                  <td style={{ padding: '12px' }}>{member.email}</td>
                  <td style={{ padding: '12px', textTransform: 'capitalize' }}>{member.plan}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', background: member.status === 'active' ? '#d4edda' : '#f8d7da', color: member.status === 'active' ? '#155724' : '#721c24' }}>
                      {member.status === 'active' ? '✓' : '✗'} {member.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', display: 'flex', gap: '5px' }}>
                    <button
                      onClick={() => handleEditMember(member)}
                      style={{ padding: '4px 8px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member.id)}
                      style={{ padding: '4px 8px', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showImport && (
        <BulkImport
          type="members"
          onSuccess={fetchMembers}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}