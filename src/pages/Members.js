import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  calculateEndDate,
  calculateAge,
  isMinor,
  generateCustomerID
} from '../utils/membershipUtils';

function Members() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [editingMember, setEditingMember] = useState(null);
  const [modalMode, setModalMode] = useState('add');
  const [currentFilters, setCurrentFilters] = useState({
    search: '',
    membershipStatus: ['active', 'expiring', 'expired', 'guest'],
    membershipPlan: ['day_pass', 'basic', 'premium', 'family', 'student', 'teen', 'no_plan'],
    sortBy: 'expiry_date',
    sortOrder: 'asc'
  });
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    age: '',
    plan: '',
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

  const fetchTransactions = async (memberId) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('member_id', memberId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
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
  };

  const handleAddMember = () => {
    setModalMode('add');
    setEditingMember(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      date_of_birth: '',
      age: '',
      plan: '',
      duration_days: 30,
      borrow_limit: 3,
      discount_percent: 0,
      price: 100
    });
    setShowModal(true);
  };

  const handleEditMember = (member) => {
    setModalMode('edit');
    setEditingMember(member);
    setFormData({
      name: member.name || '',
      phone: member.phone || '',
      email: member.email || '',
      date_of_birth: member.date_of_birth || '',
      age: member.age || calculateAge(member.date_of_birth) || '',
      plan: member.plan || '',
      duration_days: member.plan_duration_days || 30,
      borrow_limit: member.borrow_limit || 3,
      discount_percent: member.discount_percent || 0,
      price: member.plan_price || PLAN_DEFAULTS[member.plan || 'basic']?.price || 100
    });
    setShowModal(true);
  };

  const handleAddPlanToMember = (member) => {
    setModalMode('addPlan');
    setEditingMember(member);
    setFormData({
      name: member.name,
      phone: member.phone,
      email: member.email,
      date_of_birth: member.date_of_birth,
      age: member.age,
      plan: '',
      duration_days: 30,
      borrow_limit: 3,
      discount_percent: 0,
      price: 100
    });
    setShowModal(true);
  };

  const handleRenewMembership = (member) => {
    setModalMode('edit');
    setEditingMember(member);
    const renewed = renewMembership(member, {});
    setFormData({
      name: member.name,
      phone: member.phone,
      email: member.email,
      date_of_birth: member.date_of_birth,
      age: member.age,
      plan: member.plan,
      duration_days: renewed.plan_duration_days,
      borrow_limit: renewed.borrow_limit,
      discount_percent: renewed.discount_percent,
      price: renewed.plan_price
    });
    setShowModal(true);
  };

  const handleDateChange = (date) => {
    const age = calculateAge(date);
    setFormData({
      ...formData,
      date_of_birth: date,
      age: age || ''
    });
  };

  const handlePlanChange = (plan) => {
    if (!plan) {
      setFormData({
        ...formData,
        plan: '',
        duration_days: 30,
        borrow_limit: 0,
        discount_percent: 0,
        price: 0
      });
    } else {
      const defaults = PLAN_DEFAULTS[plan];
      setFormData({
        ...formData,
        plan,
        duration_days: defaults.duration_days,
        borrow_limit: defaults.borrow_limit,
        discount_percent: defaults.discount_percent,
        price: defaults.price
      });
    }
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
          date_of_birth: formData.date_of_birth,
          age: formData.age,
          customer_type: formData.age < 18 ? 'minor' : 'adult'
        };

        if (formData.plan) {
          updateData.plan = formData.plan;
          updateData.plan_duration_days = formData.duration_days;
          updateData.borrow_limit = formData.borrow_limit;
          updateData.discount_percent = formData.discount_percent;
          updateData.plan_price = formData.price;
          updateData.subscription_start = editingMember.subscription_start || new Date().toISOString().split('T')[0];
          updateData.subscription_end = calculateEndDate(new Date().toISOString().split('T')[0], formData.duration_days);
          updateData.membership_type = 'active_member';
          updateData.status_color = 'gold';
        } else {
          updateData.plan = null;
          updateData.plan_duration_days = null;
          updateData.borrow_limit = null;
          updateData.discount_percent = null;
          updateData.plan_price = null;
          updateData.subscription_start = null;
          updateData.subscription_end = null;
          updateData.membership_type = null;
          updateData.status_color = 'normal';
        }

        const { error } = await supabase
          .from('members')
          .update(updateData)
          .eq('id', editingMember.id);

        if (error) throw error;
        alert('Member updated successfully!');
      } else {
        const newData = {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          date_of_birth: formData.date_of_birth,
          age: formData.age,
          customer_type: formData.age < 18 ? 'minor' : 'adult'
        };

        if (formData.plan) {
          const newMembership = createMembership(formData.plan, {
            duration_days: formData.duration_days,
            borrow_limit: formData.borrow_limit,
            discount_percent: formData.discount_percent,
            price: formData.price
          });
          Object.assign(newData, newMembership);
        } else {
          newData.plan = null;
          newData.borrow_limit = 0;
          newData.discount_percent = 0;
          newData.membership_type = null;
          newData.status_color = 'normal';
        }

        const { error } = await supabase
          .from('members')
          .insert([newData]);

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

  const handleViewHistory = (member) => {
    setSelectedMember(member);
    fetchTransactions(member.id);
    setShowHistory(true);
  };

  const getPlanBadge = (member) => {
    if (!member.plan) return 'NO PLAN';
    const planName = member.plan.replace('_', ' ').toUpperCase();
    return planName;
  };

  const getGeneratedCustomerID = (member) => {
    return generateCustomerID(member);
  };

  const getModalTitle = () => {
    if (modalMode === 'addPlan') return `Add Plan to ${editingMember?.name}`;
    if (modalMode === 'edit') return 'Edit Member';
    return 'Add New Member';
  };

  if (loading) {
    return (
      <div className="page-content">
        <p>Loading members...</p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>👥 Members Management</h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleAddMember}>
            + Add Member
          </button>
        </div>
      </div>

      <FilterBar onFilterChange={handleFilterChange} onClose={() => {}} />

      <div className="members-stats-compact">
        <div className="stat-item">
          <span className="stat-label">Total:</span>
          <span className="stat-number">{members.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Members:</span>
          <span className="stat-number">{members.filter(m => m.plan).length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Guests:</span>
          <span className="stat-number">{members.filter(m => !m.plan).length}</span>
        </div>
      </div>

      <div className="members-table-wrapper">
        <table className="members-table">
          <thead>
            <tr>
              <th>Customer ID</th>
              <th>Name</th>
              <th>Age</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Expires</th>
              <th>Borrow</th>
              <th>Discount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center">No members found</td>
              </tr>
            ) : (
              filteredMembers.map(member => (
                <tr key={member.id} className={`member-row ${member.plan ? 'member-row-gold' : 'guest-row'}`}>
                  <td className="customer-id">{getGeneratedCustomerID(member)}</td>
                  <td className="font-bold">{member.name}</td>
                  <td className="text-center">
                    {member.age ? (
                      <span className={member.age < 18 ? 'minor-badge' : 'adult-badge'}>
                        {member.age} yrs
                      </span>
                    ) : '-'}
                  </td>
                  <td>{member.phone}</td>
                  <td>{member.email || '-'}</td>
                  <td><span className={`plan-badge ${member.plan ? '' : 'guest-badge'}`}>{getPlanBadge(member)}</span></td>
                  <td>{member.subscription_end ? formatDate(member.subscription_end) : '-'}</td>
                  <td className="text-center">{member.borrow_limit || 0}</td>
                  <td className="text-center">{member.discount_percent || 0}%</td>
                  <td className="actions-cell">
                    <button className="btn-icon" onClick={() => handleEditMember(member)} title="Edit">✏️</button>
                    <button className="btn-icon" onClick={() => navigate(`/member/${member.id}`)} title="View Profile">👁️</button>
                    <button className="btn-icon btn-delete-icon" onClick={() => handleDeleteMember(member.id)} title="Delete">🗑️</button>
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
              <h2>{getModalTitle()}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="modal-body">
              {modalMode !== 'addPlan' && (
                <>
                  {editingMember ? (
                    <div className="form-group">
                      <label>Customer ID</label>
                      <input
                        type="text"
                        value={getGeneratedCustomerID(editingMember)}
                        readOnly
                        placeholder="Auto-generated"
                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed', fontFamily: 'Courier New', fontWeight: 'bold', letterSpacing: '1px' }}
                      />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label>Customer ID</label>
                      <input
                        type="text"
                        value="Auto-generated on save"
                        readOnly
                        placeholder="Auto-generated on save"
                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed', color: '#999' }}
                      />
                      <small style={{ color: '#999', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        Will be assigned after member creation (CUST#### or MIN####)
                      </small>
                    </div>
                  )}

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

                  <div className="form-row">
                    <div className="form-group">
                      <label>Date of Birth</label>
                      <input
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => handleDateChange(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Age</label>
                      <input
                        type="text"
                        value={formData.age ? `${formData.age} years` : ''}
                        readOnly
                        placeholder="Age"
                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Membership Plan (Optional)</label>
                <select
                  value={formData.plan}
                  onChange={(e) => handlePlanChange(e.target.value)}
                >
                  <option value="">-- No Plan (Guest) --</option>
                  {Object.keys(PLAN_DEFAULTS).map(key => (
                    <option key={key} value={key}>
                      {PLAN_DEFAULTS[key].name} (₹{PLAN_DEFAULTS[key].price})
                    </option>
                  ))}
                </select>
              </div>

              {formData.plan && (
                <div className="plan-conditional-fields">
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
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveMember}>
                {modalMode === 'addPlan' ? 'Add Plan to Member' : editingMember ? 'Update Member' : 'Create Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistory && selectedMember && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Transaction History - {selectedMember.name}</h2>
              <button className="btn-close" onClick={() => setShowHistory(false)}>×</button>
            </div>

            <div className="modal-body">
              {transactions.length === 0 ? (
                <p className="text-center" style={{ color: '#999', padding: '20px' }}>
                  No transaction history found
                </p>
              ) : (
                <div className="history-table-wrapper">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td>{formatDate(transaction.transaction_date)}</td>
                          <td>
                            <span className={`transaction-badge ${transaction.transaction_type}`}>
                              {transaction.transaction_type === 'borrow' ? '📚 Borrow' : '🛒 Purchase'}
                            </span>
                          </td>
                          <td>{transaction.item_name}</td>
                          <td className="text-center">{transaction.quantity}</td>
                          <td className="text-right">
                            {transaction.amount ? `₹${transaction.amount}` : '-'}
                          </td>
                          <td>
                            <span className={`status-badge ${transaction.status}`}>
                              {transaction.status === 'returned' ? '✓ Returned' : 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowHistory(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Members;