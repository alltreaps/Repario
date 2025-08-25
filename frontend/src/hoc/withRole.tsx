import { type ComponentType } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { type Role } from '../lib/permissions';

interface WithRoleOptions {
  /** Fallback component to render when user lacks required role */
  fallback?: ComponentType;
  /** Redirect path when user lacks required role */
  redirectTo?: string;
  /** Custom loading component */
  loadingComponent?: ComponentType;
}

/**
 * Higher-Order Component for role-based page protection
 * Checks if user has minimum required role level
 * 
 * @param minRole - Minimum role required to access the component
 * @param options - Additional configuration options
 * @returns HOC that wraps the component with role protection
 * 
 * @example
 * const UserManagementPage = withRole('manager')(UserManagementPageComponent);
 * 
 * @example
 * const AdminSettingsPage = withRole('admin', {
 *   fallback: UnauthorizedPage,
 *   redirectTo: '/dashboard'
 * })(AdminSettingsPageComponent);
 */
export function withRole<P extends object>(
  minRole: Role,
  options: WithRoleOptions = {}
) {
  return function withRoleHOC(WrappedComponent: ComponentType<P>) {
    const WithRoleComponent = (props: P) => {
      const { role, isLoading } = usePermissions();
      const { 
        fallback: FallbackComponent = DefaultUnauthorized,
        loadingComponent: LoadingComponent = DefaultLoading,
        redirectTo 
      } = options;

      // Show loading while checking authentication
      if (isLoading) {
        return <LoadingComponent />;
      }

      // Check if user has required role level
      if (!role || !hasRoleLevel(role, minRole)) {
        // Handle redirect if specified
        if (redirectTo && typeof window !== 'undefined') {
          window.location.href = redirectTo;
          return <LoadingComponent />;
        }
        
        return <FallbackComponent requiredRole={minRole} userRole={role} />;
      }

      // User has required role - render the protected component
      return <WrappedComponent {...props} />;
    };

    // Set display name for debugging
    WithRoleComponent.displayName = `withRole(${minRole})(${
      WrappedComponent.displayName || WrappedComponent.name || 'Component'
    })`;

    return WithRoleComponent;
  };
}

/**
 * Check if user role meets minimum required role level
 * @param userRole - Current user's role
 * @param requiredRole - Minimum required role
 * @returns true if user role is sufficient
 */
function hasRoleLevel(userRole: Role, requiredRole: Role): boolean {
  const roleHierarchy: Record<Role, number> = {
    user: 0,
    manager: 1,
    admin: 2
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Default loading component
 */
function DefaultLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <span className="ml-3 text-gray-600">Loading...</span>
    </div>
  );
}

/**
 * Default unauthorized component
 */
interface DefaultUnauthorizedProps {
  requiredRole: Role;
  userRole: Role | null;
}

function DefaultUnauthorized({ requiredRole, userRole }: DefaultUnauthorizedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-6">
          <svg 
            className="mx-auto h-16 w-16 text-red-500" 
            fill="none" 
            strokeWidth="1.5" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" 
            />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Access Denied
        </h2>
        
        <p className="text-gray-600 mb-6">
          You need <span className="font-semibold text-red-600">{requiredRole}</span> role 
          or higher to access this page.
          {userRole && (
            <>
              <br />
              Your current role: <span className="font-semibold">{userRole}</span>
            </>
          )}
        </p>
        
        <button
          onClick={() => window.history.back()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

/**
 * Convenience HOCs for specific roles
 */
export const withAdmin = (options?: WithRoleOptions) => withRole('admin', options);
export const withManager = (options?: WithRoleOptions) => withRole('manager', options);
export const withUser = (options?: WithRoleOptions) => withRole('user', options);

/**
 * Hook version for programmatic role checking in components
 * @param minRole - Minimum required role
 * @returns object with hasAccess boolean and user role
 */
export function useRequireRole(minRole: Role) {
  const { role, isLoading } = usePermissions();
  
  const hasAccess = role ? hasRoleLevel(role, minRole) : false;
  
  return {
    hasAccess,
    isLoading,
    userRole: role,
    requiredRole: minRole
  };
}
