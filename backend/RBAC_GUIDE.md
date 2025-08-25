# RBAC Multi-Tenant System for Repario

This document describes the Role-Based Access Control (RBAC) system implemented for the Repario Invoice Management System.

## Overview

The RBAC system provides multi-tenant security with three user roles:
- **Admin**: Full access to manage users, data, and business settings
- **Manager**: Can create, read, and update business data but cannot delete or manage users
- **User**: Read-only access to business data

## Database Structure

### Tables with Multi-Tenant Support

All main business tables now include a `business_id` column:
- `profiles` - User profiles with role assignment
- `customers` - Customer data
- `layouts` - Invoice layouts
- `invoices` - Invoice records
- `items` - Product/service catalog

### Helper Functions

Three SQL functions provide role-based access control:

```sql
-- Get current user's business ID
public.current_business_id() RETURNS UUID

-- Check if current user is admin
public.is_admin() RETURNS BOOLEAN

-- Check if current user is manager or admin
public.is_manager() RETURNS BOOLEAN
```

## Security Policies

### Read Access (All Roles)
All authenticated users can read data within their business:
```sql
CREATE POLICY "read:same-biz" ON public.<TABLE> FOR SELECT
TO authenticated USING (business_id = public.current_business_id());
```

### Write Access (Manager+)
Managers and admins can create and update data:
```sql
CREATE POLICY "write:same-biz:manager+" ON public.<TABLE> FOR INSERT
TO authenticated WITH CHECK (business_id = public.current_business_id() AND public.is_manager());

CREATE POLICY "update:same-biz:manager+" ON public.<TABLE> FOR UPDATE
TO authenticated 
USING (business_id = public.current_business_id() AND public.is_manager())
WITH CHECK (business_id = public.current_business_id() AND public.is_manager());
```

### Delete Access (Admin Only)
Only admins can delete data:
```sql
CREATE POLICY "delete:same-biz:admin" ON public.<TABLE> FOR DELETE
TO authenticated USING (business_id = public.current_business_id() AND public.is_admin());
```

### Special Profiles Table Policies

The `profiles` table has special rules:
- **Read**: Anyone in same business can view user profiles
- **Write/Update/Delete**: Admin only within same business

## Role Permissions Matrix

| Action | User | Manager | Admin |
|--------|------|---------|-------|
| Read business data | ✅ | ✅ | ✅ |
| Create customers/invoices/items | ❌ | ✅ | ✅ |
| Update customers/invoices/items | ❌ | ✅ | ✅ |
| Delete customers/invoices/items | ❌ | ❌ | ✅ |
| View user profiles | ✅ | ✅ | ✅ |
| Create/edit/delete users | ❌ | ❌ | ✅ |
| Change user roles | ❌ | ❌ | ✅ |

## Implementation Files

1. **`rbac-multi-tenant-setup.sql`** - Main implementation script
2. **`test-rbac-setup.sql`** - Validation and testing script
3. **`RBAC_GUIDE.md`** - This documentation file

## Usage Instructions

### 1. Deploy the RBAC System

Run the main setup script in your Supabase SQL editor:
```sql
-- Execute the contents of rbac-multi-tenant-setup.sql
```

### 2. Validate the Setup

Run the test script to verify everything is working:
```sql
-- Execute the contents of test-rbac-setup.sql
```

### 3. Create a Business and Users

```sql
-- Create a business
INSERT INTO public.businesses (name, created_by) 
VALUES ('Acme Corp', auth.uid());

-- Create admin user profile
INSERT INTO public.profiles (id, business_id, full_name, role, email) 
VALUES (
    auth.uid(), 
    (SELECT id FROM public.businesses WHERE name = 'Acme Corp'),
    'John Admin',
    'admin',
    'admin@acme.com'
);

-- Create manager user profile
INSERT INTO public.profiles (id, business_id, full_name, role, email) 
VALUES (
    'manager-user-id', 
    (SELECT id FROM public.businesses WHERE name = 'Acme Corp'),
    'Jane Manager',
    'manager',
    'manager@acme.com'
);

-- Create regular user profile
INSERT INTO public.profiles (id, business_id, full_name, role, email) 
VALUES (
    'regular-user-id', 
    (SELECT id FROM public.businesses WHERE name = 'Acme Corp'),
    'Bob User',
    'user',
    'user@acme.com'
);
```

### 4. Frontend Integration

In your frontend application, you can check user permissions:

```typescript
// Check if user can perform actions
const canEdit = userRole === 'admin' || userRole === 'manager';
const canDelete = userRole === 'admin';
const canManageUsers = userRole === 'admin';

// Use in UI components
{canEdit && <EditButton />}
{canDelete && <DeleteButton />}
{canManageUsers && <UserManagementPage />}
```

## Security Features

1. **Row Level Security (RLS)** - Enabled on all tenant tables
2. **Business Isolation** - Users can only access data within their business
3. **Role-based Operations** - Different permission levels for different roles
4. **Idempotent Migrations** - Safe to run multiple times
5. **Performance Optimized** - Proper indices for business_id and role columns

## Migration Safety

The RBAC setup script is designed to be:
- **Idempotent** - Safe to run multiple times
- **Backward Compatible** - Works with existing data
- **Non-destructive** - Preserves existing data while upgrading policies

## Testing the System

Use the validation function to check the system status:
```sql
SELECT * FROM public.validate_rbac_setup();
```

This will show:
- Which tables have RLS enabled
- How many policies exist per table
- Whether tables have the required business_id column

## Troubleshooting

### Common Issues

1. **Function not found errors**
   - Ensure the helper functions are created
   - Check function permissions

2. **Permission denied errors**
   - Verify user has correct role assignment
   - Check business_id is properly set

3. **Policy conflicts**
   - The setup script drops old policies before creating new ones
   - If manual policies exist, they may need to be dropped first

### Verification Queries

```sql
-- Check current user's role and business
SELECT id, business_id, role, full_name 
FROM public.profiles 
WHERE id = auth.uid();

-- Check helper functions work
SELECT 
    public.current_business_id() as my_business,
    public.is_admin() as am_admin,
    public.is_manager() as am_manager;

-- List all policies for a table
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'customers';
```

## Support

For issues or questions about the RBAC system:
1. Check the validation output from `test-rbac-setup.sql`
2. Review the troubleshooting section
3. Examine policy definitions in Supabase dashboard
4. Verify user role assignments in the profiles table
