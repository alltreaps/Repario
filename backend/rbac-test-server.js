// Simple test script for RBAC middleware functionality
// This tests the middleware logic without requiring Supabase connection

const express = require('express');

// Mock the middleware functions for testing
function createMockMiddleware() {
  // Mock user data for testing
  const mockUsers = {
    'admin-token': { id: '1', role: 'admin', businessId: 'biz-1', fullName: 'Admin User' },
    'manager-token': { id: '2', role: 'manager', businessId: 'biz-1', fullName: 'Manager User' },
    'user-token': { id: '3', role: 'user', businessId: 'biz-1', fullName: 'Regular User' }
  };

  // Role hierarchy
  const ROLE_HIERARCHY = { user: 0, manager: 1, admin: 2 };

  function hasRequiredRole(userRole, minRole) {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
  }

  function requireRole(minRole = 'user') {
    return (req, res, next) => {
      const token = req.headers.authorization?.replace('Bearer ', '') || 
                   req.headers['x-test-token']; // For testing
      
      const user = mockUsers[token];
      
      if (!user) {
        return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
      }

      if (!hasRequiredRole(user.role, minRole)) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: `Requires ${minRole} role or higher, but user has ${user.role} role` 
        });
      }

      req.user = user;
      next();
    };
  }

  return {
    requireRole,
    requireAdmin: requireRole('admin'),
    requireManager: requireRole('manager'),
    requireUser: requireRole('user'),
    getAuthenticatedUser: (req) => req.user
  };
}

// Create test server
const app = express();
const { requireAdmin, requireManager, requireUser, getAuthenticatedUser } = createMockMiddleware();

app.use(express.json());

// Test endpoints
app.get('/test/public', (req, res) => {
  res.json({ message: 'Public endpoint - no auth required' });
});

app.get('/test/user', requireUser, (req, res) => {
  const user = getAuthenticatedUser(req);
  res.json({ message: 'User endpoint', user });
});

app.get('/test/manager', requireManager, (req, res) => {
  const user = getAuthenticatedUser(req);
  res.json({ message: 'Manager endpoint', user });
});

app.get('/test/admin', requireAdmin, (req, res) => {
  const user = getAuthenticatedUser(req);
  res.json({ message: 'Admin endpoint', user });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`🧪 RBAC Test Server running on port ${PORT}`);
  console.log('');
  console.log('📋 Test Commands:');
  console.log('');
  console.log('# Public endpoint (no auth)');
  console.log(`curl http://localhost:${PORT}/test/public`);
  console.log('');
  console.log('# User endpoint (any role)');
  console.log(`curl -H "x-test-token: user-token" http://localhost:${PORT}/test/user`);
  console.log(`curl -H "x-test-token: manager-token" http://localhost:${PORT}/test/user`);
  console.log(`curl -H "x-test-token: admin-token" http://localhost:${PORT}/test/user`);
  console.log('');
  console.log('# Manager endpoint (manager+)');
  console.log(`curl -H "x-test-token: user-token" http://localhost:${PORT}/test/manager`);
  console.log(`curl -H "x-test-token: manager-token" http://localhost:${PORT}/test/manager`);
  console.log(`curl -H "x-test-token: admin-token" http://localhost:${PORT}/test/manager`);
  console.log('');
  console.log('# Admin endpoint (admin only)');
  console.log(`curl -H "x-test-token: user-token" http://localhost:${PORT}/test/admin`);
  console.log(`curl -H "x-test-token: manager-token" http://localhost:${PORT}/test/admin`);
  console.log(`curl -H "x-test-token: admin-token" http://localhost:${PORT}/test/admin`);
  console.log('');
  console.log('Expected results:');
  console.log('- user-token: ✅ user, ❌ manager, ❌ admin');
  console.log('- manager-token: ✅ user, ✅ manager, ❌ admin'); 
  console.log('- admin-token: ✅ user, ✅ manager, ✅ admin');
});

module.exports = app;
