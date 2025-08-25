// RBAC Middleware for Express with TypeScript and Supabase Integration
// This middleware enforces role-based access control using the multi-tenant RBAC system

import { createClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';

// Types
export interface AuthenticatedUser {
  id: string;
  role: 'user' | 'manager' | 'admin';
  businessId: string;
  email?: string;
  fullName?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

// Role hierarchy for permission checking
const ROLE_HIERARCHY = {
  user: 0,
  manager: 1,
  admin: 2
} as const;

type RoleType = keyof typeof ROLE_HIERARCHY;

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for server-side operations
);

/**
 * Extract JWT token from request headers or cookies
 */
function extractToken(req: Request): string | null {
  // Try Authorization header first (Bearer token)
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try cookies as fallback
  const cookies = req.cookies?.['sb-access-token'];
  return cookies || null;
}

/**
 * Load user profile from Supabase including role and business_id
 */
async function loadUserProfile(userId: string): Promise<AuthenticatedUser | null> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, role, business_id, email, full_name')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.error('Failed to load user profile:', error);
      return null;
    }

    // Validate required fields
    if (!profile.role || !profile.business_id) {
      console.error('User profile missing required fields (role or business_id)');
      return null;
    }

    return {
      id: profile.id,
      role: profile.role as RoleType,
      businessId: profile.business_id,
      email: profile.email,
      fullName: profile.full_name
    };
  } catch (error) {
    console.error('Error loading user profile:', error);
    return null;
  }
}

/**
 * Check if user role meets minimum required role
 */
function hasRequiredRole(userRole: RoleType, minRole: RoleType): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

/**
 * Core authentication middleware
 */
async function authenticateUser(token: string): Promise<AuthenticatedUser | null> {
  try {
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Token verification failed:', error);
      return null;
    }

    // Load user profile with role and business info
    const profile = await loadUserProfile(user.id);
    if (!profile) {
      console.error('Failed to load user profile for user:', user.id);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * Express middleware factory for role-based access control
 */
export function requireRole(minRole: RoleType = 'user') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract token from request
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: 'unauthorized', message: 'No access token provided' });
      }

      // Authenticate user and load profile
      const user = await authenticateUser(token);
      if (!user) {
        return res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
      }

      // Check role permissions
      if (!hasRequiredRole(user.role, minRole)) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: `Requires ${minRole} role or higher, but user has ${user.role} role` 
        });
      }

      // Attach user to request object
      (req as AuthenticatedRequest).user = user;
      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      return res.status(500).json({ error: 'internal_server_error', message: 'Authentication failed' });
    }
  };
}

/**
 * Next.js middleware factory for role-based access control
 * Note: Requires Next.js dependencies to be installed
 */
// export function requireRoleNext(minRole: RoleType = 'user') {
//   // Implementation removed - install Next.js dependencies if needed
// }

/**
 * Utility function to get authenticated user from request
 * Use this in your API routes to access the authenticated user
 */
export function getAuthenticatedUser(req: Request): AuthenticatedUser | null {
  return (req as AuthenticatedRequest).user || null;
}

/**
 * Helper function to check if user can access specific business data
 * Use this for additional business-level authorization
 */
export function canAccessBusiness(user: AuthenticatedUser, targetBusinessId: string): boolean {
  return user.businessId === targetBusinessId;
}

// =====================================================
// EXPORTED HELPER MIDDLEWARES
// =====================================================

/**
 * Require admin role (Express)
 */
export const requireAdmin = requireRole('admin');

/**
 * Require manager role or higher (Express)
 */
export const requireManager = requireRole('manager');

/**
 * Require any authenticated user (Express)
 */
export const requireUser = requireRole('user');

// Next.js helpers removed - use the .js version or install Next.js dependencies

// =====================================================
// USAGE EXAMPLES
// =====================================================

/*
// Express Usage Examples:

import express from 'express';
import { requireRole, requireAdmin, requireManager, requireUser, getAuthenticatedUser } from './rbac-middleware';

const app = express();

// Protect route with specific role
app.get('/api/admin/users', requireAdmin, (req, res) => {
  const user = getAuthenticatedUser(req);
  console.log('Admin user:', user);
  res.json({ message: 'Admin access granted' });
});

// Protect route with manager or admin role
app.post('/api/invoices', requireManager, (req, res) => {
  const user = getAuthenticatedUser(req);
  console.log('Manager+ user:', user);
  res.json({ message: 'Invoice created' });
});

// Protect route with any authenticated user
app.get('/api/profile', requireUser, (req, res) => {
  const user = getAuthenticatedUser(req);
  res.json({ user });
});

// Custom role requirement
app.delete('/api/data', requireRole('admin'), (req, res) => {
  res.json({ message: 'Data deleted' });
});
*/

/*
// Environment Variables Required:
// NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
// SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

// Required Dependencies:
// npm install @supabase/supabase-js cookie-parser express
// npm install -D @types/express @types/cookie-parser
*/
