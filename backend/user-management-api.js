// User Management API with RBAC Integration
// Admin-only endpoints for managing users within the same business

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { 
  requireAdmin, 
  getAuthenticatedUser,
  canAccessBusiness 
} = require('./rbac-middleware');

// Initialize Supabase clients
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service role for admin operations
);

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

const router = express.Router();

/**
 * Sanitize user data for API responses
 * Remove sensitive fields and normalize the response
 */
function sanitizeUserData(profile, authUser = null) {
  const sanitized = {
    id: profile.id,
    email: profile.email || authUser?.email,
    fullName: profile.full_name,
    phone: profile.phone,
    role: profile.role,
    businessId: profile.business_id,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at
  };

  // Remove any undefined fields
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined || sanitized[key] === null) {
      delete sanitized[key];
    }
  });

  return sanitized;
}

/**
 * Validate user creation data
 */
function validateCreateUserData(data) {
  const errors = [];
  
  if (!data.email || !data.email.includes('@')) {
    errors.push('Valid email is required');
  }
  
  if (!data.password || data.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }
  
  if (!data.role || !['user', 'manager', 'admin'].includes(data.role)) {
    errors.push('Role must be one of: user, manager, admin');
  }
  
  if (data.fullName && data.fullName.length > 100) {
    errors.push('Full name must be less than 100 characters');
  }
  
  if (data.phone && data.phone.length > 20) {
    errors.push('Phone must be less than 20 characters');
  }
  
  return errors;
}

/**
 * Validate user update data
 */
function validateUpdateUserData(data) {
  const errors = [];
  
  if (data.role && !['user', 'manager', 'admin'].includes(data.role)) {
    errors.push('Role must be one of: user, manager, admin');
  }
  
  if (data.fullName && data.fullName.length > 100) {
    errors.push('Full name must be less than 100 characters');
  }
  
  if (data.phone && data.phone.length > 20) {
    errors.push('Phone must be less than 20 characters');
  }
  
  return errors;
}

// =====================================================
// GET /api/admin/users - List all users in business
// =====================================================

router.get('/users', requireAdmin, async (req, res) => {
  try {
    const admin = getAuthenticatedUser(req);
    
    // Get all users in the same business
    const { data: profiles, error } = await supabaseServiceRole
      .from('profiles')
      .select('*')
      .eq('business_id', admin.businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({
        error: 'internal_server_error',
        message: 'Failed to fetch users'
      });
    }

    // Sanitize response data
    const users = profiles.map(profile => sanitizeUserData(profile));

    res.json({
      users,
      total: users.length,
      businessId: admin.businessId
    });

  } catch (error) {
    console.error('Error in GET /users:', error);
    res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to fetch users'
    });
  }
});

// =====================================================
// POST /api/admin/users - Create new user
// =====================================================

router.post('/users', requireAdmin, async (req, res) => {
  try {
    const admin = getAuthenticatedUser(req);
    const userData = req.body;

    // Validate input data
    const validationErrors = validateCreateUserData(userData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Invalid user data',
        details: validationErrors
      });
    }

    // Step 1: Create auth user using service role client
    const { data: authUser, error: authError } = await supabaseServiceRole.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true // Auto-confirm email for admin-created users
    });

    if (authError || !authUser.user) {
      console.error('Error creating auth user:', authError);
      return res.status(400).json({
        error: 'auth_error',
        message: authError?.message || 'Failed to create user account'
      });
    }

    // Step 2: Create profile with admin's business_id
    const profileData = {
      id: authUser.user.id,
      business_id: admin.businessId, // Use admin's business
      email: userData.email,
      full_name: userData.fullName || null,
      phone: userData.phone || null,
      role: userData.role
    };

    const { data: profile, error: profileError } = await supabaseServiceRole
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      
      // Clean up: delete auth user if profile creation failed
      try {
        await supabaseServiceRole.auth.admin.deleteUser(authUser.user.id);
      } catch (cleanupError) {
        console.error('Error cleaning up auth user:', cleanupError);
      }

      return res.status(500).json({
        error: 'profile_error',
        message: 'Failed to create user profile'
      });
    }

    // Step 3: Return sanitized user data
    const newUser = sanitizeUserData(profile, authUser.user);

    res.status(201).json({
      message: 'User created successfully',
      user: newUser,
      createdBy: admin.fullName || admin.email
    });

  } catch (error) {
    console.error('Error in POST /users:', error);
    res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to create user'
    });
  }
});

// =====================================================
// PATCH /api/admin/users/:id - Update user
// =====================================================

router.patch('/users/:id', requireAdmin, async (req, res) => {
  try {
    const admin = getAuthenticatedUser(req);
    const userId = req.params.id;
    const updateData = req.body;

    // Validate input data
    const validationErrors = validateUpdateUserData(updateData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Invalid update data',
        details: validationErrors
      });
    }

    // Step 1: Check if user exists and is in same business
    const { data: existingProfile, error: fetchError } = await supabaseServiceRole
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .eq('business_id', admin.businessId)
      .single();

    if (fetchError || !existingProfile) {
      return res.status(404).json({
        error: 'not_found',
        message: 'User not found or not in your business'
      });
    }

    // Step 2: Prevent admin from demoting themselves if they're the only admin
    if (existingProfile.id === admin.id && updateData.role && updateData.role !== 'admin') {
      // Check if there are other admins in the business
      const { data: otherAdmins, error: adminCheckError } = await supabaseServiceRole
        .from('profiles')
        .select('id')
        .eq('business_id', admin.businessId)
        .eq('role', 'admin')
        .neq('id', admin.id);

      if (adminCheckError || !otherAdmins || otherAdmins.length === 0) {
        return res.status(400).json({
          error: 'forbidden',
          message: 'Cannot change role: you are the only admin in this business'
        });
      }
    }

    // Step 3: Build update object
    const updateFields = {};
    if (updateData.fullName !== undefined) updateFields.full_name = updateData.fullName;
    if (updateData.phone !== undefined) updateFields.phone = updateData.phone;
    if (updateData.role !== undefined) updateFields.role = updateData.role;

    // Only update if there are fields to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'No valid fields to update'
      });
    }

    // Step 4: Update profile
    const { data: updatedProfile, error: updateError } = await supabaseServiceRole
      .from('profiles')
      .update(updateFields)
      .eq('id', userId)
      .eq('business_id', admin.businessId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return res.status(500).json({
        error: 'update_error',
        message: 'Failed to update user'
      });
    }

    // Step 5: Return sanitized updated user data
    const updatedUser = sanitizeUserData(updatedProfile);

    res.json({
      message: 'User updated successfully',
      user: updatedUser,
      updatedBy: admin.fullName || admin.email,
      changes: updateFields
    });

  } catch (error) {
    console.error('Error in PATCH /users/:id:', error);
    res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to update user'
    });
  }
});

// =====================================================
// DELETE /api/admin/users/:id - Delete user
// =====================================================

router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const admin = getAuthenticatedUser(req);
    const userId = req.params.id;

    // Step 1: Check if user exists and is in same business
    const { data: existingProfile, error: fetchError } = await supabaseServiceRole
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .eq('business_id', admin.businessId)
      .single();

    if (fetchError || !existingProfile) {
      return res.status(404).json({
        error: 'not_found',
        message: 'User not found or not in your business'
      });
    }

    // Step 2: Prevent admin from deleting themselves if they're the only admin
    if (existingProfile.id === admin.id) {
      // Check if there are other admins in the business
      const { data: otherAdmins, error: adminCheckError } = await supabaseServiceRole
        .from('profiles')
        .select('id')
        .eq('business_id', admin.businessId)
        .eq('role', 'admin')
        .neq('id', admin.id);

      if (adminCheckError || !otherAdmins || otherAdmins.length === 0) {
        return res.status(400).json({
          error: 'forbidden',
          message: 'Cannot delete yourself: you are the only admin in this business'
        });
      }
    }

    // Store user info for response
    const deletedUserInfo = sanitizeUserData(existingProfile);

    // Step 3: Delete profile (this will cascade due to foreign key constraints)
    const { error: profileDeleteError } = await supabaseServiceRole
      .from('profiles')
      .delete()
      .eq('id', userId)
      .eq('business_id', admin.businessId);

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError);
      return res.status(500).json({
        error: 'delete_error',
        message: 'Failed to delete user profile'
      });
    }

    // Step 4: Delete auth user
    const { error: authDeleteError } = await supabaseServiceRole.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      // Profile is already deleted, but log this for monitoring
      console.warn(`Auth user ${userId} could not be deleted: ${authDeleteError.message}`);
    }

    res.json({
      message: 'User deleted successfully',
      deletedUser: deletedUserInfo,
      deletedBy: admin.fullName || admin.email
    });

  } catch (error) {
    console.error('Error in DELETE /users/:id:', error);
    res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to delete user'
    });
  }
});

// =====================================================
// GET /api/admin/users/:id - Get specific user
// =====================================================

router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const admin = getAuthenticatedUser(req);
    const userId = req.params.id;

    // Get user profile
    const { data: profile, error } = await supabaseServiceRole
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .eq('business_id', admin.businessId)
      .single();

    if (error || !profile) {
      return res.status(404).json({
        error: 'not_found',
        message: 'User not found or not in your business'
      });
    }

    // Sanitize and return user data
    const user = sanitizeUserData(profile);

    res.json({
      user,
      businessId: admin.businessId
    });

  } catch (error) {
    console.error('Error in GET /users/:id:', error);
    res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to fetch user'
    });
  }
});

// =====================================================
// Error handling middleware
// =====================================================

router.use((error, req, res, next) => {
  console.error('User management API error:', error);
  res.status(500).json({
    error: 'internal_server_error',
    message: 'Something went wrong in user management'
  });
});

module.exports = router;

// =====================================================
// USAGE EXAMPLE
// =====================================================

/*
// In your main Express app:

const express = require('express');
const cookieParser = require('cookie-parser');
const userManagementRoutes = require('./user-management-api');

const app = express();

// Required middleware
app.use(express.json());
app.use(cookieParser());

// Mount user management routes
app.use('/api/admin', userManagementRoutes);

// Start server
app.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('User management endpoints available at /api/admin/users');
});

// Example requests:

// GET /api/admin/users - List all users in business
// POST /api/admin/users - Create new user
// {
//   "email": "newuser@company.com",
//   "password": "securepassword123",
//   "role": "user",
//   "fullName": "John Doe",
//   "phone": "+1234567890"
// }

// PATCH /api/admin/users/:id - Update user
// {
//   "fullName": "John Smith",
//   "role": "manager",
//   "phone": "+1987654321"
// }

// DELETE /api/admin/users/:id - Delete user
// GET /api/admin/users/:id - Get specific user
*/
