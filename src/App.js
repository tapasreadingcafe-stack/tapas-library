import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { HintBubble } from './components/HintTooltip';
import { supabase } from './utils/supabase';
import GlobalTooltip from './components/GlobalTooltip';
import { useTheme } from './components/ThemeProvider';
import { useDevMode, Editable } from './components/DevMode';
import { useAuth } from './context/AuthContext';
import NotificationBell from './components/NotificationBell';
import { ROUTE_PERMISSION_MAP, STAFF_DEFAULT_PERMISSIONS, getPermissionForPath, getStaffPermission } from './utils/permissions';
import Login from './pages/Login';
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
const AccountsPnL           = React.lazy(() => import('./pages/AccountsPnL'));
const AccountsInvoices      = React.lazy(() => import('./pages/AccountsInvoices'));
const AccountsMemberPayments = React.lazy(() => import('./pages/AccountsMemberPayments'));
const AccountsVendorPayments = React.lazy(() => import('./pages/AccountsVendorPayments'));
const SettingsApp           = React.lazy(() => import('./pages/SettingsApp'));
const SettingsProfile       = React.lazy(() => import('./pages/SettingsProfile'));
const SettingsHealth        = React.lazy(() => import('./pages/SettingsHealth'));
const ActivityLog           = React.lazy(() => import('./pages/ActivityLog'));
const StaffDetail           = React.lazy(() => import('./pages/StaffDetail'));
const PublicCatalog         = React.lazy(() => import('./pages/PublicCatalog'));
const BookCopies            = React.lazy(() => import('./pages/BookCopies'));
const BarcodeManager        = React.lazy(() => import('./pages/BarcodeManager'));
const BarcodeEditor         = React.lazy(() => import('./pages/BarcodeEditor'));
const DeviceManager         = React.lazy(() => import('./pages/DeviceManager'));
const KioskMode             = React.lazy(() => import('./pages/KioskMode'));

// ── Lazy-loaded pages (New - Phase 5: Online Store) ─────────────────────────
const CustomerOrders        = React.lazy(() => import('./pages/CustomerOrders'));
const SiteContent           = React.lazy(() => import('./pages/SiteContent'));

// ── Lazy-loaded pages (New - Phase 6: Productivity + Marketing) ─────────────
const Tasks                 = React.lazy(() => import('./pages/Tasks'));
const MarketingTools        = React.lazy(() => import('./pages/MarketingTools'));
const PromoCodes            = React.lazy(() => import('./pages/PromoCodes'));
const MarketingHub          = React.lazy(() => import('./pages/MarketingHub'));
const LoyaltySystem         = React.lazy(() => import('./pages/LoyaltySystem'));
const GrowthTools           = React.lazy(() => import('./pages/GrowthTools'));
const CampaignTools         = React.lazy(() => import('./pages/CampaignTools'));
const Automations           = React.lazy(() => import('./pages/Automations'));
const EngagementTools       = React.lazy(() => import('./pages/EngagementTools'));
const MarketingDashboard    = React.lazy(() => import('./pages/MarketingDashboard'));
const Newsletter            = React.lazy(() => import('./pages/Newsletter'));
const Communications        = React.lazy(() => import('./pages/Communications'));
const CommunityBlog         = React.lazy(() => import('./pages/CommunityBlog'));
const AdvancedTools         = React.lazy(() => import('./pages/AdvancedTools'));
const Integrations          = React.lazy(() => import('./pages/Integrations'));

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

// ── Error boundary for chunk-load failures ─────────────────────────────────────
// After a deploy, old cached JS chunks may 404. When React.lazy() fails to fetch
// a chunk, Suspense can't recover — the page stays on the loading spinner forever.
// This error boundary catches the load failure and offers a one-click hard refresh.
class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    // Only treat chunk load failures as version errors
    const isChunkError = error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('dynamically imported module');
    return { hasError: isChunkError };
  }
  handleRefresh = () => {
    // Mark that we already tried refreshing to prevent infinite loop
    const key = 'tapas_chunk_refresh';
    const lastRefresh = sessionStorage.getItem(key);
    const now = Date.now();
    // If we refreshed less than 10 seconds ago, don't loop
    if (lastRefresh && now - parseInt(lastRefresh, 10) < 10000) {
      // Force clear caches and do a full navigation instead of reload
      if ('caches' in window) {
        caches.keys().then(names => names.forEach(n => caches.delete(n)));
      }
      window.location.href = window.location.pathname + '?v=' + now;
      return;
    }
    sessionStorage.setItem(key, now.toString());
    window.location.reload();
  };
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '60vh', gap: '16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px' }}>🔄</div>
          <h3 style={{ margin: 0, color: '#333', fontSize: '18px' }}>New version available</h3>
          <p style={{ color: '#888', fontSize: '14px', maxWidth: '360px' }}>
            The dashboard was updated. Please refresh to load the latest version.
          </p>
          <button
            onClick={this.handleRefresh}
            style={{
              padding: '10px 24px', background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white', border: 'none', borderRadius: '8px',
              cursor: 'pointer', fontWeight: '700', fontSize: '14px',
            }}
          >
            Refresh now
          </button>
        </div>
      );
    }
    return this.props.children;
  }
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
      { to: '/barcodes',         icon: '🏷️', label: 'Barcodes' },
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
    icon: '🛒', label: 'Online Store', key: 'store',
    children: [
      { to: '/store/orders',  icon: '📦', label: 'Online Orders' },
      { to: '/store/content', icon: '🎨', label: 'Edit Website' },
    ],
  },
  {
    icon: '📣', label: 'Marketing', key: 'marketing',
    children: [
      { to: '/marketing-dashboard', icon: '📊', label: 'Overview' },
      { to: '/promo-codes',    icon: '🏷️', label: 'Promo Codes' },
      { to: '/loyalty',        icon: '🏆', label: 'Loyalty & Rewards' },
      { to: '/growth',         icon: '🌱', label: 'Growth Tools' },
      { to: '/campaigns',      icon: '📢', label: 'Campaigns' },
      { to: '/automations',    icon: '⚡', label: 'Automations' },
      { to: '/engagement',     icon: '💬', label: 'Engagement' },
      { to: '/newsletter',     icon: '✉️', label: 'Newsletter' },
      { to: '/communications', icon: '📲', label: 'Communications' },
      { to: '/community',      icon: '👥', label: 'Community & Blog' },
      { to: '/advanced-tools', icon: '🧪', label: 'Advanced Tools' },
      { to: '/integrations',   icon: '🔌', label: 'Integrations' },
      { to: '/marketing-hub',  icon: '🔧', label: 'Marketing Hub' },
      { to: '/marketing',      icon: '💡', label: 'Ideas Board' },
    ],
  },
  { to: '/tasks', icon: '📒', label: 'Tasks & Notes' },
  {
    icon: '💳', label: 'Accounts', key: 'accounts',
    children: [
      { to: '/accounts/overview',         icon: '📊', label: 'Overview' },
      { to: '/accounts/pnl',              icon: '📑', label: 'P&L Statement' },
      { to: '/accounts/transactions',     icon: '💸', label: 'Transactions' },
      { to: '/accounts/invoices',         icon: '🧾', label: 'Invoices' },
      { to: '/accounts/expenses',         icon: '📤', label: 'Expenses' },
      { to: '/accounts/member-payments',  icon: '💳', label: 'Member Payments' },
      { to: '/accounts/vendor-payments',  icon: '🏪', label: 'Vendor Payments' },
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
      { to: '/settings/health',  icon: '🩺', label: 'System Health' },
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
//
// Top-level component is a *thin* auth gate. All dashboard state/hooks live
// inside <DashboardShell /> so we never hit the React "different number of
// hooks between renders" error when the auth state flips. When the gate
// returns Login, DashboardShell is unmounted and ALL its hooks go with it —
// that's the only safe way to mix conditional returns with stateful children.

function App() {
  const { user, staff, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '16px',
        background: '#0f172a', color: '#e2e8f0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <div style={{ fontSize: '48px', animation: 'pulse 1.4s ease-in-out infinite' }}>📚</div>
        <div style={{ fontSize: '14px', color: '#94a3b8' }}>Loading Tapas dashboard…</div>
        <style>{`
          @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.1);opacity:0.75} }
        `}</style>
      </div>
    );
  }

  if (!user || !staff || staff._not_staff || staff._deactivated || staff._error) {
    // Debug: show what the gate sees so the user can report it
    const debugInfo = `user: ${user ? 'yes' : 'no'} | staff: ${staff ? (staff._not_staff ? 'NOT_STAFF' : staff._deactivated ? 'DEACTIVATED' : staff._error ? 'ERROR: ' + staff._error : staff.name || 'loaded') : 'null'}`;
    return <Login staffStatus={staff} debugInfo={debugInfo} />;
  }

  return <DashboardShell />;
}

// ── DashboardShell — the real app UI once the staff member is signed in ────

function ProfileDropdown() {
  const { staff, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const name = staff?.name || 'Staff';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const isAdmin = staff?.role === 'admin';
  // Admin = gold, Staff = blue
  const avatarBg = isAdmin
    ? 'linear-gradient(135deg, #D4A853, #C49040)'
    : 'linear-gradient(135deg, #667eea, #764ba2)';
  const avatarColor = isAdmin ? '#1a0f08' : '#ffffff';

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,255,255,0.1)', border: 'none',
          borderRadius: '20px', padding: '4px 12px 4px 4px',
          cursor: 'pointer', color: 'white', fontSize: '13px', fontWeight: '600',
        }}
      >
        <span style={{
          width: '28px', height: '28px', borderRadius: '50%',
          background: avatarBg,
          color: avatarColor, fontSize: '11px', fontWeight: '800',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{initials}</span>
        {name.split(' ')[0]}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
          <div style={{
            position: 'absolute', top: '40px', right: 0, zIndex: 100,
            background: 'white', borderRadius: '10px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
            padding: '8px', width: '200px',
          }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #eee', marginBottom: '4px' }}>
              <div style={{ fontWeight: '700', color: '#333', fontSize: '13px' }}>{name}</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{staff?.email}</div>
              <div style={{
                fontSize: '10px', fontWeight: '600', marginTop: '4px', textTransform: 'uppercase',
                display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                background: isAdmin ? '#fef3c7' : '#dbeafe',
                color: isAdmin ? '#92400e' : '#1e40af',
              }}>{staff?.role}</div>
            </div>
            <a href="/settings/profile" style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 12px', borderRadius: '6px', textDecoration: 'none',
              color: '#333', fontSize: '13px',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              👤 My Profile
            </a>
            {isAdmin && (
              <a href="/settings/app" style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px', borderRadius: '6px', textDecoration: 'none',
                color: '#333', fontSize: '13px',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                ⚙️ Settings
              </a>
            )}
            <button onClick={() => { setOpen(false); logout(); }} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 12px', borderRadius: '6px', width: '100%',
              border: 'none', background: 'transparent', textAlign: 'left',
              color: '#e74c3c', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              🚪 Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Permission functions imported from src/utils/permissions.js

function PermissionGate({ children }) {
  const { staff } = useAuth();
  const location = useLocation();

  if (staff?.role === 'admin') return children;

  const needed = getPermissionForPath(location.pathname);
  const level = getStaffPermission(staff, needed);

  if (level === 'none') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '56px' }}>🔒</div>
        <h2 style={{ margin: 0, color: '#333', fontSize: '22px' }}>Access restricted</h2>
        <p style={{ color: '#888', fontSize: '14px', maxWidth: '360px' }}>
          You don't have permission to view this page. Contact your admin to update your access level.
        </p>
      </div>
    );
  }

  return children;
}

function SidebarNav({ sidebarOpen, openGroups, toggleGroup, isActive, isGroupActive }) {
  const { staff } = useAuth();
  const { devMode, getLabel } = useDevMode();
  const [moduleToggles, setModuleToggles] = useState({});

  // Load module toggles from app_settings (marketing_enabled, store_enabled, etc.)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('app_settings').select('key, value')
        .in('key', ['cafe_enabled', 'events_enabled', 'marketing_enabled', 'store_enabled']);
      const toggles = {};
      (data || []).forEach(r => { toggles[r.key] = r.value === 'true' || r.value === true; });
      setModuleToggles(toggles);
    })();
  }, []);

  // Map nav group keys to module toggle keys
  const MODULE_TOGGLE_MAP = { cafe: 'cafe_enabled', events: 'events_enabled', marketing: 'marketing_enabled', store: 'store_enabled' };

  // Filter nav items: hide pages where permission = 'none' or module disabled
  const canSee = (routePath) => {
    const permKey = getPermissionForPath(routePath);
    return getStaffPermission(staff, permKey) !== 'none';
  };

  const filteredNav = NAV_CONFIG.map(item => {
    // Hide entire groups if module is disabled in settings
    if (item.key && MODULE_TOGGLE_MAP[item.key]) {
      const toggleKey = MODULE_TOGGLE_MAP[item.key];
      if (toggleKey in moduleToggles && !moduleToggles[toggleKey]) return null;
    }
    if (item.children) {
      const visibleChildren = item.children.filter(child => canSee(child.to));
      if (visibleChildren.length === 0) return null;
      return { ...item, children: visibleChildren };
    }
    return canSee(item.to) ? item : null;
  }).filter(Boolean);

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
      <nav className="sidebar-nav">
        {filteredNav.map((item) =>
          item.children ? (
            <div key={item.key} className="nav-group">
              <button
                className={`nav-group-header ${isGroupActive(item) ? 'has-active' : ''}`}
                onClick={() => toggleGroup(item.key)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label"><Editable id={`nav_${item.key}`}>{devMode ? getLabel(`nav_${item.key}`, item.label) : item.label}</Editable></span>
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
  );
}

function DashboardShell() {
  const isMobile = () => window.innerWidth <= 768;
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile());
  const location = useLocation();
  const { dark, toggleTheme } = useTheme();
  const { staff } = useAuth();
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
          <NotificationBell staffId={staff?.id} />
          <button onClick={toggleTheme} className="menu-toggle" title={dark ? 'Light mode' : 'Dark mode'} style={{ fontSize: '18px' }}>
            {dark ? '☀️' : '🌙'}
          </button>
          <ProfileDropdown />
        </div>
      </nav>

      {/* SIDEBAR OVERLAY (mobile only) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* SIDEBAR — filtered by permissions for non-admin staff */}
      <SidebarNav
        sidebarOpen={sidebarOpen}
        openGroups={openGroups}
        toggleGroup={toggleGroup}
        isActive={isActive}
        isGroupActive={isGroupActive}
      />

      {/* MAIN CONTENT */}
      <main className={`main-content ${sidebarOpen ? 'expanded' : 'full'}`}>
        <ChunkErrorBoundary>
        <PermissionGate>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Dashboard */}
            <Route path="/"                                   element={<Dashboard />} />

            {/* Library */}
            <Route path="/books"                              element={<Books />} />
            <Route path="/books/:bookId/copies"                 element={<BookCopies />} />
            <Route path="/barcodes"                              element={<BarcodeManager />} />
            <Route path="/barcodes/editor"                       element={<BarcodeEditor />} />
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
            <Route path="/accounts/pnl"                       element={<AccountsPnL />} />
            <Route path="/accounts/transactions"              element={<AccountsTransactions />} />
            <Route path="/accounts/invoices"                  element={<AccountsInvoices />} />
            <Route path="/accounts/expenses"                  element={<AccountsExpenses />} />
            <Route path="/accounts/member-payments"           element={<AccountsMemberPayments />} />
            <Route path="/accounts/vendor-payments"           element={<AccountsVendorPayments />} />

            {/* Staff */}
            <Route path="/staff"                              element={<StaffManagement />} />
            <Route path="/staff/:staffId"                     element={<StaffDetail />} />

            {/* Vendors */}
            <Route path="/vendors"                            element={<VendorList />} />
            <Route path="/vendors/orders"                     element={<PurchaseOrders />} />

            {/* Settings */}
            <Route path="/settings/health"                    element={<SettingsHealth />} />
            <Route path="/settings/app"                       element={<SettingsApp />} />
            <Route path="/settings/profile"                   element={<SettingsProfile />} />
            <Route path="/settings/activity"                  element={<ActivityLog />} />
            <Route path="/settings/devices"                  element={<DeviceManager />} />

            {/* Online Store */}
            <Route path="/store/orders"                       element={<CustomerOrders />} />
            <Route path="/store/content"                      element={<SiteContent />} />

            {/* Marketing */}
            <Route path="/marketing-dashboard"                element={<MarketingDashboard />} />
            <Route path="/promo-codes"                        element={<PromoCodes />} />
            <Route path="/loyalty"                            element={<LoyaltySystem />} />
            <Route path="/growth"                             element={<GrowthTools />} />
            <Route path="/campaigns"                          element={<CampaignTools />} />
            <Route path="/automations"                        element={<Automations />} />
            <Route path="/engagement"                         element={<EngagementTools />} />
            <Route path="/newsletter"                         element={<Newsletter />} />
            <Route path="/communications"                     element={<Communications />} />
            <Route path="/community"                          element={<CommunityBlog />} />
            <Route path="/advanced-tools"                     element={<AdvancedTools />} />
            <Route path="/integrations"                        element={<Integrations />} />
            <Route path="/marketing-hub"                      element={<MarketingHub />} />
            <Route path="/marketing"                          element={<MarketingTools />} />

            {/* Productivity */}
            <Route path="/tasks"                              element={<Tasks />} />

            {/* Public & Kiosk */}
            <Route path="/catalog"                            element={<PublicCatalog />} />
            <Route path="/kiosk"                              element={<KioskMode />} />
          </Routes>
        </Suspense>
        </PermissionGate>
        </ChunkErrorBoundary>
      </main>
      <GlobalTooltip />
    </div>
  );
}

export default App;
