// RBAC Middleware for Express with Supabase Integration
// Simplified version for Express backend only

const { createClient } = require('@supabase/supabase-js');

// Role hierarchy for permission checking
const ROLE_HIERARCHY = {
  user: 0,
  manager: 1,
  admin: 2
};

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for server-side operations
);

/**
 * Extract JWT token from request headers or cookies
 */
function extractToken(req) {
  // Try Authorization header first (Bearer token)
  const authHeader = req.headers.authorization;
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
async function loadUserProfile(userId) {
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
      role: profile.role,
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
function hasRequiredRole(userRole, minRole) {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

/**
 * Core authentication middleware
 */
async function authenticateUser(token) {
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
function requireRole(minRole = 'user') {
  return async (req, res, next) => {
    try {
      // Extract token from request
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ 
          error: 'unauthorized', 
          message: 'No access token provided' 
        });
      }

      // Authenticate user and load profile
      const user = await authenticateUser(token);
      if (!user) {
        return res.status(401).json({ 
          error: 'unauthorized', 
          message: 'Invalid or expired token' 
        });
      }

      // Check role permissions
      if (!hasRequiredRole(user.role, minRole)) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: `Requires ${minRole} role or higher, but user has ${user.role} role` 
        });
      }

      // Attach user to request object
      req.user = user;
      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      return res.status(500).json({ 
        error: 'internal_server_error', 
        message: 'Authentication failed' 
      });
    }
  };
}

/**
 * Utility function to get authenticated user from request
 */
function getAuthenticatedUser(req) {
  return req.user || null;
}

/**
 * Helper function to check if user can access specific business data
 */
function canAccessBusiness(user, targetBusinessId) {
  return user.businessId === targetBusinessId;
}

// =====================================================
// EXPORTED HELPER MIDDLEWARES
// =====================================================

/**
 * Require admin role
 */
const requireAdmin = requireRole('admin');

/**
 * Require manager role or higher
 */
const requireManager = requireRole('manager');

/**
 * Require any authenticated user
 */
const requireUser = requireRole('user');

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  requireRole,
  requireAdmin,
  requireManager,
  requireUser,
  getAuthenticatedUser,
  canAccessBusiness,
  // Internal utilities (exported for testing)
  extractToken,
  loadUserProfile,
  hasRequiredRole,
  authenticateUser
};

// =====================================================
// USAGE EXAMPLES
// =====================================================

/*
// Express Usage Examples:

const express = require('express');
const { 
  requireRole, 
  requireAdmin, 
  requireManager, 
  requireUser, 
  getAuthenticatedUser,
  canAccessBusiness 
} = require('./rbac-middleware');

const app = express();

// Parse cookies middleware (required for cookie token extraction)
app.use(require('cookie-parser')());

// Protect route with admin role
app.get('/api/admin/users', requireAdmin, (req, res) => {
  const user = getAuthenticatedUser(req);
  console.log('Admin user:', user);
  res.json({ message: 'Admin access granted', user });
});

// Protect route with manager or admin role
app.post('/api/invoices', requireManager, (req, res) => {
  const user = getAuthenticatedUser(req);
  console.log('Manager+ user:', user);
  
  // Example: Create invoice with business_id validation
  res.json({ 
    message: 'Invoice created', 
    businessId: user.businessId 
  });
});

// Protect route with any authenticated user
app.get('/api/profile', requireUser, (req, res) => {
  const user = getAuthenticatedUser(req);
  res.json({ user });
});

// Custom role requirement
app.delete('/api/customers/:id', requireRole('admin'), (req, res) => {
  const user = getAuthenticatedUser(req);
  console.log('Deleting customer, admin user:', user);
  res.json({ message: 'Customer deleted' });
});

// Business-specific data access with additional validation
app.get('/api/invoices/:businessId', requireUser, (req, res) => {
  const user = getAuthenticatedUser(req);
  const targetBusinessId = req.params.businessId;
  
  // Additional business access check
  if (!canAccessBusiness(user, targetBusinessId)) {
    return res.status(403).json({ 
      error: 'forbidden', 
      message: 'Cannot access data from different business' 
    });
  }
  
  res.json({ 
    message: 'Invoices retrieved', 
    businessId: targetBusinessId 
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Application error:', error);
  res.status(500).json({ 
    error: 'internal_server_error', 
    message: 'Something went wrong' 
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
*/

/*
// Required Environment Variables:
// NEXT_PUBLIC_SUPABASE_URL=your_supabase_url (or SUPABASE_URL)
// SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

// Required Dependencies:
// npm install @supabase/supabase-js cookie-parser

// Frontend Token Setup:
// The frontend should send the Supabase session token either as:
// 1. Authorization header: "Bearer <token>"
// 2. Cookie named "sb-access-token"

// Example frontend code to set token:
// 
// // Get token from Supabase session
// const { data: { session } } = await supabase.auth.getSession();
// const token = session?.access_token;
// 
// // Option 1: Send as Authorization header
// fetch('/api/invoices', {
//   headers: {
//     'Authorization': `Bearer ${token}`,
//     'Content-Type': 'application/json'
//   }
// });
// 
// // Option 2: Set as cookie (automatic with subsequent requests)
// document.cookie = `sb-access-token=${token}; path=/; secure; samesite=strict`;
*/
