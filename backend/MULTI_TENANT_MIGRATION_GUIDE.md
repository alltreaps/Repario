# Multi-Tenant Migration Guide

## Overview

This migration transforms the Repario Invoice Management System from a single-tenant architecture to a multi-tenant architecture where multiple businesses can share the same database while maintaining complete data isolation.

## Key Changes

### 1. New Tables

- **`public.businesses`** - Stores business information
- **Updated `public.profiles`** - Now references `auth.users` and includes business relationship

### 2. Multi-Tenant Columns Added

All major tables now include `business_id` for data isolation:

- `customers.business_id`
- `layouts.business_id`
- `invoices.business_id`
- `items.business_id`

### 3. Updated Security Model

- **Row Level Security (RLS)** updated for all tables
- **Business-based data isolation** - users can only access data from their business
- **Role-based permissions** - admin/manager/user roles within each business
- **Helper function** `current_business_id()` for easy access control

## Migration Steps

### Step 1: Run the Migration

```sql
-- Execute the migration file
\i multi-tenant-migration.sql
```

### Step 2: Migrate Existing Data

```sql
-- This will create a default business and assign all existing data to it
SELECT public.migrate_single_tenant_data();
```

### Step 3: Create New Businesses (Optional)

```sql
-- Create a new business with an admin user
SELECT public.create_business_with_admin(
    'Acme Corporation',                    -- Business name
    '12345678-1234-1234-1234-123456789012', -- Admin user UUID from auth.users
    'John Doe',                            -- Admin full name (optional)
    '+1-555-123-4567'                      -- Admin phone (optional)
);
```

### Step 4: Add Users to Businesses

```sql
-- Add a user to an existing business
SELECT public.add_user_to_business(
    '87654321-4321-4321-4321-210987654321', -- User UUID from auth.users
    'business-uuid-here',                    -- Business UUID
    'Jane Smith',                            -- Full name (optional)
    '+1-555-987-6543',                      -- Phone (optional)
    'manager'                               -- Role: 'admin', 'manager', or 'user'
);
```

## Business Rules

### Access Control

1. **Business Isolation**: Users can only access data within their own business
2. **Role Hierarchy**:
   - **Admin**: Full CRUD access to all business data and user management
   - **Manager**: Full CRUD access to business data (limited user management)
   - **User**: Read/write access to business data (no user management)

### Data Policies

- **Businesses**: Users can only view their own business
- **Profiles**: Users can view all profiles in their business; only admins can manage users
- **All Other Tables**: Users can access all data within their business based on the `business_id` column

## Helper Functions

### `current_business_id()`

Returns the business ID for the currently authenticated user.

```sql
SELECT public.current_business_id();
```

### `create_business_with_admin(name, admin_user_id, full_name, phone)`

Creates a new business and assigns an admin user to it.

### `add_user_to_business(user_id, business_id, full_name, phone, role)`

Adds an existing authenticated user to a business with the specified role.

### `migrate_single_tenant_data()`

One-time migration function to assign existing data to a default business.

## API Changes Required

Your application code will need to be updated to handle the multi-tenant structure:

### 1. User Registration Flow

```typescript
// After user signs up with Supabase Auth, either:
// A) Create a new business for them
const { data: businessId } = await supabase.rpc('create_business_with_admin', {
  p_business_name: 'New Business',
  p_admin_user_id: user.id,
  p_admin_full_name: 'User Name',
  p_admin_phone: '+1-555-123-4567'
});

// B) Or add them to an existing business (invitation flow)
const { data: success } = await supabase.rpc('add_user_to_business', {
  p_user_id: user.id,
  p_business_id: 'existing-business-uuid',
  p_full_name: 'User Name',
  p_phone: '+1-555-123-4567',
  p_role: 'user'
});
```

### 2. Data Queries

No changes needed! The RLS policies automatically filter data by business_id.

```typescript
// This will automatically only return customers for the user's business
const { data: customers } = await supabase
  .from('customers')
  .select('*');
```

### 3. Data Inserts

You'll need to include business_id in inserts, or set up triggers to auto-populate it:

```typescript
// Get current user's business_id
const { data: profile } = await supabase
  .from('profiles')
  .select('business_id')
  .eq('id', user.id)
  .single();

// Include business_id in inserts
const { data: customer } = await supabase
  .from('customers')
  .insert({
    name: 'Customer Name',
    business_id: profile.business_id
  });
```

## Security Considerations

1. **RLS is Enabled**: All tables have Row Level Security enabled
2. **Function Security**: Helper functions use `SECURITY DEFINER` for elevated privileges
3. **Role Validation**: Role values are constrained to 'admin', 'manager', 'user'
4. **Cascade Deletes**: Proper foreign key relationships with cascade deletes
5. **Business Isolation**: Complete data isolation between businesses

## Testing the Migration

After running the migration, test the following:

1. **Data Isolation**: Users can only see their business data
2. **Role Permissions**: Admins can manage users, others cannot
3. **Business Access**: Users can view their business information
4. **All CRUD Operations**: Create, read, update, delete operations work correctly
5. **Cross-Business Protection**: Users cannot access other businesses' data

## Rollback Plan

If you need to rollback this migration:

1. **Backup**: Ensure you have a database backup before running the migration
2. **Drop New Tables**: `DROP TABLE public.businesses CASCADE;`
3. **Restore Policies**: You'll need to manually restore the original single-tenant policies
4. **Remove Columns**: Remove `business_id` columns from all tables

## Support

For questions or issues with this migration, refer to:

- Supabase RLS documentation
- PostgreSQL documentation for policies and functions
- The original schema files for reference
