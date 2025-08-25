-- =====================================================
-- EMERGENCY RLS FIX FOR INFINITE RECURSION
-- Copy and paste this ENTIRE script into Supabase SQL Editor
-- =====================================================

-- Step 0: Drop ALL existing policies first (more comprehensive)
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE tablename IN ('profiles', 'businesses', 'customers', 'invoices', 'items')
          AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Step 1: Disable RLS to break the infinite recursion loop
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS items DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing conflicting policies (including new ones)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "Users can access their business data" ON businesses;
DROP POLICY IF EXISTS "businesses_select_member" ON businesses;
DROP POLICY IF EXISTS "businesses_update_admin" ON businesses;
DROP POLICY IF EXISTS "Business users can view business customers" ON customers;
DROP POLICY IF EXISTS "Business users can manage business customers" ON customers;
DROP POLICY IF EXISTS "customers_select_business" ON customers;
DROP POLICY IF EXISTS "customers_manage_business" ON customers;
DROP POLICY IF EXISTS "Business users can view business invoices" ON invoices;
DROP POLICY IF EXISTS "Business users can manage business invoices" ON invoices;
DROP POLICY IF EXISTS "invoices_select_business" ON invoices;
DROP POLICY IF EXISTS "invoices_manage_business" ON invoices;
DROP POLICY IF EXISTS "Users can view their own items" ON items;
DROP POLICY IF EXISTS "Users can insert their own items" ON items;
DROP POLICY IF EXISTS "Users can update their own items" ON items;
DROP POLICY IF EXISTS "Users can delete their own items" ON items;
DROP POLICY IF EXISTS "items_select_business" ON items;
DROP POLICY IF EXISTS "items_manage_business" ON items;

-- Step 3: Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, safe policies
-- Profiles: Users can only access their own profile using auth.uid()
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Businesses: Allow access based on business_id in profiles
CREATE POLICY "businesses_select_member" ON businesses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = businesses.id
    )
  );

-- Customers: Allow access based on business membership
CREATE POLICY "customers_select_business" ON customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = customers.business_id
    )
  );

-- Invoices: Allow access based on business membership
CREATE POLICY "invoices_select_business" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = invoices.business_id
    )
  );

-- Add basic policies for insert/update/delete
CREATE POLICY "customers_manage_business" ON customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = customers.business_id
    )
  );

CREATE POLICY "invoices_manage_business" ON invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = invoices.business_id
    )
  );

-- Step 5: Verify the fix
SELECT 'RLS policies have been reset and fixed!' as status;

-- Check current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('profiles', 'businesses', 'customers', 'invoices')
ORDER BY tablename, policyname;
