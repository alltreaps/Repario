// Test script to diagnose authentication and RLS issues
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnoseAuthIssue() {
  try {
    console.log('🔍 Diagnosing authentication and RLS issue...\n');

    // Test 1: Check current session
    console.log('1. Checking current session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError.message);
      return;
    }

    if (!session) {
      console.log('❌ No active session found');
      console.log('💡 User needs to log in first');
      return;
    }

    console.log('✅ Session found for user:', session.user.email);
    console.log(`   User ID: ${session.user.id}`);
    console.log(`   Access token exists: ${!!session.access_token}`);

    // Test 2: Check profile
    console.log('\n2. Checking user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile error:', profileError.message);
      console.log('💡 User profile might not exist or RLS is blocking access');
      return;
    }

    if (!profile) {
      console.log('❌ No profile found for user');
      return;
    }

    console.log('✅ Profile found:');
    console.log(`   Full name: ${profile.full_name || 'Not set'}`);
    console.log(`   Role: ${profile.role || 'Not set'}`);
    console.log(`   Business ID: ${profile.business_id || 'Not set'}`);

    // Test 3: Check businesses table access
    console.log('\n3. Testing businesses table access...');
    
    if (!profile.business_id) {
      console.log('❌ User has no business_id in profile');
      console.log('💡 User needs to be assigned to a business');
      return;
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', profile.business_id)
      .single();

    if (businessError) {
      console.error('❌ Business query error:', businessError.message);
      console.log('💡 This is the 401 Unauthorized error we\'re seeing');
      
      // Test RLS function
      console.log('\n4. Testing current_business_id() function...');
      const { data: functionResult, error: functionError } = await supabase
        .rpc('current_business_id');

      if (functionError) {
        console.error('❌ current_business_id() error:', functionError.message);
      } else {
        console.log('✅ current_business_id() result:', functionResult);
      }
      
      return;
    }

    if (business) {
      console.log('✅ Business access successful:');
      console.log(`   Business name: ${business.name}`);
      console.log(`   Business ID: ${business.id}`);
    }

    console.log('\n✅ All authentication checks passed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

diagnoseAuthIssue();
