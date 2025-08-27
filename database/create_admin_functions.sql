-- =====================================================
-- CREATE ADMIN FUNCTIONS - Allow admins to access business users
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop existing function first
DROP FUNCTION IF EXISTS get_business_users(uuid);

-- Function to get all users in a business (bypasses RLS)
CREATE OR REPLACE FUNCTION get_business_users(target_business_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  phone text,
  role text,
  logo_url text,
  created_at timestamptz,
  updated_at timestamptz,
  business_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.role,
    p.logo_url,
    p.created_at,
    p.updated_at,
    p.business_id
  FROM profiles p
  WHERE p.business_id = target_business_id
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_business_users(uuid) TO authenticated;

-- Optimized function that combines both queries into one
CREATE OR REPLACE FUNCTION get_business_users_for_admin(admin_user_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  phone text,
  role text,
  logo_url text,
  created_at timestamptz,
  updated_at timestamptz,
  business_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.role,
    p.logo_url,
    p.created_at,
    p.updated_at,
    p.business_id
  FROM profiles p
  WHERE p.business_id = (
    SELECT admin_p.business_id 
    FROM profiles admin_p
    WHERE admin_p.id = admin_user_id
  )
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_business_users_for_admin(uuid) TO authenticated;

-- Verify function creation
SELECT 'Admin functions created successfully!' as status;
