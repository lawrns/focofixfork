const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://100.118.211.55:7777';
const SCREENSHOTS_DIR = '/tmp/focoscreenshots';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const errors = [];
const consoleMessages = [];

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Capture console messages
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({ type: msg.type(), text });
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });

  page.on('pageerror', err => {
    errors.push('PAGE ERROR: ' + err.message);
  });

  // Step 1: Navigate to login page
  console.log('Navigating to login page...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/01_login_page.png`, fullPage: true });
  console.log('Screenshot 1: login page taken');

  // Log form inputs to understand structure
  const emailInputs = await page.$$eval('input', inputs => inputs.map(i => ({ type: i.type, name: i.name, id: i.id, placeholder: i.placeholder })));
  console.log('Form inputs found:', JSON.stringify(emailInputs));

  // Step 2: Fill in email and password
  const emailSelector = 'input[type="email"], input[name="email"], input[id="email"]';
  const passwordSelector = 'input[type="password"], input[name="password"], input[id="password"]';

  try {
    // Try email field
    const emailField = await page.$(emailSelector);
    if (emailField) {
      await emailField.click({ clickCount: 3 });
      await emailField.type('laurence@fyves.com', { delay: 50 });
      console.log('Typed email');
    } else {
      console.log('Email field not found with selector:', emailSelector);
    }

    const passField = await page.$(passwordSelector);
    if (passField) {
      await passField.click({ clickCount: 3 });
      await passField.type('hennie12', { delay: 50 });
      console.log('Typed password');
    } else {
      console.log('Password field not found');
    }

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/02_form_filled.png`, fullPage: true });
    console.log('Screenshot 2: form filled taken');

    // Click submit button
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      console.log('Clicked submit button');
    } else {
      // Fall back to pressing Enter
      await page.keyboard.press('Enter');
      console.log('Pressed Enter to submit');
    }

    // Wait for navigation
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    } catch(e) {
      console.log('Navigation wait:', e.message);
    }

    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/03_after_login.png`, fullPage: true });
    console.log('Screenshot 3: after login taken, URL:', page.url());

  } catch (e) {
    console.log('Error during login flow:', e.message);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/03_error.png`, fullPage: true });
  }

  // Step 4: Navigate to dashboard directly if not already there
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);
  
  if (!currentUrl.includes('/dashboard')) {
    console.log('Navigating directly to dashboard...');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => {
      console.log('Dashboard navigation error:', e.message);
    });
  }
  
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/04_dashboard.png`, fullPage: true });
  console.log('Screenshot 4: dashboard taken, URL:', page.url());

  // Report console messages
  console.log('\n=== CONSOLE MESSAGES ===');
  consoleMessages.forEach(m => console.log(`[${m.type}] ${m.text}`));
  
  console.log('\n=== ERRORS ===');
  if (errors.length === 0) {
    console.log('NO ERRORS FOUND');
  } else {
    errors.forEach(e => console.log('ERROR:', e));
  }

  await browser.close();
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
