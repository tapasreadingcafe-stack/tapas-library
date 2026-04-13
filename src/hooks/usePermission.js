import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPermissionForPath, getStaffPermission } from '../utils/permissions';

export function usePermission() {
  const { staff } = useAuth();
  const location = useLocation();
  const permKey = getPermissionForPath(location.pathname);
  const level = getStaffPermission(staff, permKey);
  const features = staff?.permissions?.features || {};

  // Feature toggle helper — returns false if toggle is explicitly off
  const can = (featureKey) => {
    if (staff?.role === 'admin') return true;
    return features[featureKey] !== false;
  };

  return {
    level,
    isReadOnly: level === 'view',
    canEdit: level === 'full',
    can,
    // Convenience accessors for feature toggles
    canDeleteBooks: can('can_delete_books'),
    canExportData: can('can_export_data'),
    canManageMembers: can('can_manage_members'),
    canProcessFines: can('can_process_fines'),
    canManageInventory: can('can_manage_inventory'),
    canManageStaff: can('can_manage_staff'),
    canAccessReports: can('can_access_reports'),
    canManageEvents: can('can_manage_events'),
    canManageCafeMenu: can('can_manage_cafe_menu'),
    canManageVendors: can('can_manage_vendors'),
    canManageReservations: can('can_manage_reservations'),
    canProcessOrders: can('can_process_orders'),
  };
}
