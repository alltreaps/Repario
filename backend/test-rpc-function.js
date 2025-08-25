// Simple test to verify database connection and RPC function
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRPCFunction() {
  try {
    console.log('🧪 Testing RPC function availability...\n');

    // Test if the create_business_with_admin function exists
    console.log('1. Testing create_business_with_admin function...');
    
    // This should fail with an authentication error (not function not found)
    const { data, error } = await supabase.rpc('create_business_with_admin', {
      p_business_name: 'Test Business',
      p_admin_user_id: '00000000-0000-0000-0000-000000000000', // fake UUID
      p_admin_full_name: 'Test User',
      p_admin_phone: '+1-555-123-4567'
    });

    if (error) {
      if (error.message.includes('permission denied') || error.message.includes('not authenticated')) {
        console.log('✅ Function exists but requires authentication (expected)');
        console.log(`   Error: ${error.message}`);
      } else if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('❌ Function does not exist - migration may not be complete');
        console.log(`   Error: ${error.message}`);
      } else {
        console.log('⚠️  Unexpected error:');
        console.log(`   Error: ${error.message}`);
      }
    } else {
      console.log('⚠️  Function executed without authentication (unexpected)');
      console.log('   Data:', data);
    }

    console.log('\n2. Testing basic database connection...');
    
    // Test basic connection by checking if businesses table exists
    const { data: tableTest, error: tableError } = await supabase
      .from('businesses')
      .select('count', { count: 'exact', head: true });

    if (tableError) {
      if (tableError.message.includes('401') || tableError.message.includes('Unauthorized')) {
        console.log('✅ Businesses table exists but requires authentication (expected)');
      } else if (tableError.message.includes('relation') && tableError.message.includes('does not exist')) {
        console.log('❌ Businesses table does not exist - migration needed');
      } else {
        console.log('⚠️  Unexpected table error:');
        console.log(`   Error: ${tableError.message}`);
      }
    } else {
      console.log('⚠️  Businesses table accessible without authentication (unexpected)');
    }

    console.log('\n✅ Database connection test complete!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testRPCFunction();
