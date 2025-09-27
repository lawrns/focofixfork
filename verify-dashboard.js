const puppeteer = require('playwright');

async function verifyDashboardFunctionality() {
  console.log('🚀 Starting Dashboard Functionality Verification...\n');

  const browser = await puppeteer.chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to login page
    console.log('📝 Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    // Check if login page loaded
    const loginTitle = await page.title();
    console.log(`✅ Login page loaded: ${loginTitle}`);

    // Try to login (this might fail with test credentials, but we can verify the form works)
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const submitButton = await page.$('button[type="submit"]');

    if (emailInput && passwordInput && submitButton) {
      console.log('✅ Login form elements found');

      // Fill form (will likely fail authentication but verifies form works)
      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');
      console.log('✅ Login form filled');

      // Click submit (may redirect to dashboard or show error)
      await submitButton.click();
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      console.log(`📍 Current URL after login attempt: ${currentUrl}`);

      // Check if we got redirected anywhere
      if (currentUrl.includes('dashboard')) {
        console.log('✅ Successfully navigated to dashboard!');
      } else if (currentUrl.includes('login')) {
        console.log('ℹ️  Still on login page (expected with test credentials)');
      }

      // Try to find navigation elements
      const navElements = await page.$$('nav a, [role="navigation"] a, button');
      console.log(`📊 Found ${navElements.length} potential navigation elements`);

      // Look for common navigation patterns
      const navTexts = [];
      for (let i = 0; i < Math.min(navElements.length, 10); i++) {
        try {
          const text = await navElements[i].textContent();
          if (text && text.trim()) {
            navTexts.push(text.trim());
          }
        } catch (e) {
          // Skip elements that can't be read
        }
      }

      console.log('🧭 Navigation elements found:', navTexts.join(', '));

      // Test some basic button clicks
      const buttons = await page.$$('button');
      console.log(`🔘 Found ${buttons.length} buttons on page`);

      // Test first few buttons (safely)
      for (let i = 0; i < Math.min(buttons.length, 3); i++) {
        try {
          const buttonText = await buttons[i].textContent();
          if (buttonText && buttonText.trim() && !buttonText.includes('Submit') && !buttonText.includes('Login')) {
            console.log(`🖱️  Testing button: "${buttonText.trim()}"`);
            await buttons[i].click();
            await page.waitForTimeout(1000);

            // Check for dialogs/modals
            const dialogs = await page.$$('[role="dialog"], .modal, .dialog');
            if (dialogs.length > 0) {
              console.log(`✅ Button opened dialog/modal`);
              // Try to close it
              await page.keyboard.press('Escape');
              await page.waitForTimeout(500);
            }
          }
        } catch (e) {
          console.log(`⚠️  Button ${i + 1} test failed (expected for some buttons)`);
        }
      }

    } else {
      console.log('❌ Login form elements not found');
    }

    // Test direct navigation to dashboard (may require auth)
    console.log('\n📊 Testing direct dashboard access...');
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');

    const dashboardUrl = page.url();
    if (dashboardUrl.includes('dashboard')) {
      console.log('✅ Dashboard page accessible');

      // Look for dashboard content
      const headings = await page.$$('h1, h2, h3');
      const headingTexts = [];
      for (let i = 0; i < Math.min(headings.length, 5); i++) {
        const text = await headings[i].textContent();
        if (text && text.trim()) {
          headingTexts.push(text.trim());
        }
      }
      console.log('📋 Dashboard headings:', headingTexts.join(', '));

      // Count actionable elements
      const allButtons = await page.$$('button');
      const links = await page.$$('a');
      const inputs = await page.$$('input');

      console.log(`📊 Dashboard elements: ${allButtons.length} buttons, ${links.length} links, ${inputs.length} inputs`);

    } else {
      console.log('ℹ️  Dashboard requires authentication (expected)');
    }

    console.log('\n🎉 Dashboard functionality verification completed!');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await browser.close();
  }
}

verifyDashboardFunctionality();
