/**
 * Debug Session Issue
 * Quick test to see what's happening with authentication
 */

import puppeteer from 'puppeteer';

async function debugSession() {
  console.log('🔍 Debugging session persistence issue...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1200, height: 800 }
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('🖥️ Browser Console:', msg.text());
  });

  // Enable request/response logging
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log(`📡 ${response.status()} ${response.url()}`);
    }
  });

  try {
    // Step 1: Go to login page
    console.log('\n1️⃣ Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    // Step 2: Fill in credentials
    console.log('2️⃣ Filling in credentials...');
    await page.type('input[type="email"]', 'laurence@fyves.com');
    await page.type('input[type="password"]', 'Hennie@@12');
    
    // Step 3: Submit login
    console.log('3️⃣ Submitting login...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation or response
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 4: Check current URL
    const currentUrl = page.url();
    console.log('4️⃣ Current URL after login:', currentUrl);
    
    // Step 5: Check cookies
    const cookies = await page.cookies();
    console.log('5️⃣ Cookies after login:');
    cookies.forEach(cookie => {
      if (cookie.name.includes('sb-') || cookie.name.includes('supabase')) {
        console.log(`   ${cookie.name}: ${cookie.value.substring(0, 50)}...`);
      }
    });
    
    // Step 6: Test session API directly
    console.log('6️⃣ Testing session API...');
    const sessionResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include'
        });
        return {
          status: response.status,
          data: await response.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('Session API Response:', sessionResponse);
    
    // Step 7: Wait and observe
    console.log('7️⃣ Waiting 5 seconds to observe behavior...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const finalUrl = page.url();
    console.log('8️⃣ Final URL:', finalUrl);
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await browser.close();
  }
}

debugSession();
