const { chromium } = require('playwright');

async function authenticateFlavatix() {
  console.log('🚀 Starting Flavatix authentication...');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to auth page
    console.log('📍 Navigating to auth page...');
    await page.goto('https://flavatix.netlify.app/auth');
    await page.waitForLoadState('networkidle');

    // Wait a moment for any dynamic content
    await page.waitForTimeout(2000);

    // Look for email input field
    const emailSelectors = [
      'input[type="email"]',
      'input[placeholder*="email" i]',
      'input[name="email"]',
      'input[id="email"]',
      '[data-testid="email-input"]',
      'input[type="text"]:first-of-type'
    ];

    let emailInput = null;
    for (const selector of emailSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          emailInput = element;
          console.log(`✅ Found email input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!emailInput) {
      console.log('❌ Could not find email input field');
      console.log('📸 Taking screenshot of current page...');
      await page.screenshot({ path: 'auth-page-current.png', fullPage: true });
      return;
    }

    // Fill email
    console.log('📧 Filling email...');
    await emailInput.fill('laurence@fyves.com');

    // Look for password input field
    const passwordSelectors = [
      'input[type="password"]',
      'input[placeholder*="password" i]',
      'input[name="password"]',
      'input[id="password"]',
      '[data-testid="password-input"]',
      'input[type="password"]:first-of-type'
    ];

    let passwordInput = null;
    for (const selector of passwordSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          passwordInput = element;
          console.log(`✅ Found password input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!passwordInput) {
      console.log('❌ Could not find password input field');
      console.log('📸 Taking screenshot of current page...');
      await page.screenshot({ path: 'auth-page-current.png', fullPage: true });
      return;
    }

    // Fill password
    console.log('🔒 Filling password...');
    await passwordInput.fill('Hennie@@12');

    // Look for submit button
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Sign In")',
      'button:has-text("Login")',
      'button:has-text("Log in")',
      '[data-testid="login-button"]',
      'button[type="submit"]:first-of-type'
    ];

    let submitButton = null;
    for (const selector of submitSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          submitButton = element;
          console.log(`✅ Found submit button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!submitButton) {
      console.log('❌ Could not find submit button');
      console.log('📸 Taking screenshot of current page...');
      await page.screenshot({ path: 'auth-page-current.png', fullPage: true });
      return;
    }

    // Submit the form
    console.log('🚀 Submitting login form...');
    await submitButton.click();

    // Wait for navigation or redirect
    try {
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('✅ Successfully logged in and redirected to dashboard!');
      console.log('📸 Taking screenshot of dashboard...');
      await page.screenshot({ path: 'dashboard-logged-in.png', fullPage: true });

      // Check if we have the expected navigation
      console.log('🔍 Checking navigation structure...');

      // Look for navigation elements
      const navSelectors = [
        'nav',
        '[class*="nav"]',
        '[class*="navigation"]',
        'footer',
        '[class*="bottom"]'
      ];

      for (const selector of navSelectors) {
        try {
          const navElements = page.locator(selector);
          const count = await navElements.count();
          if (count > 0) {
            console.log(`📍 Found ${count} navigation elements with selector: ${selector}`);
            for (let i = 0; i < count; i++) {
              const element = navElements.nth(i);
              const text = await element.textContent();
              const classes = await element.getAttribute('class') || '';
              console.log(`   Element ${i + 1}: "${text?.trim()}" (classes: ${classes})`);
            }
          }
        } catch (e) {
          continue;
        }
      }

      // Check for specific navigation tabs
      const tabSelectors = [
        'a:has-text("Home")',
        'a:has-text("Taste")',
        'a:has-text("Review")',
        'a:has-text("Wheels")',
        'button:has-text("Home")',
        'button:has-text("Taste")',
        'button:has-text("Review")',
        'button:has-text("Wheels")'
      ];

      console.log('🔍 Looking for navigation tabs...');
      for (const selector of tabSelectors) {
        try {
          const tab = page.locator(selector).first();
          if (await tab.isVisible()) {
            console.log(`✅ Found navigation tab: ${selector}`);
          }
        } catch (e) {
          continue;
        }
      }

      console.log('🎉 Authentication and navigation check complete!');
      console.log('📂 Screenshots saved: auth-page-current.png, dashboard-logged-in.png');

    } catch (e) {
      console.log('⚠️ Login may have succeeded but redirect failed or took too long');
      console.log('📸 Taking screenshot of current page...');
      await page.screenshot({ path: 'login-result.png', fullPage: true });
      console.log('📍 Current URL:', page.url());
    }

  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    console.log('📸 Taking screenshot of error state...');
    await page.screenshot({ path: 'auth-error.png', fullPage: true });
  } finally {
    // Keep browser open for manual inspection
    console.log('🌐 Browser will remain open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    await browser.close();
  }
}

authenticateFlavatix().catch(console.error);
