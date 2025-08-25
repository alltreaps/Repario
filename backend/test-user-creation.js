// Test user creation with backend API
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase service key environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUserWithService() {
  try {
    console.log('🧪 Testing user creation with service role...\n');

    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';

    console.log(`Creating user: ${testEmail}`);

    // Create user with admin API (bypasses email confirmation)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: 'Test User',
        phone: '+1-555-123-4567'
      }
    });

    if (authError) {
      console.error('❌ Auth user creation failed:', authError.message);
      return;
    }

    if (!authUser.user) {
      console.error('❌ No user returned from creation');
      return;
    }

    console.log('✅ Auth user created:', authUser.user.id);

    // Create business with the admin function
    console.log('\nCreating business...');
    const { data: businessId, error: businessError } = await supabase
      .rpc('create_business_with_admin', {
        p_business_name: 'Test Business',
        p_admin_user_id: authUser.user.id,
        p_admin_full_name: 'Test User',
        p_admin_phone: '+1-555-123-4567'
      });

    if (businessError) {
      console.error('❌ Business creation failed:', businessError.message);
      return;
    }

    console.log('✅ Business created:', businessId);

    // Test sign-in
    console.log('\nTesting sign-in...');
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const anonSupabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: signInData, error: signInError } = await anonSupabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      console.error('❌ Sign-in failed:', signInError.message);
    } else {
      console.log('✅ Sign-in successful:', signInData.user?.id);
    }

    // Clean up
    console.log('\nCleaning up test user...');
    await supabase.auth.admin.deleteUser(authUser.user.id);
    console.log('✅ Test user cleaned up');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createUserWithService();
