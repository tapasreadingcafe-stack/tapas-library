import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import ViewOnlyBanner from '../components/ViewOnlyBanner';

const PAGE_PERMISSIONS = [
  { key: 'dashboard',  label: 'Dashboard',        icon: '📊', desc: 'Main overview' },
  { key: 'books',      label: 'Books',            icon: '📚', desc: 'Catalog management' },
  { key: 'borrow',     label: 'Borrow / Return',  icon: '🔄', desc: 'Check in/out books' },
  { key: 'members',    label: 'Members',          icon: '👥', desc: 'Member management' },
  { key: 'pos',        label: 'POS',              icon: '🛒', desc: 'Point of sale' },
  { key: 'fines',      label: 'Fines',            icon: '💰', desc: 'Fine management' },
  { key: 'cafe',       label: 'Cafe',             icon: '☕', desc: 'Cafe POS & menu' },
  { key: 'events',     label: 'Events',           icon: '🎉', desc: 'Event management' },
  { key: 'inventory',  label: 'Inventory',        icon: '📦', desc: 'Stock tracking' },
  { key: 'reports',    label: 'Reports',          icon: '📑', desc: 'Analytics & reports' },
  { key: 'accounts',   label: 'Accounts',         icon: '💳', desc: 'Finance overview' },
  { key: 'vendors',    label: 'Vendors',          icon: '🏪', desc: 'Vendor & purchases' },
  { key: 'settings',   label: 'Settings',         icon: '⚙️', desc: 'App configuration' },
  { key: 'staff',      label: 'Staff',            icon: '👤', desc: 'Staff management' },
];

const FEATURE_TOGGLES = [
  { key: 'can_delete_books',     label: 'Can delete books',          icon: '🗑️' },
  { key: 'can_export_data',      label: 'Can export data (CSV)',     icon: '📤' },
  { key: 'can_manage_members',   label: 'Can add/edit members',      icon: '✏️' },
  { key: 'can_process_fines',    label: 'Can waive/collect fines',   icon: '💸' },
  { key: 'can_manage_inventory', label: 'Can manage inventory',      icon: '📦' },
  { key: 'can_manage_staff',     label: 'Can manage staff',          icon: '👤' },
  { key: 'can_access_reports',   label: 'Can view reports',          icon: '📊' },
  { key: 'can_manage_events',    label: 'Can manage events',         icon: '🎉' },
];

const ACCESS_LEVELS = ['none', 'view', 'full'];
const LEVEL_LABELS = { none: 'No Access', view: 'View Only', full: 'Full Access' };
const LEVEL_COLORS = {
  none: { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  view: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
  full: { bg: '#d1fae5', color: '#059669', border: '#a7f3d0' },
};

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN');
}

export default function StaffDetail() {
  const { staffId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { staff: currentStaff } = useAuth();
  const { isReadOnly } = usePermission();

  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState({});
  const [features, setFeatures] = useState({});
  const [activityLog, setActivityLog] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    fetchStaff();
    fetchActivity();
  }, [staffId]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('staff').select('*').eq('id', staffId).single();
      if (error) throw error;
      setStaff(data);

      // Load existing permissions
      const perms = data.permissions || {};
      const pagePerms = {};
      PAGE_PERMISSIONS.forEach(p => {
        pagePerms[p.key] = perms[p.key] || (data.role === 'admin' ? 'full' : 'view');
      });
      setPermissions(pagePerms);

      const feats = perms.features || {};
      FEATURE_TOGGLES.forEach(f => {
        if (feats[f.key] === undefined) feats[f.key] = data.role === 'admin';
      });
      setFeatures(feats);
    } catch (err) {
      toast.error('Failed to load staff profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async () => {
    setActivityLoading(true);
    try {
      const { data } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      // Filter by staff ID in metadata if available
      const filtered = (data || []).filter(a => {
        const meta = a.metadata || {};
        return meta.staff_id === staffId || meta.user_id === staffId;
      });
      setActivityLog(filtered.length > 0 ? filtered : (data || []).slice(0, 15));
    } catch {
      setActivityLog([]);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    try {
      const payload = { ...permissions, features };
      const { error } = await supabase
        .from('staff')
        .update({ permissions: payload })
        .eq('id', staffId);
      if (error) throw error;

      // Notify the staff member about the permission change
      try {
        await supabase.from('staff_notifications').insert({
          staff_id: staffId,
          type: 'permissions',
          title: 'Your permissions were updated',
          message: 'An admin has changed your access permissions. Changes take effect automatically.',
          metadata: { updated_by: currentStaff?.id },
        });
      } catch (e) {
        console.error('Failed to send permission notification:', e);
      }

      toast.success('Permissions saved!');
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const isOnline = staff?.last_login && (Date.now() - new Date(staff.last_login).getTime()) < 15 * 60000;

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>Loading staff profile...</div>;
  }

  if (!staff) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>😕</div>
        <div style={{ fontSize: '16px', color: '#666' }}>Staff member not found</div>
        <button onClick={() => navigate('/staff')} style={{ marginTop: '16px', padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
          ← Back to Staff
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '960px', margin: '0 auto' }}>

      {/* Back button */}
      <button onClick={() => navigate('/staff')}
        style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px', fontSize: '13px', fontWeight: '600' }}>
        ← Back to Staff
      </button>

      {isReadOnly && <ViewOnlyBanner />}

      {/* ── PROFILE HEADER ── */}
      <div style={{ background: 'white', borderRadius: '14px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{ position: 'relative' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: staff.role === 'admin' ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'linear-gradient(135deg, #06b6d4, #0891b2)',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '800', fontSize: '28px',
          }}>
            {(staff.name || '?')[0].toUpperCase()}
          </div>
          {/* Online dot */}
          <div style={{
            position: 'absolute', bottom: '2px', right: '2px',
            width: '18px', height: '18px', borderRadius: '50%',
            background: isOnline ? '#22c55e' : staff.is_active ? '#f59e0b' : '#ef4444',
            border: '3px solid white',
          }} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ margin: 0, fontSize: '22px' }}>{staff.name}</h1>
            <span style={{
              padding: '3px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
              background: staff.role === 'admin' ? '#ede9fe' : '#e0f2fe',
              color: staff.role === 'admin' ? '#7c3aed' : '#0284c7',
            }}>
              {staff.role === 'admin' ? '👑 Admin' : '👤 Staff'}
            </span>
            <span style={{
              padding: '3px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
              background: staff.is_active ? '#d1fae5' : '#fee2e2',
              color: staff.is_active ? '#059669' : '#dc2626',
            }}>
              {staff.is_active ? '● Active' : '○ Inactive'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#6b7280', flexWrap: 'wrap' }}>
            <span>📧 {staff.email}</span>
            {staff.phone && <span>📱 {staff.phone}</span>}
          </div>
        </div>

        {/* Login Status */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginBottom: '4px' }}>
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: isOnline ? '#22c55e' : '#d1d5db',
              boxShadow: isOnline ? '0 0 8px #22c55e' : 'none',
            }} />
            <span style={{ fontSize: '14px', fontWeight: '700', color: isOnline ? '#059669' : '#9ca3af' }}>
              {isOnline ? 'Online Now' : 'Offline'}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            Last login: {timeAgo(staff.last_login)}
          </div>
          <div style={{ fontSize: '11px', color: '#d1d5db', marginTop: '2px' }}>
            Joined: {new Date(staff.created_at).toLocaleDateString('en-IN')}
          </div>
        </div>
      </div>

      {/* ── PAGE PERMISSIONS ── */}
      <div style={{ background: 'white', borderRadius: '14px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '17px' }}>🔐 Page Permissions</h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Control which pages this staff member can access</p>
          </div>
          <button onClick={handleSavePermissions} disabled={saving || isReadOnly}
            style={{
              padding: '10px 24px', background: (saving || isReadOnly) ? '#d1d5db' : '#059669', color: 'white',
              border: 'none', borderRadius: '8px', cursor: (saving || isReadOnly) ? 'not-allowed' : 'pointer',
              fontWeight: '700', fontSize: '13px',
              boxShadow: (saving || isReadOnly) ? 'none' : '0 2px 8px rgba(5,150,105,0.3)',
            }}>
            {saving ? '⏳ Saving...' : '💾 Save Permissions'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '12px', padding: '6px 12px', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Page</span>
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Access Level</span>
          </div>

          {PAGE_PERMISSIONS.map(page => (
            <div key={page.key} style={{
              display: 'grid', gridTemplateColumns: '1fr 300px', gap: '12px',
              padding: '10px 12px', borderRadius: '8px', alignItems: 'center',
              background: permissions[page.key] === 'none' ? '#fafafa' : 'white',
              border: '1px solid #f3f4f6',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>{page.icon}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{page.label}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>{page.desc}</div>
                </div>
              </div>

              {/* 3-way toggle */}
              <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '8px', padding: '3px', gap: '2px' }}>
                {ACCESS_LEVELS.map(level => {
                  const active = permissions[page.key] === level;
                  const colors = LEVEL_COLORS[level];
                  return (
                    <button key={level} onClick={() => setPermissions(p => ({ ...p, [page.key]: level }))}
                      disabled={isReadOnly}
                      style={{
                        flex: 1, padding: '6px 4px', border: 'none', borderRadius: '6px',
                        cursor: isReadOnly ? 'not-allowed' : 'pointer',
                        fontSize: '11px', fontWeight: '700', transition: 'all 0.15s',
                        background: active ? colors.bg : 'transparent',
                        color: active ? colors.color : '#9ca3af',
                        opacity: isReadOnly ? 0.6 : 1,
                      }}>
                      {LEVEL_LABELS[level]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURE TOGGLES ── */}
      <div style={{ background: 'white', borderRadius: '14px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '17px' }}>🎛️ Feature Toggles</h2>
        <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#9ca3af' }}>Fine-grained control over specific actions</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
          {FEATURE_TOGGLES.map(feat => {
            const enabled = features[feat.key] !== false;
            return (
              <div key={feat.key}
                onClick={() => !isReadOnly && setFeatures(f => ({ ...f, [feat.key]: !enabled }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                  borderRadius: '8px', cursor: isReadOnly ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                  border: `1.5px solid ${enabled ? '#a7f3d0' : '#e5e7eb'}`,
                  background: enabled ? '#f0fdf4' : '#fafafa',
                  pointerEvents: isReadOnly ? 'none' : 'auto',
                  opacity: isReadOnly ? 0.6 : 1,
                }}>
                <span style={{ fontSize: '16px' }}>{feat.icon}</span>
                <span style={{ flex: 1, fontSize: '13px', fontWeight: '600', color: enabled ? '#374151' : '#9ca3af' }}>{feat.label}</span>
                {/* Toggle switch */}
                <div style={{
                  width: '40px', height: '22px', borderRadius: '11px', position: 'relative',
                  background: enabled ? '#22c55e' : '#d1d5db', transition: 'all 0.2s',
                  flexShrink: 0,
                }}>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                    position: 'absolute', top: '2px',
                    left: enabled ? '20px' : '2px',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ACTIVITY LOG ── */}
      <div style={{ background: 'white', borderRadius: '14px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '17px' }}>📋 Recent Activity</h2>
        {activityLoading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>Loading activity...</div>
        ) : activityLog.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#d1d5db' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📭</div>
            <div>No activity recorded yet</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {activityLog.map((log, idx) => (
              <div key={log.id || idx} style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 12px',
                borderRadius: '6px', background: idx % 2 === 0 ? '#fafafa' : 'white',
              }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', marginTop: '6px', flexShrink: 0,
                  background: log.action?.includes('DELETE') || log.action?.includes('REMOVE') ? '#ef4444'
                    : log.action?.includes('CREATE') || log.action?.includes('ADD') ? '#22c55e'
                    : log.action?.includes('UPDATE') || log.action?.includes('EDIT') ? '#f59e0b'
                    : '#667eea',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{log.description || log.action}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                    {new Date(log.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
