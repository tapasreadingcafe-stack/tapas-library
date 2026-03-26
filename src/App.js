import React, { useState, Suspense } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const Dashboard       = React.lazy(() => import('./pages/Dashboard'));
const Members         = React.lazy(() => import('./pages/Members'));
const Books           = React.lazy(() => import('./pages/Books'));
const Borrow          = React.lazy(() => import('./pages/Borrow'));
const POS             = React.lazy(() => import('./pages/POS'));
const Reports         = React.lazy(() => import('./pages/Reports'));
const MemberProfile   = React.lazy(() => import('./pages/MemberProfile'));
const OverdueBooks    = React.lazy(() => import('./pages/OverdueBooks'));
const BookAvailability  = React.lazy(() => import('./pages/BookAvailability'));
const BorrowStatistics  = React.lazy(() => import('./pages/BorrowStatistics'));
const Reservations    = React.lazy(() => import('./pages/Reservations'));
const Fines           = React.lazy(() => import('./pages/Fines'));
const Reviews         = React.lazy(() => import('./pages/Reviews'));
const Wishlist        = React.lazy(() => import('./pages/Wishlist'));
const Recommendations = React.lazy(() => import('./pages/Recommendations'));
const ChildProfile    = React.lazy(() => import('./pages/ChildProfile'));
const StaffManagement = React.lazy(() => import('./pages/StaffManagement'));

// ── Page loader ───────────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '20px' }}>
      <div style={{ fontSize: '40px', animation: 'pulse 1.4s ease-in-out infinite' }}>📚</div>
      <div style={{ width: '200px', height: '4px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: '40%', background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: '4px', animation: 'slide 1.2s ease-in-out infinite' }} />
      </div>
      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.1);opacity:0.8} }
        @keyframes slide { 0%{transform:translateX(-100%)} 100%{transform:translateX(550%)} }
      `}</style>
    </div>
  );
}

// ── Nav links ─────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { to: '/',              icon: '📊', label: 'Dashboard' },
  { to: '/members',       icon: '👥', label: 'Members' },
  { to: '/books',         icon: '📖', label: 'Books' },
  { to: '/Borrow',        icon: '📚', label: 'Borrow' },
  { to: '/overdue',       icon: '🔴', label: 'Overdue' },
  { to: '/availability',  icon: '🔍', label: 'Availability' },
  { to: '/statistics',    icon: '📈', label: 'Statistics' },
  { to: '/recommendations', icon: '💡', label: 'Recommendations' },
  { to: '/wishlist',      icon: '📋', label: 'Wishlist' },
  { to: '/reviews',       icon: '⭐', label: 'Reviews' },
  { to: '/reservations',  icon: '🔖', label: 'Reservations' },
  { to: '/pos',           icon: '🛒', label: 'POS' },
  { to: '/fines',         icon: '💰', label: 'Fines' },
  { to: '/reports',       icon: '📑', label: 'Reports' },
  { to: '/staff',         icon: '👤', label: 'Staff Management' },
];

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

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
        <div className="navbar-right">
          <span className="user-info">👤 Admin</span>
        </div>
      </nav>

      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <nav className="sidebar-nav">
          {NAV_LINKS.map(link => (
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
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"                                   element={<Dashboard />} />
            <Route path="/members"                            element={<Members />} />
            <Route path="/books"                              element={<Books />} />
            <Route path="/Borrow"                             element={<Borrow />} />
            <Route path="/overdue"                            element={<OverdueBooks />} />
            <Route path="/availability"                       element={<BookAvailability />} />
            <Route path="/statistics"                         element={<BorrowStatistics />} />
            <Route path="/recommendations"                    element={<Recommendations />} />
            <Route path="/wishlist"                           element={<Wishlist />} />
            <Route path="/reviews"                            element={<Reviews />} />
            <Route path="/reservations"                       element={<Reservations />} />
            <Route path="/pos"                                element={<POS />} />
            <Route path="/fines"                              element={<Fines />} />
            <Route path="/reports"                            element={<Reports />} />
            <Route path="/staff"                              element={<StaffManagement />} />
            <Route path="/member/:memberId"                   element={<MemberProfile />} />
            <Route path="/member/:memberId/child/:childId"    element={<ChildProfile />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default App;
