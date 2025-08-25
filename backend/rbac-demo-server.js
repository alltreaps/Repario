// Test/Demo Express Server with RBAC Middleware
// This file demonstrates how to use the RBAC middleware in your Express application

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { 
  requireRole, 
  requireAdmin, 
  requireManager, 
  requireUser, 
  getAuthenticatedUser,
  canAccessBusiness 
} = require('./rbac-middleware');

const app = express();

// Middleware setup
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// =====================================================
// PUBLIC ROUTES (No authentication required)
// =====================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/public/info', (req, res) => {
  res.json({ message: 'This is a public endpoint' });
});

// =====================================================
// USER ROUTES (Any authenticated user)
// =====================================================

app.get('/api/profile', requireUser, (req, res) => {
  const user = getAuthenticatedUser(req);
  res.json({ 
    message: 'Profile retrieved', 
    user: {
      id: user.id,
      role: user.role,
      businessId: user.businessId,
      email: user.email,
      fullName: user.fullName
    }
  });
});

app.get('/api/dashboard', requireUser, (req, res) => {
  const user = getAuthenticatedUser(req);
  res.json({ 
    message: 'Dashboard data', 
    user: user.fullName,
    role: user.role,
    business: user.businessId
  });
});

// Business-specific data access
app.get('/api/customers', requireUser, (req, res) => {
  const user = getAuthenticatedUser(req);
  res.json({ 
    message: 'Customers retrieved for business', 
    businessId: user.businessId,
    userRole: user.role
  });
});

app.get('/api/invoices', requireUser, (req, res) => {
  const user = getAuthenticatedUser(req);
  res.json({ 
    message: 'Invoices retrieved for business', 
    businessId: user.businessId,
    userRole: user.role
  });
});

// =====================================================
// MANAGER+ ROUTES (Manager and Admin only)
// =====================================================

app.post('/api/customers', requireManager, (req, res) => {
  const user = getAuthenticatedUser(req);
  const customerData = req.body;
  
  res.json({ 
    message: 'Customer created', 
    businessId: user.businessId,
    createdBy: user.fullName,
    customerData
  });
});

app.put('/api/customers/:id', requireManager, (req, res) => {
  const user = getAuthenticatedUser(req);
  const customerId = req.params.id;
  const updateData = req.body;
  
  res.json({ 
    message: 'Customer updated', 
    customerId,
    businessId: user.businessId,
    updatedBy: user.fullName,
    updateData
  });
});

app.post('/api/invoices', requireManager, (req, res) => {
  const user = getAuthenticatedUser(req);
  const invoiceData = req.body;
  
  res.json({ 
    message: 'Invoice created', 
    businessId: user.businessId,
    createdBy: user.fullName,
    invoiceData
  });
});

app.put('/api/invoices/:id', requireManager, (req, res) => {
  const user = getAuthenticatedUser(req);
  const invoiceId = req.params.id;
  const updateData = req.body;
  
  res.json({ 
    message: 'Invoice updated', 
    invoiceId,
    businessId: user.businessId,
    updatedBy: user.fullName,
    updateData
  });
});

app.post('/api/items', requireManager, (req, res) => {
  const user = getAuthenticatedUser(req);
  const itemData = req.body;
  
  res.json({ 
    message: 'Item created', 
    businessId: user.businessId,
    createdBy: user.fullName,
    itemData
  });
});

// =====================================================
// ADMIN ROUTES (Admin only)
// =====================================================

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const user = getAuthenticatedUser(req);
  res.json({ 
    message: 'Users retrieved for business', 
    businessId: user.businessId,
    requestedBy: user.fullName
  });
});

app.post('/api/admin/users', requireAdmin, (req, res) => {
  const user = getAuthenticatedUser(req);
  const newUserData = req.body;
  
  res.json({ 
    message: 'User created', 
    businessId: user.businessId,
    createdBy: user.fullName,
    newUserData
  });
});

app.put('/api/admin/users/:id/role', requireAdmin, (req, res) => {
  const user = getAuthenticatedUser(req);
  const targetUserId = req.params.id;
  const { role } = req.body;
  
  res.json({ 
    message: 'User role updated', 
    targetUserId,
    newRole: role,
    businessId: user.businessId,
    updatedBy: user.fullName
  });
});

app.delete('/api/admin/customers/:id', requireAdmin, (req, res) => {
  const user = getAuthenticatedUser(req);
  const customerId = req.params.id;
  
  res.json({ 
    message: 'Customer deleted', 
    customerId,
    businessId: user.businessId,
    deletedBy: user.fullName
  });
});

app.delete('/api/admin/invoices/:id', requireAdmin, (req, res) => {
  const user = getAuthenticatedUser(req);
  const invoiceId = req.params.id;
  
  res.json({ 
    message: 'Invoice deleted', 
    invoiceId,
    businessId: user.businessId,
    deletedBy: user.fullName
  });
});

// =====================================================
// CUSTOM ROLE ROUTES (Using requireRole directly)
// =====================================================

app.get('/api/reports/basic', requireRole('user'), (req, res) => {
  const user = getAuthenticatedUser(req);
  res.json({ 
    message: 'Basic reports (any user)', 
    user: user.fullName,
    role: user.role
  });
});

app.get('/api/reports/advanced', requireRole('manager'), (req, res) => {
  const user = getAuthenticatedUser(req);
  res.json({ 
    message: 'Advanced reports (manager+)', 
    user: user.fullName,
    role: user.role
  });
});

app.get('/api/reports/admin', requireRole('admin'), (req, res) => {
  const user = getAuthenticatedUser(req);
  res.json({ 
    message: 'Admin reports (admin only)', 
    user: user.fullName,
    role: user.role
  });
});

// =====================================================
// BUSINESS VALIDATION ROUTES
// =====================================================

app.get('/api/business/:businessId/data', requireUser, (req, res) => {
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
    message: 'Business data retrieved', 
    businessId: targetBusinessId,
    user: user.fullName
  });
});

// =====================================================
// ERROR HANDLING
// =====================================================

app.use((req, res) => {
  res.status(404).json({ 
    error: 'not_found', 
    message: 'Route not found' 
  });
});

app.use((error, req, res, next) => {
  console.error('Application error:', error);
  res.status(500).json({ 
    error: 'internal_server_error', 
    message: 'Something went wrong' 
  });
});

// =====================================================
// SERVER STARTUP
// =====================================================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 RBAC Demo Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('  Public:');
  console.log('    GET  /health');
  console.log('    GET  /api/public/info');
  console.log('');
  console.log('  User (any authenticated):');
  console.log('    GET  /api/profile');
  console.log('    GET  /api/dashboard');
  console.log('    GET  /api/customers');
  console.log('    GET  /api/invoices');
  console.log('');
  console.log('  Manager+ (manager and admin):');
  console.log('    POST /api/customers');
  console.log('    PUT  /api/customers/:id');
  console.log('    POST /api/invoices');
  console.log('    PUT  /api/invoices/:id');
  console.log('    POST /api/items');
  console.log('');
  console.log('  Admin only:');
  console.log('    GET  /api/admin/users');
  console.log('    POST /api/admin/users');
  console.log('    PUT  /api/admin/users/:id/role');
  console.log('    DEL  /api/admin/customers/:id');
  console.log('    DEL  /api/admin/invoices/:id');
  console.log('');
  console.log('  🔑 Authentication: Bearer token or sb-access-token cookie');
});

module.exports = app;
