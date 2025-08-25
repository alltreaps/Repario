-- Multi-Tenant Testing Script
-- Run this after the multi-tenant migration to verify everything works correctly

-- =====================================================
-- TEST 1: Verify Schema Structure
-- =====================================================

SELECT 'Testing Schema Structure...' as test_status;

-- Check if businesses table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'businesses') 
        THEN '✅ businesses table exists'
        ELSE '❌ businesses table missing'
    END as businesses_table_check;

-- Check if profiles has business_id
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_id') 
        THEN '✅ profiles.business_id exists'
        ELSE '❌ profiles.business_id missing'
    END as profiles_business_id_check;

-- Check if helper function exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'current_business_id') 
        THEN '✅ current_business_id() function exists'
        ELSE '❌ current_business_id() function missing'
    END as helper_function_check;

-- =====================================================
-- TEST 2: Test Helper Functions
-- =====================================================

SELECT 'Testing Helper Functions...' as test_status;

-- Test creating a business (you'll need to replace with a real user UUID)
-- Note: This will fail if you don't have a real user in auth.users
-- Uncomment and replace the UUID below with a real user ID for testing

/*
DO $$ 
DECLARE
    test_business_id UUID;
    test_user_id UUID := '12345678-1234-1234-1234-123456789012'; -- Replace with real user ID
BEGIN
    -- Create test business
    SELECT public.create_business_with_admin(
        'Test Business',
        test_user_id,
        'Test Admin',
        '+1-555-TEST'
    ) INTO test_business_id;
    
    RAISE NOTICE 'Created test business: %', test_business_id;
END $$;
*/

-- =====================================================
-- TEST 3: Verify RLS Policies
-- =====================================================

SELECT 'Testing RLS Policies...' as test_status;

-- Check if RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('businesses', 'profiles', 'customers', 'layouts', 'invoices', 'invoice_items', 'items')
ORDER BY tablename;

-- Check policy count for each table
SELECT 
    schemaname,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- =====================================================
-- TEST 4: Verify Indexes
-- =====================================================

SELECT 'Testing Indexes...' as test_status;

-- Check if business_id indexes exist
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname LIKE '%business_id%'
ORDER BY tablename;

-- =====================================================
-- TEST 5: Data Migration Verification
-- =====================================================

SELECT 'Testing Data Migration State...' as test_status;

-- Check if there's any data without business_id (should be none after migration)
SELECT 
    'customers' as table_name,
    COUNT(*) as total_rows,
    COUNT(business_id) as rows_with_business_id,
    COUNT(*) - COUNT(business_id) as rows_missing_business_id
FROM customers
UNION ALL
SELECT 
    'layouts' as table_name,
    COUNT(*) as total_rows,
    COUNT(business_id) as rows_with_business_id,
    COUNT(*) - COUNT(business_id) as rows_missing_business_id
FROM layouts
UNION ALL
SELECT 
    'invoices' as table_name,
    COUNT(*) as total_rows,
    COUNT(business_id) as rows_with_business_id,
    COUNT(*) - COUNT(business_id) as rows_missing_business_id
FROM invoices
UNION ALL
SELECT 
    'items' as table_name,
    COUNT(*) as total_rows,
    COUNT(business_id) as rows_with_business_id,
    COUNT(*) - COUNT(business_id) as rows_missing_business_id
FROM items;

-- =====================================================
-- TEST 6: Business Data Summary
-- =====================================================

SELECT 'Business Data Summary...' as test_status;

-- Show all businesses and their data counts
SELECT 
    b.id as business_id,
    b.name as business_name,
    COUNT(DISTINCT p.id) as user_count,
    COUNT(DISTINCT c.id) as customer_count,
    COUNT(DISTINCT l.id) as layout_count,
    COUNT(DISTINCT i.id) as invoice_count,
    COUNT(DISTINCT it.id) as item_count
FROM businesses b
LEFT JOIN profiles p ON p.business_id = b.id
LEFT JOIN customers c ON c.business_id = b.id
LEFT JOIN layouts l ON l.business_id = b.id
LEFT JOIN invoices i ON i.business_id = b.id
LEFT JOIN items it ON it.business_id = b.id
GROUP BY b.id, b.name
ORDER BY b.created_at;

-- =====================================================
-- COMPLETION
-- =====================================================

SELECT 'Multi-tenant testing completed! 🎉

Review the results above:
1. ✅ All schema elements should be present
2. ✅ RLS should be enabled on all tables
3. ✅ All data should have business_id assigned
4. ✅ Indexes should be in place
5. ✅ Business summary should show your data distribution

If any tests show issues, review the migration script and re-run as needed.' as test_completion;
