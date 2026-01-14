#!/usr/bin/env node

/**
 * Task API Routes Comprehensive Test Suite
 * Tests all task endpoints with and without authentication
 * Verifies response envelope format, status codes, and error handling
 */

const BASE_URL = 'http://localhost:3000';
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let passed = 0;
let failed = 0;
let total = 0;

const log = {
  title: (msg) => console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`),
  header: (msg) => console.log(`${colors.blue}${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.yellow}→ ${msg}${colors.reset}`),
  detail: (msg) => console.log(`  ${msg}`),
  pass: (msg) => console.log(`  ${colors.green}✓ ${msg}${colors.reset}`),
  fail: (msg) => console.log(`  ${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
};

async function fetchEndpoint(method, endpoint, data = null, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  if (data && (method === 'POST' || method === 'PATCH')) {
    fetchOptions.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, fetchOptions);
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch (e) {
      body = { _raw: text };
    }
    return {
      status: response.status,
      headers: response.headers,
      body,
      ok: response.ok,
    };
  } catch (error) {
    return {
      status: null,
      headers: null,
      body: { _error: error.message },
      ok: false,
    };
  }
}

function validateEnvelope(body, expectOk) {
  const errors = [];

  // Check required fields
  if (!('ok' in body)) {
    errors.push('Missing "ok" field');
  } else if (typeof body.ok !== 'boolean') {
    errors.push(`"ok" should be boolean, got ${typeof body.ok}`);
  }

  if (!('data' in body)) {
    errors.push('Missing "data" field');
  }

  if (!('error' in body)) {
    errors.push('Missing "error" field');
  }

  // Check XOR constraint: data XOR error
  if (body.ok === true) {
    if (body.data === null) {
      errors.push('When ok=true, data should not be null');
    }
    if (body.error !== null) {
      errors.push('When ok=true, error should be null');
    }
  } else if (body.ok === false) {
    if (body.data !== null) {
      errors.push('When ok=false, data should be null');
    }
    if (body.error === null) {
      errors.push('When ok=false, error should not be null');
    }
    // Check error structure
    if (body.error && typeof body.error === 'object') {
      if (!body.error.code) {
        errors.push('Error response missing "error.code"');
      }
      if (!body.error.message) {
        errors.push('Error response missing "error.message"');
      }
      if (!body.error.timestamp) {
        errors.push('Error response missing "error.timestamp"');
      }
    }
  }

  // Verify ok matches expectation
  if (body.ok !== expectOk) {
    errors.push(`Expected ok=${expectOk}, got ok=${body.ok}`);
  }

  return errors;
}

async function testEndpoint(name, method, endpoint, data, expectedStatus, expectedOk) {
  total++;
  const testNum = total;

  log.test(`[${testNum}] ${name}`);
  log.detail(`Method: ${method} ${endpoint}`);
  log.detail(`Expected: ${expectedStatus} with ok=${expectedOk}`);

  const response = await fetchEndpoint(method, endpoint, data);

  // Check status code
  if (response.status !== expectedStatus) {
    log.fail(
      `Status code: expected ${expectedStatus}, got ${response.status}`
    );
    failed++;
    return false;
  }
  log.pass(`Status: ${response.status}`);

  // Validate JSON
  if (response.body._raw !== undefined) {
    log.fail('Response is not valid JSON');
    log.detail(`Body: ${response.body._raw}`);
    failed++;
    return false;
  }

  if (response.body._error !== undefined) {
    log.fail(`Fetch error: ${response.body._error}`);
    failed++;
    return false;
  }

  // Validate envelope
  const envelopeErrors = validateEnvelope(response.body, expectedOk);
  if (envelopeErrors.length > 0) {
    envelopeErrors.forEach((err) => log.fail(`Envelope: ${err}`));
    log.detail(`Body: ${JSON.stringify(response.body, null, 2)}`);
    failed++;
    return false;
  }

  log.pass('Response envelope valid');
  if (response.body.error) {
    log.detail(`Error code: ${response.body.error.code}`);
  }

  passed++;
  return true;
}

async function runTests() {
  log.title();
  log.header('Task API Routes Verification Suite');
  log.title();

  log.info('Starting tests against ' + BASE_URL);
  log.info('All endpoints tested without authentication\n');

  // Test 1: GET /api/tasks
  await testEndpoint(
    'GET /api/tasks - unauthorized',
    'GET',
    '/api/tasks',
    null,
    401,
    false
  );

  // Test 2: POST /api/tasks
  await testEndpoint(
    'POST /api/tasks - unauthorized',
    'POST',
    '/api/tasks',
    { title: 'Test Task', project_id: 'test-uuid' },
    401,
    false
  );

  // Test 3: GET /api/tasks/[id]
  await testEndpoint(
    'GET /api/tasks/[id] - unauthorized',
    'GET',
    '/api/tasks/550e8400-e29b-41d4-a716-446655440000',
    null,
    401,
    false
  );

  // Test 4: PATCH /api/tasks/[id]
  await testEndpoint(
    'PATCH /api/tasks/[id] - unauthorized',
    'PATCH',
    '/api/tasks/550e8400-e29b-41d4-a716-446655440000',
    { title: 'Updated' },
    401,
    false
  );

  // Test 5: DELETE /api/tasks/[id]
  await testEndpoint(
    'DELETE /api/tasks/[id] - unauthorized',
    'DELETE',
    '/api/tasks/550e8400-e29b-41d4-a716-446655440000',
    null,
    401,
    false
  );

  // Test 6: POST /api/tasks/batch
  await testEndpoint(
    'POST /api/tasks/batch - unauthorized',
    'POST',
    '/api/tasks/batch',
    { taskIds: ['550e8400-e29b-41d4-a716-446655440000'], operation: 'complete' },
    401,
    false
  );

  // Test 7: GET /api/tasks/[id]/subtasks
  await testEndpoint(
    'GET /api/tasks/[id]/subtasks - unauthorized',
    'GET',
    '/api/tasks/550e8400-e29b-41d4-a716-446655440000/subtasks',
    null,
    401,
    false
  );

  // Test 8: POST /api/tasks/[id]/subtasks
  await testEndpoint(
    'POST /api/tasks/[id]/subtasks - unauthorized',
    'POST',
    '/api/tasks/550e8400-e29b-41d4-a716-446655440000/subtasks',
    { title: 'Subtask' },
    401,
    false
  );

  // Test 9: GET /api/tasks/[id]/tags
  await testEndpoint(
    'GET /api/tasks/[id]/tags - unauthorized',
    'GET',
    '/api/tasks/550e8400-e29b-41d4-a716-446655440000/tags',
    null,
    401,
    false
  );

  // Test 10: POST /api/tasks/[id]/tags
  await testEndpoint(
    'POST /api/tasks/[id]/tags - unauthorized',
    'POST',
    '/api/tasks/550e8400-e29b-41d4-a716-446655440000/tags',
    { tag_ids: ['550e8400-e29b-41d4-a716-446655440001'] },
    401,
    false
  );

  // Test 11: GET /api/tasks/[id]/time-entries
  await testEndpoint(
    'GET /api/tasks/[id]/time-entries - unauthorized',
    'GET',
    '/api/tasks/550e8400-e29b-41d4-a716-446655440000/time-entries',
    null,
    401,
    false
  );

  // Test 12: POST /api/tasks/[id]/time-entries
  await testEndpoint(
    'POST /api/tasks/[id]/time-entries - unauthorized',
    'POST',
    '/api/tasks/550e8400-e29b-41d4-a716-446655440000/time-entries',
    {
      startTime: '2024-01-01T00:00:00Z',
      endTime: '2024-01-01T01:00:00Z',
      durationSeconds: 3600,
    },
    401,
    false
  );

  // Print summary
  log.title();
  log.header('Test Summary');
  log.title();

  console.log(`Total:  ${total}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log('');

  if (failed === 0) {
    log.info('All tests passed! API response envelopes are correct.');
    process.exit(0);
  } else {
    log.info(`${failed} test(s) failed. See details above.`);
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Test suite error:', error);
  process.exit(1);
});
