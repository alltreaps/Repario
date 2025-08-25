-- RBAC Multi-Tenant Setup for Repario Invoice Management System
-- This script implements Role-Based Access Control with multi-tenant support
-- Run this SQL in your Supabase SQL Editor

-- =====================================================
-- STEP 1: ENSURE PROFILES TABLE HAS PROPER STRUCTURE
-- =====================================================

-- First, update the profiles table to ensure it has the proper role constraint
-- and business_id if not already present from multi-tenant migration

DO $$ 
BEGIN
    -- Add business_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_id') THEN
        ALTER TABLE public.profiles ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;
    
    -- Update role constraint to include 'manager' if not already present
    -- First drop the existing constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_role_check' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
    END IF;
    
    -- Add the new constraint with all three roles
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('admin','manager','user'));
        
    -- Ensure role is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'role' 
        AND is_nullable = 'YES'
    ) THEN
        -- Update any NULL roles to 'user' first
        UPDATE public.profiles SET role = 'user' WHERE role IS NULL;
        -- Then make the column NOT NULL
        ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;
    END IF;
END $$;

-- =====================================================
-- STEP 2: CREATE RBAC HELPER FUNCTIONS
-- =====================================================

-- Function to get current user's business_id
CREATE OR REPLACE FUNCTION public.current_business_id() 
RETURNS UUID 
LANGUAGE SQL 
STABLE 
SECURITY DEFINER
AS $$
  SELECT business_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN 
LANGUAGE SQL 
STABLE 
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- Function to check if current user is manager or above
CREATE OR REPLACE FUNCTION public.is_manager() 
RETURNS BOOLEAN 
LANGUAGE SQL 
STABLE 
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin','manager')
  )
$$;

-- =====================================================
-- STEP 3: ENSURE ALL TENANT TABLES HAVE BUSINESS_ID
-- =====================================================

-- Add business_id to customers table if not present
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'business_id') THEN
        ALTER TABLE public.customers ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add business_id to layouts table if not present
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'layouts' AND column_name = 'business_id') THEN
        ALTER TABLE public.layouts ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add business_id to invoices table if not present
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'business_id') THEN
        ALTER TABLE public.invoices ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add business_id to items table if not present
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'business_id') THEN
        ALTER TABLE public.items ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- STEP 4: CREATE RBAC POLICIES FOR CUSTOMERS TABLE
-- =====================================================

-- Enable RLS for customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'read:same-biz' AND tablename = 'customers') THEN
        DROP POLICY "read:same-biz" ON public.customers;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'write:same-biz:manager+' AND tablename = 'customers') THEN
        DROP POLICY "write:same-biz:manager+" ON public.customers;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'update:same-biz:manager+' AND tablename = 'customers') THEN
        DROP POLICY "update:same-biz:manager+" ON public.customers;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delete:same-biz:admin' AND tablename = 'customers') THEN
        DROP POLICY "delete:same-biz:admin" ON public.customers;
    END IF;
    -- Drop old policies that might conflict
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own customers' AND tablename = 'customers') THEN
        DROP POLICY "Users can view own customers" ON public.customers;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own customers' AND tablename = 'customers') THEN
        DROP POLICY "Users can insert own customers" ON public.customers;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own customers' AND tablename = 'customers') THEN
        DROP POLICY "Users can update own customers" ON public.customers;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own customers' AND tablename = 'customers') THEN
        DROP POLICY "Users can delete own customers" ON public.customers;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'business users can access customers' AND tablename = 'customers') THEN
        DROP POLICY "business users can access customers" ON public.customers;
    END IF;
END $$;

-- Read within business (all roles)
CREATE POLICY "read:same-biz" ON public.customers FOR SELECT
TO authenticated USING (business_id = public.current_business_id());

-- Write within business (manager+)
CREATE POLICY "write:same-biz:manager+" ON public.customers FOR INSERT
TO authenticated WITH CHECK (business_id = public.current_business_id() AND public.is_manager());

CREATE POLICY "update:same-biz:manager+" ON public.customers FOR UPDATE
TO authenticated 
USING (business_id = public.current_business_id() AND public.is_manager())
WITH CHECK (business_id = public.current_business_id() AND public.is_manager());

-- Delete within business (admin only)
CREATE POLICY "delete:same-biz:admin" ON public.customers FOR DELETE
TO authenticated USING (business_id = public.current_business_id() AND public.is_admin());

-- =====================================================
-- STEP 5: CREATE RBAC POLICIES FOR LAYOUTS TABLE
-- =====================================================

-- Enable RLS for layouts
ALTER TABLE public.layouts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'read:same-biz' AND tablename = 'layouts') THEN
        DROP POLICY "read:same-biz" ON public.layouts;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'write:same-biz:manager+' AND tablename = 'layouts') THEN
        DROP POLICY "write:same-biz:manager+" ON public.layouts;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'update:same-biz:manager+' AND tablename = 'layouts') THEN
        DROP POLICY "update:same-biz:manager+" ON public.layouts;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delete:same-biz:admin' AND tablename = 'layouts') THEN
        DROP POLICY "delete:same-biz:admin" ON public.layouts;
    END IF;
    -- Drop old policies that might conflict
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own layouts' AND tablename = 'layouts') THEN
        DROP POLICY "Users can view own layouts" ON public.layouts;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own layouts' AND tablename = 'layouts') THEN
        DROP POLICY "Users can insert own layouts" ON public.layouts;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own layouts' AND tablename = 'layouts') THEN
        DROP POLICY "Users can update own layouts" ON public.layouts;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own layouts' AND tablename = 'layouts') THEN
        DROP POLICY "Users can delete own layouts" ON public.layouts;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'business users can access layouts' AND tablename = 'layouts') THEN
        DROP POLICY "business users can access layouts" ON public.layouts;
    END IF;
END $$;

-- Read within business (all roles)
CREATE POLICY "read:same-biz" ON public.layouts FOR SELECT
TO authenticated USING (business_id = public.current_business_id());

-- Write within business (manager+)
CREATE POLICY "write:same-biz:manager+" ON public.layouts FOR INSERT
TO authenticated WITH CHECK (business_id = public.current_business_id() AND public.is_manager());

CREATE POLICY "update:same-biz:manager+" ON public.layouts FOR UPDATE
TO authenticated 
USING (business_id = public.current_business_id() AND public.is_manager())
WITH CHECK (business_id = public.current_business_id() AND public.is_manager());

-- Delete within business (admin only)
CREATE POLICY "delete:same-biz:admin" ON public.layouts FOR DELETE
TO authenticated USING (business_id = public.current_business_id() AND public.is_admin());

-- =====================================================
-- STEP 6: CREATE RBAC POLICIES FOR INVOICES TABLE
-- =====================================================

-- Enable RLS for invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'read:same-biz' AND tablename = 'invoices') THEN
        DROP POLICY "read:same-biz" ON public.invoices;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'write:same-biz:manager+' AND tablename = 'invoices') THEN
        DROP POLICY "write:same-biz:manager+" ON public.invoices;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'update:same-biz:manager+' AND tablename = 'invoices') THEN
        DROP POLICY "update:same-biz:manager+" ON public.invoices;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delete:same-biz:admin' AND tablename = 'invoices') THEN
        DROP POLICY "delete:same-biz:admin" ON public.invoices;
    END IF;
    -- Drop old policies that might conflict
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own invoices' AND tablename = 'invoices') THEN
        DROP POLICY "Users can view own invoices" ON public.invoices;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own invoices' AND tablename = 'invoices') THEN
        DROP POLICY "Users can insert own invoices" ON public.invoices;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own invoices' AND tablename = 'invoices') THEN
        DROP POLICY "Users can update own invoices" ON public.invoices;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own invoices' AND tablename = 'invoices') THEN
        DROP POLICY "Users can delete own invoices" ON public.invoices;
    END IF;
END $$;

-- Read within business (all roles)
CREATE POLICY "read:same-biz" ON public.invoices FOR SELECT
TO authenticated USING (business_id = public.current_business_id());

-- Write within business (manager+)
CREATE POLICY "write:same-biz:manager+" ON public.invoices FOR INSERT
TO authenticated WITH CHECK (business_id = public.current_business_id() AND public.is_manager());

CREATE POLICY "update:same-biz:manager+" ON public.invoices FOR UPDATE
TO authenticated 
USING (business_id = public.current_business_id() AND public.is_manager())
WITH CHECK (business_id = public.current_business_id() AND public.is_manager());

-- Delete within business (admin only)
CREATE POLICY "delete:same-biz:admin" ON public.invoices FOR DELETE
TO authenticated USING (business_id = public.current_business_id() AND public.is_admin());

-- =====================================================
-- STEP 7: CREATE RBAC POLICIES FOR ITEMS TABLE
-- =====================================================

-- Enable RLS for items
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'read:same-biz' AND tablename = 'items') THEN
        DROP POLICY "read:same-biz" ON public.items;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'write:same-biz:manager+' AND tablename = 'items') THEN
        DROP POLICY "write:same-biz:manager+" ON public.items;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'update:same-biz:manager+' AND tablename = 'items') THEN
        DROP POLICY "update:same-biz:manager+" ON public.items;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delete:same-biz:admin' AND tablename = 'items') THEN
        DROP POLICY "delete:same-biz:admin" ON public.items;
    END IF;
    -- Drop old policies that might conflict
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own items' AND tablename = 'items') THEN
        DROP POLICY "Users can view own items" ON public.items;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own items' AND tablename = 'items') THEN
        DROP POLICY "Users can insert own items" ON public.items;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own items' AND tablename = 'items') THEN
        DROP POLICY "Users can update own items" ON public.items;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own items' AND tablename = 'items') THEN
        DROP POLICY "Users can delete own items" ON public.items;
    END IF;
END $$;

-- Read within business (all roles)
CREATE POLICY "read:same-biz" ON public.items FOR SELECT
TO authenticated USING (business_id = public.current_business_id());

-- Write within business (manager+)
CREATE POLICY "write:same-biz:manager+" ON public.items FOR INSERT
TO authenticated WITH CHECK (business_id = public.current_business_id() AND public.is_manager());

CREATE POLICY "update:same-biz:manager+" ON public.items FOR UPDATE
TO authenticated 
USING (business_id = public.current_business_id() AND public.is_manager())
WITH CHECK (business_id = public.current_business_id() AND public.is_manager());

-- Delete within business (admin only)
CREATE POLICY "delete:same-biz:admin" ON public.items FOR DELETE
TO authenticated USING (business_id = public.current_business_id() AND public.is_admin());

-- =====================================================
-- STEP 8: CREATE RBAC POLICIES FOR PROFILES TABLE
-- =====================================================

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    -- Drop new RBAC policies if they exist
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles:read:same-biz' AND tablename = 'profiles') THEN
        DROP POLICY "profiles:read:same-biz" ON public.profiles;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles:write:admin-only' AND tablename = 'profiles') THEN
        DROP POLICY "profiles:write:admin-only" ON public.profiles;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles:update:admin-only' AND tablename = 'profiles') THEN
        DROP POLICY "profiles:update:admin-only" ON public.profiles;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles:delete:admin-only' AND tablename = 'profiles') THEN
        DROP POLICY "profiles:delete:admin-only" ON public.profiles;
    END IF;
    -- Drop old policies that might conflict
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile' AND tablename = 'profiles') THEN
        DROP POLICY "Users can view own profile" ON public.profiles;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'profiles') THEN
        DROP POLICY "Users can update own profile" ON public.profiles;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'read users in same business' AND tablename = 'profiles') THEN
        DROP POLICY "read users in same business" ON public.profiles;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admins manage users in same business' AND tablename = 'profiles') THEN
        DROP POLICY "admins manage users in same business" ON public.profiles;
    END IF;
END $$;

-- Read: anyone in same business can view profiles
CREATE POLICY "profiles:read:same-biz" ON public.profiles FOR SELECT
TO authenticated USING (business_id = public.current_business_id());

-- Insert: admin only and same business
CREATE POLICY "profiles:write:admin-only" ON public.profiles FOR INSERT
TO authenticated WITH CHECK (
    business_id = public.current_business_id() 
    AND public.is_admin()
);

-- Update: admin only and same business
-- Admins can change role but managers/users cannot
CREATE POLICY "profiles:update:admin-only" ON public.profiles FOR UPDATE
TO authenticated 
USING (
    business_id = public.current_business_id() 
    AND public.is_admin()
)
WITH CHECK (
    business_id = public.current_business_id() 
    AND public.is_admin()
);

-- Delete: admin only and same business
CREATE POLICY "profiles:delete:admin-only" ON public.profiles FOR DELETE
TO authenticated USING (
    business_id = public.current_business_id() 
    AND public.is_admin()
);

-- =====================================================
-- STEP 9: CREATE INDICES FOR PERFORMANCE
-- =====================================================

-- Create indices for business_id columns to improve query performance
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_layouts_business_id ON public.layouts(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON public.invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_items_business_id ON public.items(business_id);
CREATE INDEX IF NOT EXISTS idx_profiles_business_id ON public.profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Composite indices for common query patterns
CREATE INDEX IF NOT EXISTS idx_profiles_business_role ON public.profiles(business_id, role);

-- =====================================================
-- STEP 10: VALIDATION AND SUMMARY
-- =====================================================

-- Create a function to validate the RBAC setup
CREATE OR REPLACE FUNCTION public.validate_rbac_setup()
RETURNS TABLE(
    table_name TEXT,
    rls_enabled BOOLEAN,
    policy_count INTEGER,
    has_business_id BOOLEAN
)
LANGUAGE SQL
STABLE
AS $$
SELECT 
    t.table_name::TEXT,
    COALESCE(pg_t.rowsecurity, false)::BOOLEAN as rls_enabled,
    COALESCE(p.policy_count, 0)::INTEGER as policy_count,
    CASE WHEN c.column_name IS NOT NULL THEN TRUE ELSE FALSE END as has_business_id
FROM information_schema.tables t
LEFT JOIN pg_tables pg_t ON (pg_t.tablename = t.table_name AND pg_t.schemaname = 'public')
LEFT JOIN (
    SELECT schemaname, tablename, COUNT(*) as policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    GROUP BY schemaname, tablename
) p ON p.tablename = t.table_name
LEFT JOIN information_schema.columns c ON (
    c.table_name = t.table_name 
    AND c.column_name = 'business_id'
    AND c.table_schema = 'public'
)
WHERE t.table_schema = 'public' 
AND t.table_name IN ('profiles', 'customers', 'layouts', 'invoices', 'items')
ORDER BY t.table_name;
$$;

-- Display the validation results
SELECT 'RBAC Multi-Tenant Setup Complete! 🎉' as status;
SELECT 'Validation Results:' as info;
SELECT * FROM public.validate_rbac_setup();

-- Display helper functions
SELECT 'Helper Functions Created:' as info;
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('current_business_id', 'is_admin', 'is_manager', 'validate_rbac_setup')
ORDER BY routine_name;
