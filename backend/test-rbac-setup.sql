-- Test Script for RBAC Multi-Tenant System
-- Run this after the main RBAC setup to verify everything works

-- =====================================================
-- TEST 1: VERIFY HELPER FUNCTIONS EXIST
-- =====================================================

SELECT 'Testing Helper Functions...' as test_section;

-- Test if helper functions exist
SELECT 
    'current_business_id' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'current_business_id' 
        AND routine_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

SELECT 
    'is_admin' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'is_admin' 
        AND routine_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

SELECT 
    'is_manager' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'is_manager' 
        AND routine_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

-- =====================================================
-- TEST 2: VERIFY TABLE STRUCTURE
-- =====================================================

SELECT 'Testing Table Structure...' as test_section;

-- Check if all tables have business_id column
SELECT 
    table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = t.table_name 
        AND column_name = 'business_id'
        AND table_schema = 'public'
    ) THEN 'HAS business_id' ELSE 'MISSING business_id' END as business_id_status
FROM (
    VALUES ('profiles'), ('customers'), ('layouts'), ('invoices'), ('items')
) AS t(table_name);

-- Check profiles table role constraint
SELECT 
    'profiles' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.check_constraints cc
        JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
        WHERE ccu.table_name = 'profiles' 
        AND ccu.column_name = 'role'
        AND cc.check_clause LIKE '%admin%manager%user%'
    ) THEN 'HAS PROPER ROLE CONSTRAINT' ELSE 'MISSING ROLE CONSTRAINT' END as role_constraint_status;

-- =====================================================
-- TEST 3: VERIFY RLS POLICIES
-- =====================================================

SELECT 'Testing RLS Policies...' as test_section;

-- Count policies for each table
SELECT 
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ' ORDER BY policyname) as policy_names
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'customers', 'layouts', 'invoices', 'items')
GROUP BY tablename
ORDER BY tablename;

-- Check if RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'customers', 'layouts', 'invoices', 'items')
ORDER BY tablename;

-- =====================================================
-- TEST 4: VERIFY SPECIFIC POLICIES EXIST
-- =====================================================

SELECT 'Testing Specific Policies...' as test_section;

-- Check for the specific policy patterns we created
SELECT 
    tablename,
    policyname,
    cmd, -- INSERT, SELECT, UPDATE, DELETE
    permissive,
    CASE 
        WHEN policyname LIKE '%read:same-biz%' THEN 'READ POLICY'
        WHEN policyname LIKE '%write:same-biz:manager+%' THEN 'WRITE POLICY (MANAGER+)'
        WHEN policyname LIKE '%update:same-biz:manager+%' THEN 'UPDATE POLICY (MANAGER+)'
        WHEN policyname LIKE '%delete:same-biz:admin%' THEN 'DELETE POLICY (ADMIN)'
        WHEN policyname LIKE '%profiles:%' THEN 'PROFILES POLICY'
        ELSE 'OTHER'
    END as policy_type
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('customers', 'layouts', 'invoices', 'items', 'profiles')
AND (
    policyname LIKE '%read:same-biz%' OR
    policyname LIKE '%write:same-biz:manager+%' OR
    policyname LIKE '%update:same-biz:manager+%' OR
    policyname LIKE '%delete:same-biz:admin%' OR
    policyname LIKE '%profiles:%'
)
ORDER BY tablename, policy_type, policyname;

-- =====================================================
-- TEST 5: SUMMARY REPORT
-- =====================================================

SELECT 'RBAC Test Summary...' as test_section;

-- Use the validation function we created
SELECT * FROM public.validate_rbac_setup();

SELECT 'RBAC Multi-Tenant Test Complete! ✅' as final_status;
