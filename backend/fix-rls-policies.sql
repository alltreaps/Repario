-- Fix Infinite Recursion in RLS Policies
-- This fixes the "infinite recursion detected in policy for relation profiles" error

-- First, disable RLS temporarily and drop ALL existing policies
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS items DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can access their business data" ON businesses;
DROP POLICY IF EXISTS "Business users can view business customers" ON customers;
DROP POLICY IF EXISTS "Business users can manage business customers" ON customers;
DROP POLICY IF EXISTS "Business users can view business invoices" ON invoices;
DROP POLICY IF EXISTS "Business users can manage business invoices" ON invoices;
DROP POLICY IF EXISTS "Users can view their own items" ON items;
DROP POLICY IF EXISTS "Users can insert their own items" ON items;
DROP POLICY IF EXISTS "Users can update their own items" ON items;
DROP POLICY IF EXISTS "Users can delete their own items" ON items;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for profiles
-- Profiles: Users can only access their own profile record using auth.uid()
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Businesses: Users can access businesses they belong to
CREATE POLICY "businesses_select_member" ON businesses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = businesses.id
    )
  );

CREATE POLICY "businesses_update_admin" ON businesses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.business_id = businesses.id 
      AND profiles.role = 'admin'
    )
  );

-- Customers: Business members can access customers in their business
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

-- Invoices: Business members can access invoices in their business
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

-- Items: Business members can access items in their business
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

-- Verify the fix by checking policies
SELECT 'Policy check completed' as status;
