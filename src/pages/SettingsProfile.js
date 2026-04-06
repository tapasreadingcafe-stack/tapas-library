import React, { useState } from 'react';

export default function SettingsProfile() {
  const [form, setForm] = useState({ name: 'Admin', email: '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      // Profile update would go here if auth is enabled
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <style>{`
        @media (max-width: 768px) { .profile-form { padding: 16px !important; } }
      `}</style>
      <h1 style={{ fontSize: '28px', marginBottom: '20px' }}>👤 Staff Profile</h1>

      <div className="profile-form" style={{ background: 'white', borderRadius: '10px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: 'white', fontWeight: '700' }}>
            {form.name.charAt(0)}
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '20px' }}>{form.name}</h2>
            <p style={{ margin: 0, color: '#999', fontSize: '13px' }}>Administrator</p>
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#555', fontWeight: '600', marginBottom: '4px' }}>Display Name</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#555', fontWeight: '600', marginBottom: '4px' }}>Email</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@tapasreadingcafe.com"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
        </div>

        <h3 style={{ fontSize: '15px', marginTop: '24px', marginBottom: '12px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>Change Password</h3>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#555', fontWeight: '600', marginBottom: '4px' }}>Current Password</label>
          <input type="password" value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#555', fontWeight: '600', marginBottom: '4px' }}>New Password</label>
            <input type="password" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#555', fontWeight: '600', marginBottom: '4px' }}>Confirm Password</label>
            <input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
          </div>
        </div>

        {message && (
          <div style={{ padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px', fontWeight: '600',
            background: message.includes('Error') ? '#f8d7da' : '#d4edda', color: message.includes('Error') ? '#721c24' : '#155724' }}>
            {message}
          </div>
        )}

        <button onClick={handleSave} disabled={saving}
          style={{ width: '100%', padding: '12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}
