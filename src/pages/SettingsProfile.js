import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

export default function SettingsProfile() {
  const { staff, user, changePassword } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (staff) {
      setName(staff.name || '');
      setEmail(staff.email || user?.email || '');
      setPhone(staff.phone || '');
    }
  }, [staff, user]);

  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage('');
    try {
      const { error } = await supabase
        .from('staff')
        .update({ name, phone })
        .eq('id', staff.id);
      if (error) throw error;
      setMessage('✅ Profile updated!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ ' + (err.message || 'Failed to save.'));
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword) return setMessage('❌ Enter a new password.');
    if (newPassword.length < 6) return setMessage('❌ Password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return setMessage('❌ Passwords do not match.');
    setSaving(true);
    setMessage('');
    try {
      await changePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setMessage('✅ Password changed successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ ' + (err.message || 'Failed to change password.'));
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: '640px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '24px' }}>👤 My Profile</h1>

      {/* Profile card */}
      <div style={{ background: 'white', borderRadius: '14px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
        {/* Avatar + info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{
            width: '68px', height: '68px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #D4A853, #C49040)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', color: '#1a0f08', fontWeight: '800',
          }}>
            {initials}
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>{name || 'Staff'}</h2>
            <p style={{ margin: '0 0 2px', color: '#64748b', fontSize: '14px' }}>{email}</p>
            <span style={{
              display: 'inline-block', padding: '2px 10px', borderRadius: '99px',
              background: staff?.role === 'admin' ? '#dbeafe' : '#f1f5f9',
              color: staff?.role === 'admin' ? '#1e40af' : '#475569',
              fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
            }}>
              {staff?.role || 'staff'}
            </span>
          </div>
        </div>

        {/* Name */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Display Name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        </div>

        {/* Email (read-only) */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Email</label>
          <input value={email} disabled style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed' }} />
          <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Email is managed by Supabase Auth and can't be changed here.</p>
        </div>

        {/* Phone */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" style={inputStyle} />
        </div>

        <button onClick={handleSaveProfile} disabled={saving} style={btnStyle}>
          {saving ? '⏳ Saving…' : '✓ Save Profile'}
        </button>
      </div>

      {/* Password card */}
      <div style={{ background: 'white', borderRadius: '14px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '18px', marginTop: 0 }}>
          🔒 Change Password
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
          <div>
            <label style={labelStyle}>New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="Min 6 characters" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password" style={inputStyle} />
          </div>
        </div>

        <button onClick={handleChangePassword} disabled={saving} style={{ ...btnStyle, background: '#475569' }}>
          {saving ? '⏳ Changing…' : '🔒 Change Password'}
        </button>
      </div>

      {/* Status message */}
      {message && (
        <div style={{
          marginTop: '16px', padding: '12px 16px', borderRadius: '10px',
          background: message.startsWith('✅') ? '#dcfce7' : '#fee2e2',
          color: message.startsWith('✅') ? '#166534' : '#991b1b',
          fontSize: '13px', fontWeight: 600,
        }}>
          {message}
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: '12px', fontWeight: 700,
  color: '#64748b', letterSpacing: '0.5px',
  textTransform: 'uppercase', marginBottom: '6px',
};

const inputStyle = {
  width: '100%', padding: '11px 14px',
  border: '1.5px solid #e2e8f0', borderRadius: '8px',
  fontSize: '14px', outline: 'none', fontFamily: 'inherit',
  color: '#0f172a', boxSizing: 'border-box',
  transition: 'border-color 150ms',
};

const btnStyle = {
  width: '100%', padding: '12px',
  background: 'linear-gradient(135deg, #D4A853, #C49040)',
  color: '#1a0f08', border: 'none', borderRadius: '10px',
  fontSize: '14px', fontWeight: 700, cursor: 'pointer',
  fontFamily: 'inherit',
};
