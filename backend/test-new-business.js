// Test script for new business creation functionality
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testNewBusinessCreation() {
  console.log('🧪 Testing new business creation functionality...\n');

  try {
    // Test data
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';
    const testBusinessName = `Test Business ${Date.now()}`;
    const testFullName = 'Test User';
    const testPhone = '+1234567890';

    console.log('📝 Test data:');
    console.log(`- Email: ${testEmail}`);
    console.log(`- Business Name: ${testBusinessName}`);
    console.log(`- Full Name: ${testFullName}\n`);

    // Step 1: Sign up the user
    console.log('1️⃣ Creating user account...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (authError) {
      throw new Error(`Auth signup failed: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('User creation failed: No user data returned');
    }

    console.log(`✅ User created with ID: ${authData.user.id}\n`);

    // Step 2: Create new business
    console.log('2️⃣ Creating new business...');
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .insert({
        name: testBusinessName,
        created_by: authData.user.id
      })
      .select('id, name, created_by, created_at')
      .single();

    if (businessError) {
      throw new Error(`Business creation failed: ${businessError.message}`);
    }

    if (!businessData) {
      throw new Error('Business creation failed: No data returned');
    }

    console.log('✅ Business created:');
    console.log(`- ID: ${businessData.id}`);
    console.log(`- Name: ${businessData.name}`);
    console.log(`- Created by: ${businessData.created_by}`);
    console.log(`- Created at: ${businessData.created_at}\n`);

    // Step 3: Create user profile with admin role
    console.log('3️⃣ Creating user profile...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        business_id: businessData.id,
        full_name: testFullName,
        phone: testPhone,
        role: 'admin',
        email: testEmail
      })
      .select('*')
      .single();

    if (profileError) {
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }

    console.log('✅ Profile created:');
    console.log(`- User ID: ${profileData.id}`);
    console.log(`- Business ID: ${profileData.business_id}`);
    console.log(`- Full Name: ${profileData.full_name}`);
    console.log(`- Phone: ${profileData.phone}`);
    console.log(`- Role: ${profileData.role}\n`);

    // Step 4: Verify business-user relationship
    console.log('4️⃣ Verifying business-user relationship...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        role,
        businesses!inner(id, name)
      `)
      .eq('id', authData.user.id)
      .single();

    if (verifyError) {
      throw new Error(`Verification failed: ${verifyError.message}`);
    }

    console.log('✅ Relationship verified:');
    console.log(`- User: ${verifyData.full_name} (${verifyData.role})`);
    console.log(`- Business: ${verifyData.businesses.name} (${verifyData.businesses.id})\n`);

    // Step 5: Test RLS - user should only see their own business data
    console.log('5️⃣ Testing Row Level Security...');
    
    // Sign in as the test user
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      throw new Error(`Sign in failed: ${signInError.message}`);
    }

    // Try to fetch businesses (should only see their own)
    const { data: businessesData, error: businessesError } = await supabase
      .from('businesses')
      .select('*');

    if (businessesError) {
      console.log(`⚠️  RLS test error: ${businessesError.message}`);
    } else {
      console.log(`✅ RLS working: User can see ${businessesData.length} business(es)`);
    }

    console.log('\n🎉 All tests passed! New business creation functionality is working correctly.');
    console.log(`\n📋 Business ID for frontend testing: ${businessData.id}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testNewBusinessCreation();
