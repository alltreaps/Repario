import { useCurrentUser } from '../contexts/SessionContext';
import { can as checkPermission, type Role, type Ability } from '../lib/permissions';

export interface UsePermissionsReturn {
  can: (ability: Ability) => boolean;
  role: Role | null;
  isLoading: boolean;
}

/**
 * Hook for checking user permissions based on their role
 * Uses the existing session context to get user role
 */
export function usePermissions(): UsePermissionsReturn {
  const { profile, isLoading } = useCurrentUser();
  
  const userRole = profile?.role || null;
  
  const can = (ability: Ability): boolean => {
    if (!userRole) return false;
    return checkPermission(userRole, ability);
  };
  
  return {
    can,
    role: userRole,
    isLoading
  };
}
