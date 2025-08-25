#!/usr/bin/env node

// Test actual Supabase connectivity
const baseUrl = 'http://localhost:3001';

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase connection with real data...\n');

  // Test user registration with real data
  const testUser = {
    email: 'test@example.com',
    password: 'testpassword123',
    fullName: 'Test User'
  };

  try {
    console.log('📝 Testing user registration...');
    const response = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Registration successful!');
      console.log('👤 User created:', {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role
      });
      console.log('🔑 Tokens received:', {
        accessToken: data.accessToken ? '✅ Present' : '❌ Missing',
        refreshToken: data.refreshToken ? '✅ Present' : '❌ Missing'
      });

      // Test the access token by making an authenticated request
      console.log('\n🛡️  Testing authenticated request...');
      const protectedResponse = await fetch(`${baseUrl}/api/layouts`, {
        headers: {
          'Authorization': `Bearer ${data.accessToken}`
        }
      });
      
      const protectedData = await protectedResponse.json();
      
      if (protectedResponse.ok) {
        console.log('✅ Authenticated request successful!');
        console.log('📋 Layouts data:', protectedData);
      } else {
        console.log('❌ Authenticated request failed:', protectedData);
      }

    } else {
      console.log('📝 Registration response:', response.status, data);
      
      // Check if it's because user already exists
      if (response.status === 409) {
        console.log('ℹ️  User already exists - testing login instead...');
        
        const loginResponse = await fetch(`${baseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testUser.email,
            password: testUser.password
          })
        });
        
        const loginData = await loginResponse.json();
        
        if (loginResponse.ok) {
          console.log('✅ Login successful!');
          console.log('👤 User:', {
            id: loginData.user.id,
            email: loginData.user.email,
            role: loginData.user.role
          });
        } else {
          console.log('❌ Login failed:', loginData);
        }
      }
    }

  } catch (error) {
    console.log('❌ Supabase connection test failed:', error.message);
  }

  console.log('\n🎯 Supabase connection test completed!');
}

// Run the test
testSupabaseConnection().catch(console.error);
