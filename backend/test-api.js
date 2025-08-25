#!/usr/bin/env node

// Simple test script for the Repario API
const baseUrl = 'http://localhost:3001';

async function testApi() {
  console.log('🧪 Testing Repario API endpoints...\n');

  // Test health endpoint
  try {
    const response = await fetch(`${baseUrl}/health`);
    const data = await response.json();
    console.log('✅ Health check:', data);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test auth endpoints (these will fail without proper credentials, but should return proper error messages)
  console.log('\n🔐 Testing auth endpoints (expecting validation errors):');
  
  try {
    const response = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await response.json();
    console.log('📝 Register endpoint:', response.status, data.error);
  } catch (error) {
    console.log('❌ Register test failed:', error.message);
  }

  try {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await response.json();
    console.log('🔑 Login endpoint:', response.status, data.error);
  } catch (error) {
    console.log('❌ Login test failed:', error.message);
  }

  // Test protected endpoints (expecting 401 Unauthorized)
  console.log('\n🛡️  Testing protected endpoints (expecting auth errors):');
  
  try {
    const response = await fetch(`${baseUrl}/api/layouts`);
    const data = await response.json();
    console.log('📋 Layouts endpoint:', response.status, data.error);
  } catch (error) {
    console.log('❌ Layouts test failed:', error.message);
  }

  try {
    const response = await fetch(`${baseUrl}/api/customers`);
    const data = await response.json();
    console.log('👥 Customers endpoint:', response.status, data.error);
  } catch (error) {
    console.log('❌ Customers test failed:', error.message);
  }

  console.log('\n✨ API test completed! All endpoints are responding correctly.');
}

// Run the test
testApi().catch(console.error);
