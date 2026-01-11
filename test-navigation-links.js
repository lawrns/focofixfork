const puppeteer = require('puppeteer');

async function testNavigationLinks() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🔍 Testing navigation links...\n');
  
  try {
    // Test landing page
    console.log('1. Testing landing page...');
    await page.goto('http://localhost:3002');
    await page.waitForSelector('nav', { timeout: 5000 });
    
    // Check Log in button
    const loginButton = await page.$('a[href="/login"]');
    if (loginButton) {
      console.log('   ✅ Log in button links to /login');
    } else {
      console.log('   ❌ Log in button not found or not linked correctly');
    }
    
    // Check Get Started button
    const registerButton = await page.$('a[href="/register"]');
    if (registerButton) {
      console.log('   ✅ Get Started button links to /register');
    } else {
      console.log('   ❌ Get Started button not found or not linked correctly');
    }
    
    // Test mobile menu
    console.log('\n2. Testing mobile menu...');
    await page.click('button[aria-label="Open mobile menu"]');
    await page.waitForTimeout(500);
    
    const mobileLoginButton = await page.$('div.mobile-menu a[href="/login"]');
    const mobileRegisterButton = await page.$('div.mobile-menu a[href="/register"]');
    
    if (mobileLoginButton) {
      console.log('   ✅ Mobile Log in button links to /login');
    } else {
      console.log('   ❌ Mobile Log in button not found or not linked correctly');
    }
    
    if (mobileRegisterButton) {
      console.log('   ✅ Mobile Get Started button links to /register');
    } else {
      console.log('   ❌ Mobile Get Started button not found or not linked correctly');
    }
    
    // Test login page navigation
    console.log('\n3. Testing login page navigation...');
    await page.goto('http://localhost:3002/login');
    await page.waitForSelector('form', { timeout: 5000 });
    console.log('   ✅ Login page loads successfully');
    
    // Test register page navigation
    console.log('\n4. Testing register page navigation...');
    await page.goto('http://localhost:3002/register');
    await page.waitForSelector('form', { timeout: 5000 });
    console.log('   ✅ Register page loads successfully');
    
    // Test app navigation
    console.log('\n5. Testing app navigation...');
    await page.goto('http://localhost:3002/app');
    await page.waitForSelector('.left-rail', { timeout: 5000 });
    console.log('   ✅ App loads successfully');
    
    // Check main navigation links
    const navLinks = await page.$$eval('.left-rail a', links => 
      links.map(link => ({ text: link.textContent, href: link.href }))
    );
    
    console.log('   Main navigation links:');
    navLinks.forEach(link => {
      console.log(`   - ${link.text}: ${link.href}`);
    });
    
    // Test sign out flow
    console.log('\n6. Testing sign out flow...');
    await page.click('.profile-dropdown button');
    await page.waitForTimeout(500);
    
    const signOutButton = await page.$('text=Sign out');
    if (signOutButton) {
      console.log('   ✅ Sign out button found');
      await signOutButton.click();
      await page.waitForTimeout(1000);
      console.log('   ✅ Sign out clicked');
    } else {
      console.log('   ❌ Sign out button not found');
    }
    
    console.log('\n✅ Navigation testing complete!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await browser.close();
  }
}

testNavigationLinks();
