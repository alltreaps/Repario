-- =====================================================
-- CLEAN RLS RESET - Version 2
-- This version handles existing policies safely
-- =====================================================

-- Step 1: Completely drop and recreate ALL policies using dynamic SQL
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    -- Drop all existing policies on target tables
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE tablename IN ('profiles', 'businesses', 'customers', 'invoices', 'items')
          AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', 
                      pol.policyname, pol.schemaname, pol.tablename);
        RAISE NOTICE 'Dropped policy % on table %', pol.policyname, pol.tablename;
    END LOOP;
END $$;

-- Step 2: Disable RLS temporarily
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS items DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Step 4: Create NEW policies (guaranteed no conflicts)
-- Profiles: Simple auth.uid() based policies
CREATE POLICY "profiles_own_select" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_own_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_own_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Businesses: Access via business membership
CREATE POLICY "business_member_select" ON businesses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = businesses.id
    )
  );

CREATE POLICY "business_admin_update" ON businesses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = businesses.id 
      AND profiles.role = 'admin'
    )
  );

-- Customers: Business-scoped access
CREATE POLICY "customer_business_select" ON customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = customers.business_id
    )
  );

CREATE POLICY "customer_business_all" ON customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = customers.business_id
    )
  );

-- Invoices: Business-scoped access
CREATE POLICY "invoice_business_select" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = invoices.business_id
    )
  );

CREATE POLICY "invoice_business_all" ON invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = invoices.business_id
    )
  );

-- Items: Business-scoped access (if items table has business_id)
CREATE POLICY "item_business_select" ON items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = items.business_id
    )
  );

CREATE POLICY "item_business_all" ON items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = items.business_id
    )
  );

-- Step 5: Verify success
SELECT 'RLS policies completely reset and recreated!' as status;

-- Show new policies
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename IN ('profiles', 'businesses', 'customers', 'invoices', 'items')
  AND schemaname = 'public'
ORDER BY tablename, policyname;
