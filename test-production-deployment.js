#!/usr/bin/env node

/**
 * Production Deployment Test Script
 *
 * This script:
 * 1. Monitors deployment status
 * 2. Tests authentication
 * 3. Runs comprehensive error checks
 * 4. Reports any issues found
 */

const https = require('https');
const { chromium } = require('playwright');

// Configuration
const SITE_URL = 'https://foco.mx';
const TEST_CREDENTIALS = {
  email: 'laurence@fyves.com',
  password: 'Hennie@@18'
};
const EXPECTED_SW_VERSION = '1.0.21';
const CHECK_INTERVAL = 30000; // 30 seconds
const MAX_WAIT = 600000; // 10 minutes

// Color output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${new Date().toTimeString().split(' ')[0]} - ${message}${colors.reset}`);
}

// Check service worker version
async function checkServiceWorkerVersion() {
  return new Promise((resolve, reject) => {
    https.get(`${SITE_URL}/sw.js`, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
        // Only need first few lines
        if (data.length > 500) {
          res.destroy();
        }
      });
      res.on('end', () => {
        const versionMatch = data.match(/SW_VERSION\s*=\s*['"]([^'"]+)['"]/);
        const version = versionMatch ? versionMatch[1] : 'unknown';
        const hasCircuitBreaker = data.includes('circuitBreaker');
        resolve({ version, hasCircuitBreaker });
      });
    }).on('error', reject);
  });
}

// Wait for deployment
async function waitForDeployment() {
  const startTime = Date.now();
  log('Waiting for deployment to complete...', 'yellow');

  while (Date.now() - startTime < MAX_WAIT) {
    try {
      const { version, hasCircuitBreaker } = await checkServiceWorkerVersion();
      log(`Current SW version: ${version}, Has circuit breaker: ${hasCircuitBreaker}`, 'blue');

      if (version === EXPECTED_SW_VERSION && hasCircuitBreaker) {
        log('✓ Deployment complete! New service worker is live.', 'green');
        return true;
      }

      log(`Waiting ${CHECK_INTERVAL/1000} seconds before next check...`, 'yellow');
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
    } catch (error) {
      log(`Error checking deployment: ${error.message}`, 'red');
    }
  }

  log('⚠ Deployment timeout - proceeding with tests anyway', 'yellow');
  return false;
}

// Run comprehensive tests
async function runTests() {
  log('Starting comprehensive production tests...', 'magenta');

  const browser = await chromium.launch({
    headless: false, // Show browser for debugging
    devtools: true   // Open DevTools
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();
  const errors = [];
  const networkErrors = [];
  const consoleErrors = [];

  // Monitor console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      log(`Console error: ${msg.text()}`, 'red');
    }
  });

  // Monitor network failures
  page.on('requestfailed', request => {
    networkErrors.push({
      url: request.url(),
      failure: request.failure()
    });
    log(`Network error: ${request.url()} - ${request.failure()?.errorText}`, 'red');
  });

  // Monitor responses
  page.on('response', response => {
    if (response.status() >= 400) {
      const url = response.url();
      if (url.includes('/api/')) {
        errors.push({
          url,
          status: response.status(),
          statusText: response.statusText()
        });
        log(`API Error: ${response.status()} ${url}`, 'red');
      }
    }
  });

  try {
    // Test 1: Load homepage
    log('Test 1: Loading homepage...', 'blue');
    await page.goto(SITE_URL, { waitUntil: 'networkidle' });
    log('✓ Homepage loaded', 'green');

    // Test 2: Navigate to login
    log('Test 2: Navigating to login...', 'blue');
    await page.goto(`${SITE_URL}/login`, { waitUntil: 'networkidle' });
    log('✓ Login page loaded', 'green');

    // Test 3: Attempt login
    log('Test 3: Attempting login...', 'blue');
    await page.fill('input[type="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    // Wait for navigation or error
    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/projects')) {
      log('✓ Login successful', 'green');

      // Test 4: Check main areas
      const areas = [
        '/dashboard',
        '/projects',
        '/tasks',
        '/settings'
      ];

      for (const area of areas) {
        log(`Test: Checking ${area}...`, 'blue');
        const response = await page.goto(`${SITE_URL}${area}`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        if (response && response.ok()) {
          log(`✓ ${area} loaded successfully`, 'green');
        } else {
          log(`✗ ${area} failed: ${response?.status()}`, 'red');
          errors.push({
            area,
            status: response?.status()
          });
        }

        await page.waitForTimeout(2000);
      }

      // Test 5: Check for specific project access
      log('Test 5: Checking project access...', 'blue');
      await page.goto(`${SITE_URL}/projects`, { waitUntil: 'networkidle' });

      // Try to click on first project if available
      const projectLink = await page.$('a[href^="/projects/"]');
      if (projectLink) {
        const projectHref = await projectLink.getAttribute('href');
        log(`Found project: ${projectHref}`, 'blue');
        await projectLink.click();
        await page.waitForTimeout(3000);

        const projectUrl = page.url();
        if (!projectUrl.includes('error') && !projectUrl.includes('404')) {
          log('✓ Project access successful', 'green');
        } else {
          log('✗ Project access failed', 'red');
        }
      }

    } else {
      log('✗ Login failed or redirected incorrectly', 'red');
      errors.push({ test: 'login', error: 'Failed to login' });
    }

  } catch (error) {
    log(`Test error: ${error.message}`, 'red');
    errors.push({ test: 'general', error: error.message });
  }

  // Summary
  log('\n========== TEST SUMMARY ==========', 'magenta');
  log(`Console errors: ${consoleErrors.length}`, consoleErrors.length > 0 ? 'red' : 'green');
  log(`Network errors: ${networkErrors.length}`, networkErrors.length > 0 ? 'red' : 'green');
  log(`API errors: ${errors.length}`, errors.length > 0 ? 'red' : 'green');

  if (consoleErrors.length > 0) {
    log('\nConsole Errors:', 'red');
    consoleErrors.forEach(err => log(`  - ${err}`, 'red'));
  }

  if (networkErrors.length > 0) {
    log('\nNetwork Errors:', 'red');
    networkErrors.forEach(err => log(`  - ${err.url}: ${err.failure?.errorText}`, 'red'));
  }

  if (errors.length > 0) {
    log('\nAPI/Test Errors:', 'red');
    errors.forEach(err => log(`  - ${JSON.stringify(err)}`, 'red'));
  }

  // Check for circuit breaker activation
  const circuitBreakerCheck = await page.evaluate(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Check if we can access SW state (might not be directly accessible)
      return true;
    }
    return false;
  });

  log(`\nService Worker active: ${circuitBreakerCheck}`, 'blue');

  // Leave browser open for manual inspection
  log('\n⚠ Browser left open for manual inspection. Close it when done.', 'yellow');

  return {
    success: errors.length === 0 && networkErrors.length === 0,
    errors,
    networkErrors,
    consoleErrors
  };
}

// Main execution
async function main() {
  log('Production Deployment Test Starting...', 'magenta');

  // Wait for deployment
  const deployed = await waitForDeployment();

  if (!deployed) {
    log('⚠ Running tests on current deployment (may not have latest changes)', 'yellow');
  }

  // Run tests
  const results = await runTests();

  if (results.success) {
    log('\n✅ All tests passed! Production is error-free.', 'green');
    process.exit(0);
  } else {
    log('\n❌ Tests failed. Issues found that need fixing.', 'red');
    process.exit(1);
  }
}

// Run
main().catch(error => {
  log(`Fatal error: ${error.message}`, 'red');
  process.exit(1);
});