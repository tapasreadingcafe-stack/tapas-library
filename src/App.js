import React, { useState } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Books from './pages/Books';
import Borrow from './pages/Borrow';
import POS from './pages/POS';
import Reports from './pages/Reports';
import MemberProfile from './pages/MemberProfile';
import OverdueBooks from './pages/OverdueBooks';
import BookAvailability from './pages/BookAvailability';
import BorrowStatistics from './pages/BorrowStatistics';
import Reservations from './pages/Reservations';
import Fines from './pages/Fines';
import Reviews from './pages/Reviews';
import Wishlist from './pages/Wishlist';
import Recommendations from './pages/Recommendations';
import ChildProfile from './pages/ChildProfile';
import Login from './pages/Login';
import StaffManagement from './pages/StaffManagement';

import './App.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

// ── Access Denied ─────────────────────────────────────────────────────────────

function AccessDenied({ message = 'You do not have permission to view this page.' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
      <div style={{ fontSize: '48px' }}>🔒</div>
      <h2 style={{ margin: 0, color: '#333' }}>Access Denied</h2>
      <p style={{ color: '#888', margin: 0 }}>{message}</p>
    </div>
  );
}

// ── Loading spinner ───────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f5f5f5' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
        <p style={{ color: '#888', fontWeight: '600' }}>Loading...</p>
      </div>
    </div>
  );
}

// ── Protected Route ───────────────────────────────────────────────────────────

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, staff, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user || !staff) return <Navigate to="/login" replace />;
  if (staff._deactivated) return <AccessDenied message="Your account has been deactivated. Contact an administrator." />;
  if (adminOnly && staff.role !== 'admin') return <AccessDenied />;
  return children;
}

// ── Change Password Modal ─────────────────────────────────────────────────────

function ChangePasswordModal({ onClose }) {
  const { changePassword } = useAuth();
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPw.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      await changePassword(newPw);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0',
    borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#1a1a2e' }}>Change Password</h3>
        {success ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>✅</div>
            <p style={{ color: '#333', marginBottom: '20px' }}>Password changed successfully!</p>
            <button onClick={onClose} style={{ padding: '10px 24px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#721c24' }}>
                {error}
              </div>
            )}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#888', marginBottom: '6px', letterSpacing: '0.5px' }}>NEW PASSWORD</label>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required style={inputStyle} placeholder="At least 6 characters" />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#888', marginBottom: '6px', letterSpacing: '0.5px' }}>CONFIRM PASSWORD</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required style={inputStyle} placeholder="Repeat new password" />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={loading} style={{ flex: 1, padding: '11px', background: loading ? '#a0aec0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '14px' }}>
                {loading ? 'Saving...' : 'Change Password'}
              </button>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px', background: '#f5f5f5', color: '#555', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────

function AppShell() {
  const { staff, logout, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const location = useLocation();

  const admin = isAdmin();

  const allNavLinks = [
    { to: '/', icon: '📊', label: 'Dashboard', adminOnly: false },
    { to: '/members', icon: '👥', label: 'Members', adminOnly: false },
    { to: '/books', icon: '📖', label: 'Books', adminOnly: false },
    { to: '/Borrow', icon: '📚', label: 'Borrow', adminOnly: false },
    { to: '/overdue', icon: '🔴', label: 'Overdue', adminOnly: false },
    { to: '/availability', icon: '🔍', label: 'Availability', adminOnly: false },
    { to: '/statistics', icon: '📈', label: 'Statistics', adminOnly: false },
    { to: '/recommendations', icon: '💡', label: 'Recommendations', adminOnly: false },
    { to: '/wishlist', icon: '📋', label: 'Wishlist', adminOnly: false },
    { to: '/reviews', icon: '⭐', label: 'Reviews', adminOnly: false },
    { to: '/reservations', icon: '🔖', label: 'Reservations', adminOnly: false },
    { to: '/pos', icon: '🛒', label: 'POS', adminOnly: true },
    { to: '/fines', icon: '💰', label: 'Fines', adminOnly: true },
    { to: '/reports', icon: '📑', label: 'Reports', adminOnly: true },
    { to: '/staff', icon: '👤', label: 'Staff Management', adminOnly: true },
  ];

  const visibleLinks = allNavLinks.filter(link => !link.adminOnly || admin);

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  const avatarColor = admin ? '#667eea' : '#3498db';
  const initials = getInitials(staff?.name || staff?.email || '');

  return (
    <div className="app-container">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-left">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle sidebar">
            ☰
          </button>
          <h1 className="app-title">📚 Tapas Library</h1>
        </div>
        <div className="navbar-right" style={{ position: 'relative' }}>
          {/* Avatar + Name */}
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 10px', borderRadius: '10px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: avatarColor, color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '700', fontSize: '13px', flexShrink: 0,
              border: '2px solid rgba(255,255,255,0.4)',
            }}>
              {initials}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'white', lineHeight: 1.2 }}>
                {staff?.name || staff?.email}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.2 }}>
                {admin ? 'Administrator' : 'Staff'}
              </div>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>▼</span>
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setUserMenuOpen(false)} />
              <div style={{
                position: 'absolute', top: '100%', right: '0', marginTop: '6px',
                background: 'white', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                minWidth: '180px', zIndex: 999, overflow: 'hidden',
                border: '1px solid #eee',
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#333' }}>{staff?.name}</div>
                  <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{staff?.email}</div>
                  <span style={{
                    display: 'inline-block', marginTop: '6px',
                    padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                    background: admin ? '#f0edff' : '#e8f4fd', color: admin ? '#667eea' : '#3498db',
                  }}>
                    {admin ? 'Admin' : 'Staff'}
                  </span>
                </div>
                <button
                  onClick={() => { setUserMenuOpen(false); setShowChangePw(true); }}
                  style={{ width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '14px', color: '#444', display: 'flex', alignItems: 'center', gap: '10px' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9f9f9'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  🔑 Change Password
                </button>
                <button
                  onClick={() => { setUserMenuOpen(false); logout(); }}
                  style={{ width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '14px', color: '#e53e3e', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid #f0f0f0' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  🚪 Logout
                </button>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <nav className="sidebar-nav">
          {visibleLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="nav-link"
              style={isActive(link.to) ? { background: 'rgba(102,126,234,0.15)', color: '#667eea', borderLeft: '3px solid #667eea' } : {}}
            >
              <span className="nav-icon">{link.icon}</span>
              <span className="nav-label">{link.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className={`main-content ${sidebarOpen ? 'expanded' : 'full'}`}>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
          <Route path="/books" element={<ProtectedRoute><Books /></ProtectedRoute>} />
          <Route path="/Borrow" element={<ProtectedRoute><Borrow /></ProtectedRoute>} />
          <Route path="/overdue" element={<ProtectedRoute><OverdueBooks /></ProtectedRoute>} />
          <Route path="/availability" element={<ProtectedRoute><BookAvailability /></ProtectedRoute>} />
          <Route path="/statistics" element={<ProtectedRoute><BorrowStatistics /></ProtectedRoute>} />
          <Route path="/recommendations" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
          <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
          <Route path="/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
          <Route path="/reservations" element={<ProtectedRoute><Reservations /></ProtectedRoute>} />
          <Route path="/member/:memberId" element={<ProtectedRoute><MemberProfile /></ProtectedRoute>} />
          <Route path="/member/:memberId/child/:childId" element={<ProtectedRoute><ChildProfile /></ProtectedRoute>} />
          {/* Admin-only routes */}
          <Route path="/pos" element={<ProtectedRoute adminOnly><POS /></ProtectedRoute>} />
          <Route path="/fines" element={<ProtectedRoute adminOnly><Fines /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
          <Route path="/staff" element={<ProtectedRoute adminOnly><StaffManagement /></ProtectedRoute>} />
        </Routes>
      </main>

      {/* Change Password Modal */}
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

function App() {
  const { loading } = useAuth();
  if (loading) return <LoadingSpinner />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<AppShell />} />
    </Routes>
  );
}

export default App;
