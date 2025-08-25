# RBAC Middleware Documentation

## Overview

The RBAC (Role-Based Access Control) middleware provides secure, role-based authentication and authorization for your Express.js backend. It integrates seamlessly with Supabase authentication and the multi-tenant database structure.

## Features

- ✅ **Role-based access control** with three levels: `user`, `manager`, `admin`
- ✅ **Multi-tenant support** with business isolation
- ✅ **Supabase integration** for JWT token verification
- ✅ **Flexible token extraction** from Authorization header or cookies
- ✅ **Business-level authorization** helpers
- ✅ **Express middleware** ready to use
- ✅ **Comprehensive error handling** with standardized responses

## Installation

```bash
npm install @supabase/supabase-js cookie-parser cors express
```

## Environment Variables

```env
# Required
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# OR
SUPABASE_URL=your_supabase_url

# Optional
FRONTEND_URL=http://localhost:3000
PORT=3001
```

## Role Hierarchy

The middleware enforces a hierarchical role system:

```
admin (level 2) > manager (level 1) > user (level 0)
```

- **user**: Can read business data
- **manager**: Can read/write business data (inherits user permissions)
- **admin**: Can read/write/delete business data + manage users (inherits manager permissions)

## Quick Start

### 1. Basic Setup

```javascript
const express = require('express');
const cookieParser = require('cookie-parser');
const { requireUser, requireManager, requireAdmin } = require('./rbac-middleware');

const app = express();

// Required middleware
app.use(express.json());
app.use(cookieParser()); // Required for cookie token extraction

// Protected routes
app.get('/api/profile', requireUser, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/invoices', requireManager, (req, res) => {
  res.json({ message: 'Invoice created', businessId: req.user.businessId });
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
  res.json({ message: 'User deleted' });
});
```

### 2. Frontend Token Setup

The middleware expects the Supabase access token in one of two places:

#### Option 1: Authorization Header (Recommended)
```javascript
// Frontend code
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

fetch('/api/invoices', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

#### Option 2: Cookie
```javascript
// Frontend code
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// Set cookie (subsequent requests will automatically include it)
document.cookie = `sb-access-token=${token}; path=/; secure; samesite=strict`;

// Then make regular requests
fetch('/api/invoices');
```

## API Reference

### Core Functions

#### `requireRole(minRole)`
Creates middleware that requires a minimum role level.

```javascript
const adminOnly = requireRole('admin');
const managerOrAdmin = requireRole('manager');
const anyUser = requireRole('user'); // or just requireRole()
```

#### Helper Middlewares
- `requireUser` - Any authenticated user
- `requireManager` - Manager or admin only  
- `requireAdmin` - Admin only

#### Utility Functions

```javascript
const { getAuthenticatedUser, canAccessBusiness } = require('./rbac-middleware');

app.get('/api/data', requireUser, (req, res) => {
  const user = getAuthenticatedUser(req);
  console.log('User info:', user);
  
  // Check business access
  const targetBusinessId = req.params.businessId;
  if (!canAccessBusiness(user, targetBusinessId)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  
  res.json({ data: 'Business data' });
});
```

## User Object Structure

When authentication succeeds, `req.user` contains:

```javascript
{
  id: "uuid",              // Supabase user ID
  role: "admin",           // User role: 'user'|'manager'|'admin'
  businessId: "uuid",      // Business UUID from profiles table
  email: "user@email.com", // User email (optional)
  fullName: "John Doe"     // User full name (optional)
}
```

## Error Responses

The middleware returns standardized JSON error responses:

### 401 Unauthorized
```json
{
  "error": "unauthorized",
  "message": "No access token provided"
}
```

```json
{
  "error": "unauthorized", 
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "forbidden",
  "message": "Requires admin role or higher, but user has manager role"
}
```

### 500 Internal Server Error
```json
{
  "error": "internal_server_error",
  "message": "Authentication failed"
}
```

## Complete Example

```javascript
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { 
  requireUser, 
  requireManager, 
  requireAdmin,
  getAuthenticatedUser,
  canAccessBusiness 
} = require('./rbac-middleware');

const app = express();

// Middleware setup
app.use(express.json());
app.use(cookieParser());
app.use(cors({ credentials: true }));

// Public endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// User endpoints (read-only)
app.get('/api/customers', requireUser, (req, res) => {
  const user = getAuthenticatedUser(req);
  res.json({ 
    customers: [], // Your data here
    businessId: user.businessId 
  });
});

// Manager endpoints (read/write)
app.post('/api/customers', requireManager, (req, res) => {
  const user = getAuthenticatedUser(req);
  // Create customer logic...
  res.json({ 
    message: 'Customer created',
    businessId: user.businessId 
  });
});

// Admin endpoints (full control)
app.delete('/api/customers/:id', requireAdmin, (req, res) => {
  const user = getAuthenticatedUser(req);
  // Delete customer logic...
  res.json({ 
    message: 'Customer deleted',
    deletedBy: user.fullName 
  });
});

// Business validation example
app.get('/api/business/:businessId/invoices', requireUser, (req, res) => {
  const user = getAuthenticatedUser(req);
  const targetBusinessId = req.params.businessId;
  
  if (!canAccessBusiness(user, targetBusinessId)) {
    return res.status(403).json({ 
      error: 'forbidden',
      message: 'Cannot access different business data' 
    });
  }
  
  res.json({ invoices: [] });
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
```

## Integration with Database

The middleware works seamlessly with the RBAC database policies:

1. **Authentication**: Middleware verifies user and loads profile
2. **Authorization**: Middleware checks role permissions  
3. **Database**: RLS policies enforce business isolation
4. **Business Logic**: Your code operates on filtered data

```javascript
// Example: Create invoice
app.post('/api/invoices', requireManager, async (req, res) => {
  const user = getAuthenticatedUser(req);
  
  // Insert with business_id - RLS policies will ensure proper isolation
  const invoice = await supabase
    .from('invoices')
    .insert({
      ...req.body,
      business_id: user.businessId,  // Auto-set from authenticated user
      created_by: user.id
    });
    
  res.json({ invoice });
});
```

## Testing

You can test the middleware using the included demo server:

```bash
# Start the demo server
node rbac-demo-server.js

# Test endpoints
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/profile
```

## Security Best Practices

1. **Always use HTTPS** in production
2. **Set secure cookie flags** when using cookie tokens
3. **Validate business_id** in your business logic
4. **Log authentication failures** for monitoring
5. **Use environment variables** for secrets
6. **Keep tokens short-lived** (handled by Supabase)

## Troubleshooting

### Common Issues

1. **"No access token provided"**
   - Check Authorization header format: `Bearer <token>`
   - Verify cookie name: `sb-access-token`

2. **"Invalid or expired token"**
   - Token may be expired - refresh in frontend
   - Check Supabase service role key

3. **"User profile missing required fields"**
   - Ensure user has `role` and `business_id` in profiles table
   - Run RBAC setup SQL script

4. **Permission denied errors**
   - Verify user role in database
   - Check business_id matches

### Debug Mode

Add logging to troubleshoot:

```javascript
// Enable debug logging
process.env.DEBUG = 'rbac:*';

// Or add manual logging
console.log('Token:', extractToken(req));
console.log('User:', await authenticateUser(token));
```

## File Structure

```
backend/
├── rbac-middleware.js         # Main middleware (use this)
├── rbac-middleware.ts         # TypeScript version (Next.js)
├── rbac-demo-server.js        # Demo/test server
├── RBAC_MIDDLEWARE_GUIDE.md   # This documentation
└── rbac-multi-tenant-setup.sql # Database setup
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Verify environment variables
3. Test with the demo server
4. Check Supabase authentication status
