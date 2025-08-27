-- Debug query to check user data
-- Run this in Supabase SQL Editor to see what's in the database

-- Check all profiles and their business_ids
SELECT 
  id,
  email,
  full_name,
  phone,
  role,
  business_id,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- Check if the get_business_users function works
-- Replace 'your-business-id-here' with the actual business_id from the first query
-- SELECT * FROM get_business_users('your-business-id-here');
