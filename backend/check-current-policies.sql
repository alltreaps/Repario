-- Fix RLS Policy Issues for Profiles Table
-- This script will drop problematic circular policies and create proper ones

-- First, let's see what's currently in the database
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('profiles', 'businesses', 'customers', 'invoices')
ORDER BY tablename, policyname;
