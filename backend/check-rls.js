// Check RLS status on businesses table
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase service key environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRLSStatus() {
  try {
    console.log('🔍 Checking RLS status on businesses table...\n');

    // Query the pg_class table to check if RLS is enabled
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('pg_class')
      .select('relname, relrowsecurity')
      .eq('relname', 'businesses')
      .single();

    if (rlsError) {
      console.error('❌ Error checking RLS status:', rlsError.message);
      return;
    }

    if (rlsStatus) {
      console.log(`Table: ${rlsStatus.relname}`);
      console.log(`RLS Enabled: ${rlsStatus.relrowsecurity}`);
      
      if (!rlsStatus.relrowsecurity) {
        console.log('❌ RLS is NOT enabled on businesses table!');
        console.log('💡 Run: ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;');
      } else {
        console.log('✅ RLS is enabled on businesses table');
      }
    }

    // Check policies
    console.log('\n🔍 Checking RLS policies...');
    
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, tablename')
      .eq('tablename', 'businesses');

    if (policiesError) {
      console.error('❌ Error checking policies:', policiesError.message);
      return;
    }

    if (policies && policies.length > 0) {
      console.log('✅ Found policies:');
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd})`);
      });
    } else {
      console.log('❌ No policies found for businesses table');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkRLSStatus();
