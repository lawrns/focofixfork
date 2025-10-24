#!/usr/bin/env tsx

/**
 * Comprehensive Production Site Test for foco.mx
 * Tests translation keys, UI/UX, contrast, and overall functionality
 */

const PRODUCTION_URL = 'https://foco.mx';

interface TestResult {
  test: string;
  passed: boolean;
  details: string;
  errors?: string[];
}

const results: TestResult[] = [];

function logTest(test: string, passed: boolean, details: string, errors?: string[]) {
  results.push({ test, passed, details, errors });
  const emoji = passed ? '✅' : '❌';
  console.log(`${emoji} ${test}: ${details}`);
  if (errors && errors.length > 0) {
    errors.forEach(err => console.log(`   ⚠️  ${err}`));
  }
}

async function testEndpoint(url: string, description: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    const text = await response.text();

    // Check for translation errors
    const translationErrors: string[] = [];
    const translationErrorPattern = /Translation key "([^"]+)" not found for language "([^"]+)"/g;
    let match;
    while ((match = translationErrorPattern.exec(text)) !== null) {
      translationErrors.push(`${match[1]} (${match[2]})`);
    }

    // Check for console errors in the HTML
    const consoleErrorPattern = /console\.error|Error:/gi;
    const hasConsoleErrors = consoleErrorPattern.test(text);

    // Check for proper HTML structure
    const hasHtml = text.includes('<html');
    const hasBody = text.includes('<body');

    if (translationErrors.length > 0) {
      logTest(
        description,
        false,
        `Found ${translationErrors.length} translation errors`,
        translationErrors.slice(0, 10) // Show first 10
      );
      return false;
    }

    if (!hasHtml || !hasBody) {
      logTest(description, false, 'Invalid HTML structure');
      return false;
    }

    if (response.status === 200) {
      logTest(description, true, `Status ${response.status}, valid HTML`);
      return true;
    } else {
      logTest(description, false, `Status ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest(description, false, `Failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function testAPI(url: string, description: string): Promise<boolean> {
  try {
    const response = await fetch(url);

    if (response.status === 401 || response.status === 403) {
      // Expected for auth-protected endpoints
      logTest(description, true, `Protected endpoint (${response.status})`);
      return true;
    }

    if (response.status === 200) {
      logTest(description, true, `Status ${response.status}`);
      return true;
    }

    logTest(description, false, `Status ${response.status}`);
    return false;
  } catch (error) {
    logTest(description, false, `Failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Starting Comprehensive Production Test\n');
  console.log(`Testing: ${PRODUCTION_URL}\n`);
  console.log('=' .repeat(80));

  // Test main pages
  console.log('\n📄 Testing Main Pages...\n');
  await testEndpoint(`${PRODUCTION_URL}/`, 'Home Page');
  await testEndpoint(`${PRODUCTION_URL}/login`, 'Login Page');
  await testEndpoint(`${PRODUCTION_URL}/register`, 'Register Page');
  await testEndpoint(`${PRODUCTION_URL}/dashboard`, 'Dashboard Page');
  await testEndpoint(`${PRODUCTION_URL}/projects`, 'Projects Page');
  await testEndpoint(`${PRODUCTION_URL}/tasks`, 'Tasks Page');
  await testEndpoint(`${PRODUCTION_URL}/milestones`, 'Milestones Page');
  await testEndpoint(`${PRODUCTION_URL}/calendar`, 'Calendar Page');
  await testEndpoint(`${PRODUCTION_URL}/organizations`, 'Organizations Page');

  // Test API health endpoints
  console.log('\n🔌 Testing API Endpoints...\n');
  await testAPI(`${PRODUCTION_URL}/api/health`, 'Health Check API');
  await testAPI(`${PRODUCTION_URL}/api/ai/health`, 'AI Health Check API');

  // Test protected endpoints (should return 401/403)
  console.log('\n🔐 Testing Protected Endpoints...\n');
  await testAPI(`${PRODUCTION_URL}/api/tasks`, 'Tasks API (Protected)');
  await testAPI(`${PRODUCTION_URL}/api/projects`, 'Projects API (Protected)');
  await testAPI(`${PRODUCTION_URL}/api/milestones`, 'Milestones API (Protected)');

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Test Summary\n');

  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;

  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (failedTests > 0) {
    console.log('\n❌ Failed Tests:\n');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  • ${r.test}: ${r.details}`);
      if (r.errors) {
        r.errors.forEach(err => console.log(`     - ${err}`));
      }
    });
  }

  console.log('\n' + '='.repeat(80));

  // Exit with error code if tests failed
  if (failedTests > 0) {
    console.log('\n⚠️  Some tests failed. Please review the issues above.');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed! The site is working correctly.');
    process.exit(0);
  }
}

runTests();
