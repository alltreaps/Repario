-- =====================================================
-- FIX AMBIGUOUS BUSINESS_ID ERROR IN get_business_users_for_admin
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop and recreate the function with proper column aliases
DROP FUNCTION IF EXISTS get_business_users_for_admin(uuid);

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
SELECT 'Fixed ambiguous business_id error successfully!' as status;
