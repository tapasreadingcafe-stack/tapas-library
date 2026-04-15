// Permission functions shared between App.js (route gating) and page components (view-only mode)

// Map routes to permission keys (from StaffDetail.js PAGE_PERMISSIONS)
export const ROUTE_PERMISSION_MAP = {
  '/': 'dashboard',
  '/books': 'books', '/books/': 'books',
  '/Borrow': 'borrow', '/overdue': 'borrow', '/availability': 'books', '/statistics': 'books',
  '/recommendations': 'books', '/wishlist': 'books', '/reviews': 'books', '/reservations': 'borrow',
  '/pos': 'pos',
  '/barcodes': 'books',
  '/cafe': 'cafe',
  '/members': 'members', '/fines': 'fines', '/member/': 'members',
  '/inventory': 'inventory',
  '/events': 'events',
  '/reports': 'reports',
  '/accounts': 'accounts',
  '/staff': 'staff',
  '/vendors': 'vendors',
  '/settings': 'settings',
  '/store': 'store', '/marketing': 'marketing', '/promo-codes': 'marketing',
  '/loyalty': 'marketing', '/growth': 'marketing', '/campaigns': 'marketing',
  '/automations': 'marketing', '/engagement': 'marketing', '/newsletter': 'marketing',
  '/communications': 'marketing', '/community': 'marketing', '/advanced-tools': 'marketing',
  '/integrations': 'marketing', '/marketing-hub': 'marketing', '/marketing-dashboard': 'marketing',
  '/tasks': 'dashboard',
  '/cafe/manage': 'cafe', '/cafe/orders': 'cafe', '/cafe/reports': 'cafe',
  '/inventory/library': 'inventory', '/inventory/cafe': 'inventory',
  '/settings/health': 'settings', '/settings/profile': 'dashboard',
  '/settings/activity': 'settings', '/settings/devices': 'settings',
  '/catalog': 'dashboard', '/kiosk': 'dashboard',
};

// Default permissions for staff role (non-admin)
export const STAFF_DEFAULT_PERMISSIONS = {
  dashboard: 'full',
  books: 'view',
  borrow: 'full',
  members: 'view',
  pos: 'full',
  fines: 'view',
  cafe: 'full',
  events: 'view',
  inventory: 'view',
  reports: 'none',
  accounts: 'none',
  vendors: 'none',
  settings: 'none',
  staff: 'none',
  marketing: 'none',
  store: 'none',
};

export function getPermissionForPath(pathname) {
  // Exact match first
  if (ROUTE_PERMISSION_MAP[pathname]) return ROUTE_PERMISSION_MAP[pathname];
  // Prefix match (skip '/' — it would match everything)
  for (const [prefix, perm] of Object.entries(ROUTE_PERMISSION_MAP)) {
    if (prefix === '/') continue;
    if (prefix.endsWith('/') && pathname.startsWith(prefix)) return perm;
    if (pathname.startsWith(prefix + '/')) return perm;
  }
  return 'dashboard'; // default
}

export function getStaffPermission(staff, permKey) {
  if (staff?.role === 'admin') return 'full';
  const perms = staff?.permissions || {};
  // Explicit permission wins. Otherwise use staff defaults.
  if (perms[permKey]) return perms[permKey];
  return STAFF_DEFAULT_PERMISSIONS[permKey] || 'full';
}
