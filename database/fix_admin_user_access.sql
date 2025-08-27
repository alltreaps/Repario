-- =====================================================
-- FIX ADMIN USER ACCESS - Allow admins to see all users in their business
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop the restrictive profiles select policy
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;

-- Create new policies that allow:
-- 1. Users to see their own profile
-- 2. Admins to see all profiles in their business

-- Policy 1: Users can see their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy 2: Admins can see all profiles in their business
CREATE POLICY "profiles_select_admin_business" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role = 'admin'
      AND admin_profile.business_id = profiles.business_id
    )
  );

-- Policy 3: Managers can see all profiles in their business (optional)
CREATE POLICY "profiles_select_manager_business" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles manager_profile
      WHERE manager_profile.id = auth.uid()
      AND manager_profile.role IN ('admin', 'manager')
      AND manager_profile.business_id = profiles.business_id
    )
  );

-- Verify the policies are created
SELECT 'Admin user access policies created successfully!' as status;

-- Show current policies for verification
SELECT schemaname, tablename, policyname, cmd, roles, qual 
FROM pg_policies 
WHERE tablename = 'profiles' 
AND schemaname = 'public'
ORDER BY policyname;
