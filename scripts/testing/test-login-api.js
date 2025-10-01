/**
 * Test Login API Directly
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testLoginAPI() {
  console.log('🔍 Testing login API directly...');
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'laurence@fyves.com',
        password: 'Hennie@@12'
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:');
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    // Check for Set-Cookie headers
    const setCookieHeaders = response.headers.get('set-cookie');
    console.log('Set-Cookie headers:', setCookieHeaders);
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testLoginAPI();
