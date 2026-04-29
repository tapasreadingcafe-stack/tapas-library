import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import FilterBar from '../components/FilterBar';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { logActivity, ACTIONS } from '../utils/activityLog';
import { usePermission } from '../hooks/usePermission';
import ViewOnlyBanner from '../components/ViewOnlyBanner';
import { sendEmail, membershipExpiryEmailHtml } from '../utils/emailUtils';
import { sendWhatsApp, membershipExpiryWhatsAppMsg } from '../utils/whatsappUtils';

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
  const toast = useToast();
  const confirm = useConfirm();
  const { isReadOnly, canManageMembers } = usePermission();
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
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkRenewing, setBulkRenewing] = useState(false);
  const [expiryFilter, setExpiryFilter] = useState('all'); // 'all', 'expiring', 'expired'
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
        .select('id, sequential_id, name, phone, email, age, date_of_birth, plan, plan_duration_days, plan_price, borrow_limit, discount_percent, subscription_start, subscription_end, membership_type, status_color, status, customer_type, profile_photo, created_at, auth_user_id')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const membersWithStatus = data.map(member => ({
        ...member,
        status_color: calculateStatusColor(member)
      }));

      setMembers(membersWithStatus);
      applyFilters(membersWithStatus, currentFilters);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to fetch members');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (memberId) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, transaction_date, transaction_type, item_name, quantity, amount, status')
        .eq('member_id', memberId)
        .order('transaction_date', { ascending: false })
        .limit(50);

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
      price: 100,
      profile_photo: ''
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
      price: member.plan_price || PLAN_DEFAULTS[member.plan || 'basic']?.price || 100,
      profile_photo: member.profile_photo || ''
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

  // Bulk renew selected members
  const handleBulkRenew = async () => {
    const selected = members.filter(m => selectedIds.has(m.id) && m.plan);
    if (selected.length === 0) { toast.warning('No members with plans selected'); return; }
    const ok = await confirm(`Renew ${selected.length} member(s) for their current plan duration?`);
    if (!ok) return;
    setBulkRenewing(true);
    let count = 0;
    for (const member of selected) {
      try {
        const renewed = renewMembership(member, {});
        await supabase.from('members').update(renewed).eq('id', member.id);
        count++;
      } catch (err) { console.error('Failed to renew', member.name, err); }
    }
    toast.success(`Renewed ${count} member(s)!`);
    setSelectedIds(new Set());
    setBulkRenewing(false);
    fetchMembers();
  };

  // Send renewal reminder email
  const handleSendRenewalReminder = async (member) => {
    if (!member.email) { toast.error('No email for this member'); return; }
    const result = await sendEmail({
      to: member.email,
      subject: 'Membership Expiring Soon',
      html: membershipExpiryEmailHtml({
        memberName: member.name,
        plan: member.plan || 'Standard',
        expiryDate: formatDate(member.subscription_end),
      }),
      type: 'membership_expiry',
    });
    if (result.success) toast.success(`Reminder sent to ${member.email}`);
    else toast.error(result.error || 'Failed to send email');
  };

  // Toggle member selection
  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // Expiry-filtered members
  const getExpiryFiltered = () => {
    if (expiryFilter === 'all') return filteredMembers;
    const today = new Date();
    const weekLater = new Date(); weekLater.setDate(today.getDate() + 7);
    if (expiryFilter === 'expiring') return filteredMembers.filter(m => m.subscription_end && new Date(m.subscription_end) >= today && new Date(m.subscription_end) <= weekLater);
    if (expiryFilter === 'expired') return filteredMembers.filter(m => m.subscription_end && new Date(m.subscription_end) < today);
    return filteredMembers;
  };
  const displayMembers = getExpiryFiltered();

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
      toast.warning('Name and phone are required');
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
          customer_type: formData.age < 18 ? 'minor' : 'adult',
          ...(formData.profile_photo !== undefined && { profile_photo: formData.profile_photo || null }),
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
        toast.success('Member updated successfully!');
        logActivity(ACTIONS.MEMBER_UPDATED, `Updated member: ${formData.name}`, { member_name: formData.name });
      } else {
        const newData = {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          date_of_birth: formData.date_of_birth,
          age: formData.age,
          customer_type: formData.age < 18 ? 'minor' : 'adult',
          ...(formData.profile_photo && { profile_photo: formData.profile_photo }),
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
        toast.success('Member added successfully!');
        logActivity(ACTIONS.MEMBER_ADDED, `New member added: ${formData.name}`, { member_name: formData.name, plan: formData.plan });
      }

      setShowModal(false);
      fetchMembers();
    } catch (error) {
      console.error('Error saving member:', error);
      toast.error('Failed to save member');
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!await confirm({ title: 'Delete Member', message: 'Are you sure you want to delete this member?', variant: 'danger' })) {
      return;
    }

    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      toast.success('Member deleted successfully!');
      logActivity(ACTIONS.MEMBER_DELETED, `Member deleted`, { member_id: memberId });
      fetchMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error('Failed to delete member');
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
        <div className="page-header">
          <h1>👥 Members Management</h1>
        </div>
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', marginTop: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  {[12, 18, 8, 12, 20, 10, 8, 8, 4].map((w, j) => (
                    <td key={j} style={{ padding: '14px 12px' }}>
                      <div style={{ height: '13px', width: `${w * 5}px`, background: '#f0f0f0', borderRadius: '4px', animation: 'shimmer 1.4s ease-in-out infinite' }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <style>{`@keyframes shimmer{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      {isReadOnly && <ViewOnlyBanner />}
      <div className="page-header">
        <h1>👥 Members Management</h1>
        <div className="header-actions">
          {!isReadOnly && canManageMembers && (
            <button className="btn btn-primary" data-tour="add-member" onClick={handleAddMember}>
              + Add Member
            </button>
          )}
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

      {/* Expiry quick filter + bulk actions */}
      <div data-tour="expiry-filter" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#666' }}>Quick:</span>
        {['all', 'expiring', 'expired'].map(f => (
          <button key={f} onClick={() => setExpiryFilter(f)}
            style={{ padding: '4px 12px', borderRadius: '20px', border: expiryFilter === f ? '2px solid #667eea' : '1px solid #ddd', background: expiryFilter === f ? '#eef' : '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: expiryFilter === f ? '#667eea' : '#666' }}>
            {f === 'all' ? 'All' : f === 'expiring' ? '⚠️ Expiring This Week' : '🔴 Expired'}
          </button>
        ))}
        {selectedIds.size > 0 && (
          <>
            <span style={{ marginLeft: '16px', fontSize: '13px', fontWeight: '600' }}>{selectedIds.size} selected</span>
            <button onClick={handleBulkRenew} disabled={bulkRenewing}
              style={{ padding: '6px 14px', background: '#38a169', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', opacity: bulkRenewing ? 0.6 : 1 }}>
              {bulkRenewing ? 'Renewing...' : '🔄 Bulk Renew'}
            </button>
            <button onClick={() => setSelectedIds(new Set())} style={{ padding: '6px 10px', background: '#999', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Clear</button>
          </>
        )}
      </div>

      <div className="members-table-wrapper">
        <table className="members-table">
          <thead>
            <tr>
              <th style={{ width: '30px' }}><input type="checkbox" onChange={e => { if (e.target.checked) setSelectedIds(new Set(displayMembers.map(m => m.id))); else setSelectedIds(new Set()); }} checked={selectedIds.size > 0 && selectedIds.size === displayMembers.length} /></th>
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
            {displayMembers.length === 0 ? (
              <tr>
                <td colSpan="11" className="text-center">No members found</td>
              </tr>
            ) : (
              displayMembers.map(member => (
                <tr key={member.id} className={`member-row ${member.plan ? 'member-row-gold' : 'guest-row'}`}>
                  <td style={{ width: '30px' }}><input type="checkbox" checked={selectedIds.has(member.id)} onChange={() => toggleSelect(member.id)} /></td>
                  <td className="customer-id">{getGeneratedCustomerID(member)}</td>
                  <td className="font-bold" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {member.profile_photo ? (
                      <img src={member.profile_photo} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#667eea', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '11px', flexShrink: 0 }}>
                        {(member.name || '?')[0].toUpperCase()}
                      </div>
                    )}
                    {member.name}
                    {member.auth_user_id && (
                      <span title="Registered on the online store" style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '10px', background: '#e6f4ea', color: '#276749', fontWeight: '700', marginLeft: '4px' }}>
                        🌐 Online
                      </span>
                    )}
                  </td>
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
                    <button className="btn-icon" onClick={() => handleEditMember(member)} title="Edit" disabled={isReadOnly || !canManageMembers}><ActionIcon name="edit" /></button>
                    <button className="btn-icon" onClick={() => navigate(`/member/${member.id}`)} title="View Profile"><ActionIcon name="view" /></button>
                    {member.plan && !isReadOnly && canManageMembers && <button className="btn-icon" onClick={() => handleRenewMembership(member)} title="Renew" style={{ color: '#38a169' }}><ActionIcon name="renew" /></button>}
                    {member.email && member.subscription_end && <button className="btn-icon" onClick={() => handleSendRenewalReminder(member)} title="Email Renewal Reminder"><ActionIcon name="email" /></button>}
                    {member.phone && member.subscription_end && <button className="btn-icon" onClick={async () => {
                      const result = await sendWhatsApp(member.phone, membershipExpiryWhatsAppMsg({ memberName: member.name, plan: member.plan || 'Standard', expiryDate: formatDate(member.subscription_end) }));
                      if (result.success) toast.success(result.mode === 'link' ? 'WhatsApp opened' : 'WhatsApp sent!');
                      else toast.error(result.error || 'Failed');
                    }} title="WhatsApp Renewal Reminder" style={{ color: '#25D366' }}><ActionIcon name="phone" /></button>}
                    {!isReadOnly && canManageMembers && <button className="btn-icon btn-delete-icon" onClick={() => handleDeleteMember(member.id)} title="Delete"><ActionIcon name="delete" /></button>}
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

                  {/* Profile Photo Upload */}
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      {formData.profile_photo ? (
                        <img src={formData.profile_photo} alt="" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #667eea' }} />
                      ) : (
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#e0e8ff', color: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '20px' }}>
                          {(formData.name || '?')[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>Profile Photo</label>
                      <input type="file" accept="image/*" style={{ fontSize: '12px' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB'); return; }
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const img = new Image();
                            img.onload = () => {
                              const canvas = document.createElement('canvas');
                              const size = 200;
                              canvas.width = size; canvas.height = size;
                              const ctx = canvas.getContext('2d');
                              const scale = Math.max(size / img.width, size / img.height);
                              const w = img.width * scale, h = img.height * scale;
                              ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
                              setFormData(prev => ({ ...prev, profile_photo: canvas.toDataURL('image/jpeg', 0.8) }));
                            };
                            img.src = ev.target.result;
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </div>
                  </div>

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
              <button className="btn btn-primary" onClick={handleSaveMember} disabled={isReadOnly}>
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

// ─────────────────────────────────────────────────────────────────────
// ActionIcon — black silhouette SVGs replacing the colored emoji
// glyphs that were in the actions column. Each icon inherits
// `currentColor` so the parent button's `style={{ color }}` (used to
// tint the renew button green and the WhatsApp button green) keeps
// working — no extra wiring needed.
// ─────────────────────────────────────────────────────────────────────
function ActionIcon({ name, size = 18 }) {
  const common = {
    width: size, height: size,
    fill: 'currentColor', stroke: 'none',
    display: 'inline-block', verticalAlign: 'middle',
  };
  switch (name) {
    case 'edit':
      return (
        <svg viewBox="0 0 24 24" style={common} aria-hidden="true">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
      );
    case 'view':
      return (
        <svg viewBox="0 0 24 24" style={common} aria-hidden="true">
          <path d="M12 5C6.5 5 2.7 8.6 1 12c1.7 3.4 5.5 7 11 7s9.3-3.6 11-7c-1.7-3.4-5.5-7-11-7zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/>
        </svg>
      );
    case 'renew':
      return (
        <svg viewBox="0 0 24 24" style={common} aria-hidden="true">
          <path d="M17.65 6.35A8 8 0 0 0 4.34 9H6.5l-3 3-3-3h2A10 10 0 1 1 12 22V20a8 8 0 0 0 5.65-13.65zM12 8v5l4.25 2.52.75-1.27-3.5-2.07V8H12z"/>
        </svg>
      );
    case 'email':
      return (
        <svg viewBox="0 0 24 24" style={common} aria-hidden="true">
          <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/>
          <text x="12" y="17" textAnchor="middle" fontSize="6" fontWeight="700" fill="currentColor" stroke="none">E</text>
        </svg>
      );
    case 'phone':
      return (
        <svg viewBox="0 0 24 24" style={common} aria-hidden="true">
          <path d="M17 1H7a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm-5 21a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zM17 18H7V4h10v14z"/>
        </svg>
      );
    case 'delete':
      return (
        <svg viewBox="0 0 24 24" style={common} aria-hidden="true">
          <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
        </svg>
      );
    default:
      return null;
  }
}

export default Members;