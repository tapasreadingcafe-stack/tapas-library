import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { usePermission } from '../hooks/usePermission';
import ViewOnlyBanner from '../components/ViewOnlyBanner';

const EMPTY_FORM = { name: '', email: '', password: '', role: 'staff', phone: '' };

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function StaffManagement() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { isReadOnly } = usePermission();
  const [staffList, setStaffList]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [tableExists, setTableExists]   = useState(null);
  const [showForm, setShowForm]         = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [showPwModal, setShowPwModal]   = useState(null); // staff record to reset pw for
  const [changePwModal, setChangePwModal] = useState(false);
  const [newPw, setNewPw]               = useState('');
  const [confirmPw, setConfirmPw]       = useState('');
  const [showNewPw, setShowNewPw]       = useState(false);

  const showToast = (msg, type = 'success') => {
    if (type === 'error') toast.error(msg);
    else toast.success(msg);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { error: probeErr } = await supabase.from('staff').select('id').limit(0);
      if (probeErr) { setTableExists(false); setLoading(false); return; }
      setTableExists(true);

      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setStaffList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingStaff(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (member) => {
    setEditingStaff(member);
    setForm({ name: member.name, email: member.email, password: '', role: member.role, phone: member.phone || '' });
    setShowForm(true);
  };

  const saveStaff = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      showToast('Name and email are required', 'error'); return;
    }
    if (!editingStaff && !form.password) {
      showToast('Password is required for new staff', 'error'); return;
    }
    if (!editingStaff && form.password.length < 6) {
      showToast('Password must be at least 6 characters', 'error'); return;
    }

    setSaving(true);
    try {
      if (editingStaff) {
        // Update staff record
        const updates = { name: form.name.trim(), role: form.role, phone: form.phone.trim() || null };
        const { error } = await supabase.from('staff').update(updates).eq('id', editingStaff.id);
        if (error) throw error;
        showToast(`${form.name} updated successfully`);
      } else {
        // Create Supabase Auth account
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (authErr) throw authErr;

        // Insert staff record
        const { error: staffErr } = await supabase.from('staff').insert({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role,
          phone: form.phone.trim() || null,
          is_active: true,
        });
        if (staffErr) throw staffErr;

        showToast(`${form.name} added! They'll receive a confirmation email to activate their account.`);
      }

      setShowForm(false);
      setEditingStaff(null);
      setForm(EMPTY_FORM);
      fetchStaff();
    } catch (err) {
      showToast(err.message || 'Error saving staff member', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (member) => {
    const action = member.is_active ? 'deactivate' : 'activate';
    if (!await confirm({ title: `${action.charAt(0).toUpperCase() + action.slice(1)} Staff`, message: `${action.charAt(0).toUpperCase() + action.slice(1)} ${member.name}?`, variant: 'warning' })) return;
    try {
      const { error } = await supabase.from('staff').update({ is_active: !member.is_active }).eq('id', member.id);
      if (error) throw error;
      showToast(`${member.name} ${member.is_active ? 'deactivated' : 'activated'}`);
      fetchStaff();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSendResetPassword = async (member) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(member.email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      showToast(`Password reset email sent to ${member.email}`);
      setShowPwModal(null);
    } catch (err) {
      showToast('Failed to send reset email: ' + err.message, 'error');
    }
  };

  const SQL_SETUP = `-- Run in Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff'
    CHECK (role IN ('admin', 'staff')),
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Allow authenticated users to read/write staff table
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_access" ON staff
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Default accounts (create Supabase Auth users separately)
INSERT INTO staff (name, email, role) VALUES
  ('Admin', 'admin@tapaslibrary.com', 'admin'),
  ('Staff User', 'staff@tapaslibrary.com', 'staff')
ON CONFLICT (email) DO NOTHING;`;

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>Loading...</div>;

  if (tableExists === false) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '26px', marginBottom: '20px' }}>👥 Staff Management</h1>
        <div style={{ background: '#fff9e6', border: '1px solid #ffc107', borderRadius: '10px', padding: '20px 24px' }}>
          <div style={{ fontWeight: '700', fontSize: '15px', color: '#856404', marginBottom: '10px' }}>⚠️ Setup Required</div>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
            Run the following SQL in your Supabase Dashboard → SQL Editor, then refresh.
          </div>
          <pre style={{ background: '#1e1e2e', color: '#a6e3a1', borderRadius: '8px', padding: '16px', fontSize: '12px', overflowX: 'auto', margin: '0 0 14px 0', lineHeight: '1.6' }}>
            {SQL_SETUP}
          </pre>
          <button onClick={fetchStaff} style={{ padding: '8px 20px', background: '#ffc107', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
            🔄 Check Again
          </button>
        </div>
      </div>
    );
  }

  const activeCount   = staffList.filter(s => s.is_active).length;
  const adminCount    = staffList.filter(s => s.role === 'admin').length;
  const staffOnlyCount = staffList.filter(s => s.role === 'staff').length;

  return (
    <div style={{ padding: '20px' }}>
      {isReadOnly && <ViewOnlyBanner />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>👥 Staff Management</h1>
          <p style={{ color: '#aaa', fontSize: '13px', margin: 0 }}>Admin only — manage library staff accounts</p>
        </div>
        {!isReadOnly && (
          <button onClick={openAdd} style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
            + Add Staff Member
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Staff', value: staffList.length, color: '#667eea', icon: '👥' },
          { label: 'Admins', value: adminCount, color: '#9b59b6', icon: '🔐' },
          { label: 'Active', value: activeCount, color: '#27ae60', icon: '✓' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: '8px', padding: '14px 18px', borderLeft: `4px solid ${s.color}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '22px' }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#999' }}>{s.label.toUpperCase()}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Staff list */}
      <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        {staffList.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#aaa' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>👥</div>
            No staff accounts yet. Click "+ Add Staff Member" to create one.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e8e8e8' }}>
                {['Staff Member', 'Email', 'Role', 'Phone', 'Last Login', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffList.map(member => (
                <tr key={member.id} style={{ borderBottom: '1px solid #f0f0f0', background: !member.is_active ? '#fafafa' : 'white', opacity: member.is_active ? 1 : 0.65 }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                      ) : (
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                          background: member.role === 'admin' ? '#9b59b6' : '#667eea',
                          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: '700', fontSize: '13px',
                        }}>
                          {initials(member.name)}
                        </div>
                      )}
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{member.name}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555' }}>{member.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: member.role === 'admin' ? '#f3e8ff' : '#e8f0ff',
                      color: member.role === 'admin' ? '#9b59b6' : '#667eea',
                      padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700',
                    }}>
                      {member.role === 'admin' ? '🔐 Admin' : '👤 Staff'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#777' }}>{member.phone || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#999' }}>
                    {member.last_login
                      ? new Date(member.last_login).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : 'Never'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: member.is_active ? '#d4edda' : '#f8d7da',
                      color: member.is_active ? '#155724' : '#721c24',
                      padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600',
                    }}>
                      {member.is_active ? '✓ Active' : '✗ Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => navigate(`/staff/${member.id}`)} style={{ padding: '5px 10px', background: '#f0f0f0', color: '#555', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                        👁️ View
                      </button>
                      {!isReadOnly && (
                        <>
                          <button onClick={() => openEdit(member)} style={{ padding: '5px 10px', background: '#e8f0ff', color: '#667eea', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                            ✏️ Edit
                          </button>
                          <button onClick={() => setShowPwModal(member)} style={{ padding: '5px 10px', background: '#f0f0f0', color: '#555', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>
                            🔑 Reset PW
                          </button>
                          <button onClick={() => toggleActive(member)} style={{ padding: '5px 10px', background: member.is_active ? '#fff5f5' : '#f0fff4', color: member.is_active ? '#e74c3c' : '#27ae60', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                            {member.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={async () => {
                            if (!window.confirm(`Permanently delete ${member.name}? This cannot be undone.`)) return;
                            try {
                              await supabase.from('staff').delete().eq('id', member.id);
                              setStaffList(prev => prev.filter(s => s.id !== member.id));
                            } catch (err) {
                              alert('Failed to delete: ' + (err.message || err));
                            }
                          }} style={{ padding: '5px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                            🗑 Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Note about Supabase email confirmation */}
      <div style={{ marginTop: '16px', background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: '8px', padding: '12px 16px', fontSize: '12px', color: '#4a5568' }}>
        <strong>Note:</strong> New staff accounts use Supabase Auth. If <strong>email confirmation</strong> is enabled in your Supabase project (Auth → Settings), the staff member must confirm their email before logging in.
        To skip confirmation: Supabase Dashboard → Authentication → Email Templates → uncheck "Confirm email".
      </div>

      {/* ── ADD / EDIT STAFF MODAL ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }} onClick={() => setShowForm(false)}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '32px', maxWidth: '460px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '20px' }}>
              {editingStaff ? '✏️ Edit Staff Member' : '+ Add Staff Member'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#888', marginBottom: '6px', letterSpacing: '0.5px' }}>FULL NAME *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Priya Sharma"
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: '7px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#888', marginBottom: '6px', letterSpacing: '0.5px' }}>EMAIL ADDRESS *</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="priya@tapaslibrary.com"
                  disabled={!!editingStaff}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: '7px', fontSize: '14px', boxSizing: 'border-box', background: editingStaff ? '#f5f5f5' : 'white' }} />
                {editingStaff && <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>Email cannot be changed after creation.</div>}
              </div>

              {!editingStaff && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#888', marginBottom: '6px', letterSpacing: '0.5px' }}>INITIAL PASSWORD *</label>
                  <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters"
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: '7px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#888', marginBottom: '6px', letterSpacing: '0.5px' }}>ROLE *</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: '7px', fontSize: '14px' }}>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#888', marginBottom: '6px', letterSpacing: '0.5px' }}>PHONE</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="98765 43210"
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: '7px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* Role description */}
            <div style={{ background: form.role === 'admin' ? '#f3e8ff' : '#e8f0ff', borderRadius: '7px', padding: '10px 14px', marginBottom: '20px', fontSize: '12px', color: form.role === 'admin' ? '#7c3aed' : '#4a5568' }}>
              {form.role === 'admin'
                ? '🔐 Admin: Full access to all features including POS, Fines, Reports, Staff Management, and delete operations.'
                : '👤 Staff: Access to Dashboard, Books, Members, Borrow, Overdue, Availability, Reservations, Reviews, Recommendations, and Wishlist. No access to POS financials or staff management.'}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '11px', background: '#f0f0f0', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' }}>
                Cancel
              </button>
              <button onClick={saveStaff} disabled={saving || isReadOnly} style={{ flex: 1, padding: '11px', background: isReadOnly ? '#d1d5db' : '#667eea', color: 'white', border: 'none', borderRadius: '7px', cursor: isReadOnly ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '14px' }}>
                {saving ? 'Saving...' : editingStaff ? '✓ Save Changes' : '✓ Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET PASSWORD MODAL ── */}
      {showPwModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowPwModal(null)}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', maxWidth: '400px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px 0' }}>🔑 Reset Password</h3>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
              Send a password reset email to <strong>{showPwModal.email}</strong>?<br />
              They'll receive a link to set a new password.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowPwModal(null)} style={{ flex: 1, padding: '10px', background: '#f0f0f0', border: 'none', borderRadius: '7px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => handleSendResetPassword(showPwModal)} style={{ flex: 1, padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontWeight: '700' }}>
                Send Reset Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
