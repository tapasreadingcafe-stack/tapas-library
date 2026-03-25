import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import FilterBar from '../components/FilterBar';
import {
  calculateStatusColor,
  createMembership,
  renewMembership,
  filterMembersByStatus,
  filterMembersByPlan,
  filterMembersBySearch,
  sortMembers,
  formatDate,
  PLAN_DEFAULTS,
  calculateEndDate
} from '../utils/membershipUtils';

function Members() {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [currentFilters, setCurrentFilters] = useState({
    search: '',
    membershipStatus: ['active', 'expiring', 'expired', 'guest'],
    membershipPlan: ['day_pass', 'basic', 'premium', 'family', 'student', 'no_plan'],
    sortBy: 'expiry_date',
    sortOrder: 'asc'
  });
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    plan: 'basic',
    duration_days: 30,
    borrow_limit: 3,
    discount_percent: 0,
    price: 100
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const membersWithStatus = data.map(member => ({
        ...member,
        status_color: calculateStatusColor(member)
      }));

      setMembers(membersWithStatus);
      applyFilters(membersWithStatus, currentFilters);
    } catch (error) {
      console.error('Error fetching members:', error);
      alert('Failed to fetch members');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (membersToFilter, filters) => {
    let result = [...membersToFilter];
    result = filterMembersBySearch(result, filters.search);
    result = filterMembersByStatus(result, filters.membershipStatus);
    result = filterMembersByPlan(result, filters.membershipPlan);
    result = sortMembers(result, filters.sortBy, filters.sortOrder);
    setFilteredMembers(result);
  };

  const handleFilterChange = (newFilters) => {
    setCurrentFilters(newFilters);
    applyFilters(members, newFilters);
    setShowFilterBar(false);
  };

  const handleAddMember = () => {
    setEditingMember(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      plan: 'basic',
      duration_days: 30,
      borrow_limit: 3,
      discount_percent: 0,
      price: 100
    });
    setShowModal(true);
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name || '',
      phone: member.phone || '',
      email: member.email || '',
      plan: member.plan || 'basic',
      duration_days: member.plan_duration_days || 30,
      borrow_limit: member.borrow_limit || 3,
      discount_percent: member.discount_percent || 0,
      price: member.plan_price || PLAN_DEFAULTS[member.plan || 'basic'].price
    });
    setShowModal(true);
  };

  const handleRenewMembership = (member) => {
    setEditingMember(member);
    const renewed = renewMembership(member, {});
    setFormData({
      name: member.name,
      phone: member.phone,
      email: member.email,
      plan: member.plan,
      duration_days: renewed.plan_duration_days,
      borrow_limit: renewed.borrow_limit,
      discount_percent: renewed.discount_percent,
      price: renewed.plan_price
    });
    setShowModal(true);
  };

  const handleSaveMember = async () => {
    if (!formData.name || !formData.phone) {
      alert('Name and phone are required');
      return;
    }

    try {
      if (editingMember) {
        const updateData = {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          plan: formData.plan,
          plan_duration_days: formData.duration_days,
          borrow_limit: formData.borrow_limit,
          discount_percent: formData.discount_percent,
          plan_price: formData.price,
          subscription_start: editingMember.subscription_start || new Date().toISOString().split('T')[0],
          subscription_end: calculateEndDate(new Date().toISOString().split('T')[0], formData.duration_days),
          membership_type: 'active_member',
          status_color: 'gold'
        };

        const { error } = await supabase
          .from('members')
          .update(updateData)
          .eq('id', editingMember.id);

        if (error) throw error;
        alert('Member updated successfully!');
      } else {
        const newMembership = createMembership(formData.plan, {
          duration_days: formData.duration_days,
          borrow_limit: formData.borrow_limit,
          discount_percent: formData.discount_percent,
          price: formData.price
        });

        const { error } = await supabase
          .from('members')
          .insert([{
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            ...newMembership
          }]);

        if (error) throw error;
        alert('Member created successfully!');
      }

      setShowModal(false);
      fetchMembers();
    } catch (error) {
      console.error('Error saving member:', error);
      alert('Failed to save member');
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to delete this member?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      alert('Member deleted successfully!');
      fetchMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Failed to delete member');
    }
  };

  const getStatusBadge = (member) => {
    const color = member.status_color || 'normal';
    if (color === 'gold') return '🟡 Active';
    if (color === 'orange') return '🟠 Expiring';
    if (color === 'red') return '🔴 Expired';
    return '⚪ Guest';
  };

  const getPlanBadge = (member) => {
    if (!member.plan) return '-';
    const planName = member.plan.replace('_', ' ').toUpperCase();
    return planName;
  };

  if (loading) {
    return <div className="page-content"><p>Loading members...</p></div>;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>👥 Members Management</h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleAddMember}>
            + Add New Member
          </button>
          <button className="btn btn-secondary" onClick={() => setShowFilterBar(!showFilterBar)}>
            🔍 Filters
          </button>
        </div>
      </div>

      {showFilterBar && (
        <FilterBar onFilterChange={handleFilterChange} onClose={() => setShowFilterBar(false)} />
      )}

      <div className="members-stats-compact">
        <div className="stat-item">
          <span className="stat-label">Total:</span>
          <span className="stat-number">{members.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Active:</span>
          <span className="stat-number">{members.filter(m => m.status_color === 'gold').length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Expiring:</span>
          <span className="stat-number">{members.filter(m => m.status_color === 'orange').length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Expired:</span>
          <span className="stat-number">{members.filter(m => m.status_color === 'red').length}</span>
        </div>
      </div>

      <div className="members-table-wrapper">
        <table className="members-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Expires</th>
              <th>Borrow</th>
              <th>Discount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center">No members found</td>
              </tr>
            ) : (
              filteredMembers.map(member => (
                <tr key={member.id} className={`member-row ${member.status_color === 'normal' ? 'guest-row' : 'member-row-gold'}`}>
                  <td className="font-bold">{member.name}</td>
                  <td>{member.phone}</td>
                  <td>{member.email || '-'}</td>
                  <td><span className="plan-badge">{getPlanBadge(member)}</span></td>
                  <td>{getStatusBadge(member)}</td>
                  <td>{member.subscription_end ? formatDate(member.subscription_end) : '-'}</td>
                  <td className="text-center">{member.borrow_limit || 0}</td>
                  <td className="text-center">{member.discount_percent || 0}%</td>
                  <td className="actions-cell">
                    <button className="btn btn-small btn-primary" onClick={() => handleEditMember(member)}>Edit</button>
                    {member.plan && <button className="btn btn-small btn-secondary" onClick={() => handleRenewMembership(member)}>Renew</button>}
                    <button className="btn btn-small btn-delete" onClick={() => handleDeleteMember(member.id)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingMember ? 'Edit Member' : 'Add New Member'}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Member name"
                />
              </div>

              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Email address"
                />
              </div>

              <div className="form-group">
                <label>Membership Plan</label>
                <select
                  value={formData.plan}
                  onChange={(e) => {
                    const plan = e.target.value;
                    const defaults = PLAN_DEFAULTS[plan];
                    setFormData({
                      ...formData,
                      plan,
                      duration_days: defaults.duration_days,
                      borrow_limit: defaults.borrow_limit,
                      discount_percent: defaults.discount_percent,
                      price: defaults.price
                    });
                  }}
                >
                  {Object.keys(PLAN_DEFAULTS).map(key => (
                    <option key={key} value={key}>
                      {PLAN_DEFAULTS[key].name} (₹{PLAN_DEFAULTS[key].price})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Duration (days)</label>
                  <input
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) })}
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Borrow Limit</label>
                  <input
                    type="number"
                    value={formData.borrow_limit}
                    onChange={(e) => setFormData({ ...formData, borrow_limit: parseInt(e.target.value) })}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Discount %</label>
                  <input
                    type="number"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({ ...formData, discount_percent: parseFloat(e.target.value) })}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <div className="form-group">
                  <label>Price</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveMember}>
                {editingMember ? 'Update Member' : 'Create Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Members;
