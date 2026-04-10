import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { HintBubble } from './components/HintTooltip';
import GlobalTooltip from './components/GlobalTooltip';
import { useTheme } from './components/ThemeProvider';
import { useDevMode, Editable } from './components/DevMode';
import NotificationBell from './components/NotificationBell';
import './App.css';

// ── Lazy-loaded pages (Existing) ─────────────────────────────────────────────
const Dashboard        = React.lazy(() => import('./pages/Dashboard'));
const Members          = React.lazy(() => import('./pages/Members'));
const Books            = React.lazy(() => import('./pages/Books'));
const Borrow           = React.lazy(() => import('./pages/Borrow'));
const POS              = React.lazy(() => import('./pages/POS'));
const Reports          = React.lazy(() => import('./pages/Reports'));
const MemberProfile    = React.lazy(() => import('./pages/MemberProfile'));
const OverdueBooks     = React.lazy(() => import('./pages/OverdueBooks'));
const BookAvailability = React.lazy(() => import('./pages/BookAvailability'));
const BorrowStatistics = React.lazy(() => import('./pages/BorrowStatistics'));
const Reservations     = React.lazy(() => import('./pages/Reservations'));
const Fines            = React.lazy(() => import('./pages/Fines'));
const Reviews          = React.lazy(() => import('./pages/Reviews'));
const Wishlist         = React.lazy(() => import('./pages/Wishlist'));
const Recommendations  = React.lazy(() => import('./pages/Recommendations'));
const ChildProfile     = React.lazy(() => import('./pages/ChildProfile'));
const StaffManagement  = React.lazy(() => import('./pages/StaffManagement'));

// ── Lazy-loaded pages (New - Phase 2: Cafe) ──────────────────────────────────
const CafePOS          = React.lazy(() => import('./pages/CafePOS'));
const CafeMenu         = React.lazy(() => import('./pages/CafeMenu'));
const CafeOrders       = React.lazy(() => import('./pages/CafeOrders'));
const CafeReports      = React.lazy(() => import('./pages/CafeReports'));

// ── Lazy-loaded pages (New - Phase 3: Events) ────────────────────────────────
const EventListing     = React.lazy(() => import('./pages/EventListing'));
const EventCreate      = React.lazy(() => import('./pages/EventCreate'));
const EventAttendance  = React.lazy(() => import('./pages/EventAttendance'));

// ── Lazy-loaded pages (New - Phase 4: Inventory, Accounts, Vendors, Settings)
const InventoryLibrary      = React.lazy(() => import('./pages/InventoryLibrary'));
const InventoryCafe         = React.lazy(() => import('./pages/InventoryCafe'));
const VendorList            = React.lazy(() => import('./pages/VendorList'));
const PurchaseOrders        = React.lazy(() => import('./pages/PurchaseOrders'));
const AccountsOverview      = React.lazy(() => import('./pages/AccountsOverview'));
const AccountsTransactions  = React.lazy(() => import('./pages/AccountsTransactions'));
const AccountsExpenses      = React.lazy(() => import('./pages/AccountsExpenses'));
const SettingsApp           = React.lazy(() => import('./pages/SettingsApp'));
const SettingsProfile       = React.lazy(() => import('./pages/SettingsProfile'));
const ActivityLog           = React.lazy(() => import('./pages/ActivityLog'));
const PublicCatalog         = React.lazy(() => import('./pages/PublicCatalog'));
const BookCopies            = React.lazy(() => import('./pages/BookCopies'));
const DeviceManager         = React.lazy(() => import('./pages/DeviceManager'));
const KioskMode             = React.lazy(() => import('./pages/KioskMode'));

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

// ── Navigation config (hierarchical) ─────────────────────────────────────────

const NAV_CONFIG = [
  { to: '/', icon: '📊', label: 'Dashboard' },
  {
    icon: '📖', label: 'Library', key: 'library',
    children: [
      { to: '/books',           icon: '📚', label: 'Books' },
      { to: '/Borrow',          icon: '🔄', label: 'Borrow' },
      { to: '/overdue',         icon: '🔴', label: 'Overdue' },
      { to: '/availability',    icon: '🔍', label: 'Availability' },
      { to: '/statistics',      icon: '📈', label: 'Statistics' },
      { to: '/recommendations', icon: '💡', label: 'Recommend' },
      { to: '/wishlist',        icon: '📋', label: 'Wishlist' },
      { to: '/reviews',         icon: '⭐', label: 'Reviews' },
      { to: '/reservations',    icon: '🔖', label: 'Reservations' },
      { to: '/pos',             icon: '🛒', label: 'POS' },
    ],
  },
  {
    icon: '☕', label: 'Cafe', key: 'cafe',
    children: [
      { to: '/cafe/menu',    icon: '🍰', label: 'Menu & POS' },
      { to: '/cafe/manage',  icon: '📝', label: 'Manage Menu' },
      { to: '/cafe/orders',  icon: '📋', label: 'Orders' },
      { to: '/cafe/reports', icon: '📊', label: 'Cafe Reports' },
    ],
  },
  {
    icon: '👥', label: 'Members', key: 'members',
    children: [
      { to: '/members', icon: '👥', label: 'Members List' },
      { to: '/fines',   icon: '💰', label: 'Fines' },
    ],
  },
  {
    icon: '📦', label: 'Inventory', key: 'inventory',
    children: [
      { to: '/inventory/library', icon: '📚', label: 'Library Stock' },
      { to: '/inventory/cafe',    icon: '☕', label: 'Cafe Stock' },
    ],
  },
  {
    icon: '🎉', label: 'Events', key: 'events',
    children: [
      { to: '/events',            icon: '📅', label: 'All Events' },
      { to: '/events/create',     icon: '➕', label: 'Create Event' },
      { to: '/events/attendance', icon: '✅', label: 'Attendance' },
    ],
  },
  { to: '/reports', icon: '📑', label: 'Reports' },
  {
    icon: '💳', label: 'Accounts', key: 'accounts',
    children: [
      { to: '/accounts/overview',     icon: '📊', label: 'Overview' },
      { to: '/accounts/transactions', icon: '💸', label: 'Transactions' },
      { to: '/accounts/expenses',     icon: '🧾', label: 'Expenses' },
    ],
  },
  { to: '/staff', icon: '👤', label: 'Staff' },
  {
    icon: '🏪', label: 'Vendors', key: 'vendors',
    children: [
      { to: '/vendors',        icon: '🏪', label: 'Vendor List' },
      { to: '/vendors/orders', icon: '📦', label: 'Purchase Orders' },
    ],
  },
  {
    icon: '⚙️', label: 'Settings', key: 'settings',
    children: [
      { to: '/settings/app',     icon: '🔧', label: 'App Config' },
      { to: '/settings/profile', icon: '👤', label: 'Profile' },
      { to: '/settings/activity', icon: '📋', label: 'Activity Log' },
      { to: '/settings/devices', icon: '🔌', label: 'Devices' },
      { to: '/catalog',          icon: '🌐', label: 'Public Catalog' },
      { to: '/kiosk',            icon: '🖥️', label: 'Kiosk Mode' },
    ],
  },
];

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const isMobile = () => window.innerWidth <= 768;
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile());
  const location = useLocation();
  const { dark, toggleTheme } = useTheme();
  const { devMode, getLabel } = useDevMode();

  // Determine which groups should start expanded (based on active route)
  const getInitialOpenGroups = () => {
    const open = {};
    NAV_CONFIG.forEach(item => {
      if (item.children) {
        const hasActive = item.children.some(child =>
          child.to === '/' ? location.pathname === '/' : location.pathname.startsWith(child.to)
        );
        if (hasActive) open[item.key] = true;
      }
    });
    return open;
  };

  const [openGroups, setOpenGroups] = useState(getInitialOpenGroups);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile()) {
      setSidebarOpen(false);
    }
    // Auto-expand group containing the active route
    setOpenGroups(prev => {
      const next = { ...prev };
      NAV_CONFIG.forEach(item => {
        if (item.children) {
          const hasActive = item.children.some(child =>
            child.to === '/' ? location.pathname === '/' : location.pathname.startsWith(child.to)
          );
          if (hasActive) next[item.key] = true;
        }
      });
      return next;
    });
  }, [location.pathname]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  const toggleGroup = (key) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isGroupActive = (item) => {
    if (!item.children) return false;
    return item.children.some(child => isActive(child.to));
  };

  return (
    <div className="app-container">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-left">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle sidebar">
            ☰
          </button>
          <h1 className="app-title"><Editable id="app_title">📚 Tapas Reading Cafe</Editable></h1>
        </div>
        <div className="navbar-right">
          <NotificationBell />
          <button onClick={toggleTheme} className="menu-toggle" title={dark ? 'Light mode' : 'Dark mode'} style={{ fontSize: '18px' }}>
            {dark ? '☀️' : '🌙'}
          </button>
          <span className="user-info">👤 Admin</span>
        </div>
      </nav>

      {/* SIDEBAR OVERLAY (mobile only) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <nav className="sidebar-nav">
          {NAV_CONFIG.map((item, idx) =>
            item.children ? (
              <div key={item.key} className="nav-group">
                <button
                  className={`nav-group-header ${isGroupActive(item) ? 'has-active' : ''}`}
                  onClick={() => toggleGroup(item.key)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label"><Editable id={`nav_${item.key}`}>{item.label}</Editable></span>
                  <span className={`nav-chevron ${openGroups[item.key] ? 'open' : ''}`}>›</span>
                </button>
                <div className={`nav-group-children ${openGroups[item.key] ? 'expanded' : 'collapsed'}`}>
                  {item.children.map(child => (
                    <HintBubble key={child.to} path={child.to}>
                      <Link
                        to={child.to}
                        className={`nav-link nav-link-child ${isActive(child.to) ? 'active' : ''}`}
                      >
                        <span className="nav-icon">{child.icon}</span>
                        <span className="nav-label"><Editable id={`nav_${child.to}`}>{child.label}</Editable></span>
                      </Link>
                    </HintBubble>
                  ))}
                </div>
              </div>
            ) : (
              <HintBubble key={item.to} path={item.to}>
                <Link
                  to={item.to}
                  className={`nav-link ${isActive(item.to) ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label"><Editable id={`nav_${item.to}`}>{item.label}</Editable></span>
                </Link>
              </HintBubble>
            )
          )}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className={`main-content ${sidebarOpen ? 'expanded' : 'full'}`}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Dashboard */}
            <Route path="/"                                   element={<Dashboard />} />

            {/* Library */}
            <Route path="/books"                              element={<Books />} />
            <Route path="/books/:bookId/copies"                 element={<BookCopies />} />
            <Route path="/Borrow"                             element={<Borrow />} />
            <Route path="/overdue"                            element={<OverdueBooks />} />
            <Route path="/availability"                       element={<BookAvailability />} />
            <Route path="/statistics"                         element={<BorrowStatistics />} />
            <Route path="/recommendations"                    element={<Recommendations />} />
            <Route path="/wishlist"                           element={<Wishlist />} />
            <Route path="/reviews"                            element={<Reviews />} />
            <Route path="/reservations"                       element={<Reservations />} />
            <Route path="/pos"                                element={<POS />} />

            {/* Cafe */}
            <Route path="/cafe/menu"                          element={<CafePOS />} />
            <Route path="/cafe/manage"                        element={<CafeMenu />} />
            <Route path="/cafe/orders"                        element={<CafeOrders />} />
            <Route path="/cafe/reports"                       element={<CafeReports />} />

            {/* Members */}
            <Route path="/members"                            element={<Members />} />
            <Route path="/fines"                              element={<Fines />} />
            <Route path="/member/:memberId"                   element={<MemberProfile />} />
            <Route path="/member/:memberId/child/:childId"    element={<ChildProfile />} />

            {/* Inventory */}
            <Route path="/inventory/library"                  element={<InventoryLibrary />} />
            <Route path="/inventory/cafe"                     element={<InventoryCafe />} />

            {/* Events */}
            <Route path="/events"                             element={<EventListing />} />
            <Route path="/events/create"                      element={<EventCreate />} />
            <Route path="/events/attendance"                  element={<EventAttendance />} />

            {/* Reports */}
            <Route path="/reports"                            element={<Reports />} />

            {/* Accounts */}
            <Route path="/accounts/overview"                  element={<AccountsOverview />} />
            <Route path="/accounts/transactions"              element={<AccountsTransactions />} />
            <Route path="/accounts/expenses"                  element={<AccountsExpenses />} />

            {/* Staff */}
            <Route path="/staff"                              element={<StaffManagement />} />

            {/* Vendors */}
            <Route path="/vendors"                            element={<VendorList />} />
            <Route path="/vendors/orders"                     element={<PurchaseOrders />} />

            {/* Settings */}
            <Route path="/settings/app"                       element={<SettingsApp />} />
            <Route path="/settings/profile"                   element={<SettingsProfile />} />
            <Route path="/settings/activity"                  element={<ActivityLog />} />
            <Route path="/settings/devices"                  element={<DeviceManager />} />

            {/* Public & Kiosk */}
            <Route path="/catalog"                            element={<PublicCatalog />} />
            <Route path="/kiosk"                              element={<KioskMode />} />
          </Routes>
        </Suspense>
      </main>
      <GlobalTooltip />
    </div>
  );
}

export default App;
