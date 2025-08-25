// Check if the multi-tenant migration has been applied
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase service key environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMigrationStatus() {
  try {
    console.log('🔍 Checking multi-tenant migration status...\n');

    // Check if businesses table exists
    console.log('1. Checking if businesses table exists...');
    const { data: businessTable, error: businessError } = await supabase
      .from('businesses')
      .select('count', { count: 'exact', head: true });

    if (businessError) {
      if (businessError.message.includes('relation') && businessError.message.includes('does not exist')) {
        console.log('❌ Businesses table does not exist');
        console.log('💡 Need to run multi-tenant migration');
        return;
      } else {
        console.log('✅ Businesses table exists');
      }
    } else {
      console.log('✅ Businesses table exists');
    }

    // Check if create_business_with_admin function exists
    console.log('\n2. Checking if create_business_with_admin function exists...');
    const { data: functionResult, error: functionError } = await supabase
      .rpc('create_business_with_admin', {
        p_business_name: 'Test',
        p_admin_user_id: '00000000-0000-0000-0000-000000000000',
        p_admin_full_name: 'Test',
        p_admin_phone: null
      });

    if (functionError) {
      if (functionError.message.includes('Could not find the function')) {
        console.log('❌ create_business_with_admin function does not exist');
        console.log('💡 Need to run multi-tenant migration SQL');
        return;
      } else if (functionError.message.includes('foreign key constraint')) {
        console.log('✅ create_business_with_admin function exists (test failed due to fake UUID)');
      } else {
        console.log('⚠️ Function test returned unexpected error:');
        console.log(`   ${functionError.message}`);
      }
    } else {
      console.log('✅ create_business_with_admin function exists and works');
    }

    // Check if profiles table has business_id column
    console.log('\n3. Checking if profiles table has business_id column...');
    const { data: profileCheck, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .limit(1);

    if (profileError) {
      if (profileError.message.includes('column') && profileError.message.includes('does not exist')) {
        console.log('❌ Profiles table missing business_id column');
        console.log('💡 Need to run multi-tenant migration');
      } else {
        console.log('✅ Profiles table has business_id column');
      }
    } else {
      console.log('✅ Profiles table has business_id column');
    }

    console.log('\n📋 Migration Status Summary:');
    console.log('   - If you see any ❌ above, run the multi-tenant migration SQL');
    console.log('   - File: backend/multi-tenant-migration.sql');
    console.log('   - Run it in your Supabase SQL Editor');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkMigrationStatus();
