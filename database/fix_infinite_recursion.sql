-- =====================================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- Run this in Supabase SQL Editor to fix 500 errors
-- =====================================================

-- Step 1: Disable RLS temporarily to break recursion
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS layouts DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies comprehensively
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE tablename IN ('profiles', 'businesses', 'customers', 'invoices', 'items', 'layouts')
          AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE layouts ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, non-recursive policies
-- Profiles: Direct auth.uid() check (no recursion)
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Businesses: Simple business_id check
CREATE POLICY "businesses_select_member" ON businesses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = businesses.id
    )
  );

-- Customers: Business membership check
CREATE POLICY "customers_select_business" ON customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = customers.business_id
    )
  );

CREATE POLICY "customers_manage_business" ON customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = customers.business_id
    )
  );

-- Invoices: Business membership check
CREATE POLICY "invoices_select_business" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = invoices.business_id
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

-- Items: Business membership check
CREATE POLICY "items_select_business" ON items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = items.business_id
    )
  );

CREATE POLICY "items_manage_business" ON items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = items.business_id
    )
  );

-- Layouts: Business membership check
CREATE POLICY "layouts_select_business" ON layouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = layouts.business_id
    )
  );

CREATE POLICY "layouts_manage_business" ON layouts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = layouts.business_id
    )
  );

-- Verify the fix
SELECT 'RLS policies fixed - infinite recursion resolved!' as status;
