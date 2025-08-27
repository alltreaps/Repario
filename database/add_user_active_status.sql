-- Add is_active field to profiles table for user deactivation functionality
-- This allows admins to deactivate users without deleting them

-- =====================================================
-- 1. ADD IS_ACTIVE COLUMN TO PROFILES TABLE
-- =====================================================

-- Check if is_active column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE 'Added is_active column to profiles table';
    ELSE
        RAISE NOTICE 'is_active column already exists in profiles table';
    END IF;
END $$;

-- Create index for better performance on is_active field
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- =====================================================
-- 2. UPDATE EXISTING ADMIN FUNCTION TO INCLUDE IS_ACTIVE
-- =====================================================

-- Drop and recreate the get_business_users_for_admin function to include is_active
DROP FUNCTION IF EXISTS get_business_users_for_admin(UUID);

CREATE OR REPLACE FUNCTION get_business_users_for_admin(admin_user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT,
  logo_url TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  business_id UUID
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
    p.is_active,
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

-- =====================================================
-- 3. CREATE FUNCTION TO GET ONLY ACTIVE USERS
-- =====================================================

CREATE OR REPLACE FUNCTION get_active_business_users_for_admin(admin_user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT,
  logo_url TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  business_id UUID
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
    p.is_active,
    p.created_at,
    p.updated_at,
    p.business_id
  FROM profiles p
  WHERE p.business_id = (
    SELECT admin_p.business_id 
    FROM profiles admin_p
    WHERE admin_p.id = admin_user_id
  )
  AND p.is_active = true
  ORDER BY p.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_active_business_users_for_admin(UUID) IS 'Get only active users in the same business as the admin user';
