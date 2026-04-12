import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPermissionForPath, getStaffPermission } from '../utils/permissions';

export function usePermission() {
  const { staff } = useAuth();
  const location = useLocation();
  const permKey = getPermissionForPath(location.pathname);
  const level = getStaffPermission(staff, permKey);
  return {
    level,
    isReadOnly: level === 'view',
    canEdit: level === 'full',
  };
}
