/**
 * Test Data Fixtures
 * Reusable test data for consistent testing
 */

export const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    password: 'Admin123!@#',
    full_name: 'Admin User',
    role: 'admin',
  },
  member: {
    email: 'member@test.com',
    password: 'Member123!@#',
    full_name: 'Member User',
    role: 'member',
  },
  guest: {
    email: 'guest@test.com',
    password: 'Guest123!@#',
    full_name: 'Guest User',
    role: 'guest',
  },
};

export const TEST_ORGANIZATIONS = {
  primary: {
    name: 'Primary Test Organization',
    slug: 'primary-test-org',
    description: 'Organization for testing',
  },
  secondary: {
    name: 'Secondary Test Organization',
    slug: 'secondary-test-org',
    description: 'Another organization for testing',
  },
};

export const TEST_PROJECTS = {
  active: {
    name: 'Active Test Project',
    description: 'An active project for testing',
    status: 'active',
    priority: 'high',
  },
  archived: {
    name: 'Archived Test Project',
    description: 'An archived project for testing',
    status: 'archived',
    priority: 'low',
  },
};

export const TEST_TASKS = {
  simple: {
    title: 'Simple Test Task',
    description: 'A simple task for testing',
    status: 'todo',
    priority: 'medium',
  },
  complex: {
    title: 'Complex Test Task',
    description: 'A complex task with multiple fields',
    status: 'in_progress',
    priority: 'high',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['urgent', 'feature'],
    estimated_hours: 8,
  },
  overdue: {
    title: 'Overdue Test Task',
    description: 'An overdue task for testing',
    status: 'todo',
    priority: 'high',
    due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

// Invalid inputs for validation testing
export const INVALID_TASK_INPUTS = [
  // Missing required fields
  {},
  { description: 'Missing title' },
  // Invalid data types
  { title: 123, description: 'Invalid title type' },
  { title: 'Valid', priority: 'invalid_priority' },
  { title: 'Valid', status: 'invalid_status' },
  // SQL injection attempts
  { title: "'; DROP TABLE tasks;--", description: 'SQL injection' },
  // XSS attempts
  { title: '<script>alert("XSS")</script>', description: 'XSS attempt' },
  // Extremely long strings
  { title: 'A'.repeat(10000), description: 'Too long' },
  // Invalid dates
  { title: 'Valid', due_date: 'not-a-date' },
  // Negative numbers
  { title: 'Valid', estimated_hours: -1 },
];

export const INVALID_PROJECT_INPUTS = [
  {},
  { name: '' },
  { name: 'Valid', status: 'invalid' },
  { name: '<script>alert("XSS")</script>' },
  { name: 'A'.repeat(1000) },
];

export const INVALID_ORGANIZATION_INPUTS = [
  {},
  { name: '' },
  { name: 'Valid', slug: 'invalid slug with spaces' },
  { name: '<script>alert("XSS")</script>' },
  { slug: '../../../etc/passwd' },
];

// Rate limiting test data
export const RATE_LIMIT_CONFIG = {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  testRequests: 150, // Exceed the limit
};

// Performance benchmarks
export const PERFORMANCE_BENCHMARKS = {
  api: {
    fast: 100, // ms
    acceptable: 500, // ms
    slow: 1000, // ms
  },
  database: {
    fast: 50, // ms
    acceptable: 200, // ms
    slow: 500, // ms
  },
  page: {
    fast: 1000, // ms
    acceptable: 3000, // ms
    slow: 5000, // ms
  },
};

// Bulk operation test data
export const BULK_TEST_SIZES = {
  small: 10,
  medium: 100,
  large: 1000,
};

// Voice command test data
export const VOICE_COMMANDS = {
  valid: [
    'Create a task called Buy groceries',
    'Add a high priority task for the marketing project',
    'Create a task Buy milk due tomorrow',
    'Make a task called Review pull request assigned to John',
  ],
  invalid: [
    'Hello', // Not a command
    '', // Empty
    'Create', // Incomplete
    'Task task task', // Nonsensical
  ],
  ambiguous: [
    'Create something', // Vague
    'Add it', // No context
    'Do the thing', // Unclear
  ],
};

// Security test payloads
export const SECURITY_PAYLOADS = {
  sql_injection: [
    "' OR '1'='1",
    "1' OR '1' = '1",
    "'; DROP TABLE tasks;--",
    "1 UNION SELECT * FROM users--",
    "admin'--",
  ],
  xss: [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    'javascript:alert("XSS")',
  ],
  path_traversal: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32',
    '/etc/passwd',
    'C:\\Windows\\System32',
  ],
  command_injection: [
    '; ls -la',
    '| cat /etc/passwd',
    '`whoami`',
    '$(ls)',
  ],
};

// Mock API responses
export const MOCK_API_RESPONSES = {
  success: {
    status: 200,
    data: { success: true, message: 'Operation successful' },
  },
  created: {
    status: 201,
    data: { success: true, id: 'new-id-123' },
  },
  badRequest: {
    status: 400,
    data: { error: 'Bad request', details: 'Invalid input' },
  },
  unauthorized: {
    status: 401,
    data: { error: 'Unauthorized', message: 'Authentication required' },
  },
  forbidden: {
    status: 403,
    data: { error: 'Forbidden', message: 'Access denied' },
  },
  notFound: {
    status: 404,
    data: { error: 'Not found', message: 'Resource not found' },
  },
  conflict: {
    status: 409,
    data: { error: 'Conflict', message: 'Resource already exists' },
  },
  tooManyRequests: {
    status: 429,
    data: { error: 'Too many requests', message: 'Rate limit exceeded' },
  },
  serverError: {
    status: 500,
    data: { error: 'Internal server error', message: 'Something went wrong' },
  },
};

// Database test data
export const DATABASE_TEST_DATA = {
  // Test RLS policies
  rls_scenarios: [
    { scenario: 'same_organization', shouldAccess: true },
    { scenario: 'different_organization', shouldAccess: false },
    { scenario: 'no_organization', shouldAccess: false },
  ],

  // Test constraints
  constraint_violations: [
    { type: 'foreign_key', table: 'tasks', field: 'project_id', value: 'non-existent-id' },
    { type: 'unique', table: 'organizations', field: 'slug', value: 'duplicate-slug' },
    { type: 'not_null', table: 'tasks', field: 'title', value: null },
    { type: 'check', table: 'tasks', field: 'priority', value: 'invalid' },
  ],

  // Test cascade deletions
  cascade_scenarios: [
    { parent: 'organization', child: 'projects', expected: 'delete' },
    { parent: 'project', child: 'tasks', expected: 'delete' },
    { parent: 'workspace', child: 'projects', expected: 'delete' },
  ],
};

// Load testing scenarios
export const LOAD_TEST_SCENARIOS = {
  light: {
    virtualUsers: 10,
    duration: '1m',
    rampUpTime: '10s',
  },
  moderate: {
    virtualUsers: 50,
    duration: '5m',
    rampUpTime: '30s',
  },
  heavy: {
    virtualUsers: 100,
    duration: '10m',
    rampUpTime: '1m',
  },
  stress: {
    virtualUsers: 500,
    duration: '15m',
    rampUpTime: '2m',
  },
  spike: {
    virtualUsers: 1000,
    duration: '5m',
    rampUpTime: '10s',
  },
};

// Accessibility test data
export const A11Y_TEST_DATA = {
  roles: ['button', 'link', 'heading', 'textbox', 'checkbox', 'radio', 'combobox'],
  landmarks: ['banner', 'navigation', 'main', 'complementary', 'contentinfo'],
  required_attributes: ['aria-label', 'aria-labelledby', 'aria-describedby'],
  keyboard_navigation: ['Tab', 'Enter', 'Space', 'Escape', 'ArrowUp', 'ArrowDown'],
};

// Mobile test configurations
export const MOBILE_VIEWPORTS = {
  iphone_se: { width: 375, height: 667 },
  iphone_12: { width: 390, height: 844 },
  iphone_14_pro_max: { width: 430, height: 932 },
  pixel_5: { width: 393, height: 851 },
  galaxy_s21: { width: 360, height: 800 },
  ipad_mini: { width: 768, height: 1024 },
  ipad_pro: { width: 1024, height: 1366 },
};

// Network conditions
export const NETWORK_CONDITIONS = {
  fast_3g: {
    downloadThroughput: 1.6 * 1024 * 1024 / 8,
    uploadThroughput: 750 * 1024 / 8,
    latency: 40,
  },
  slow_3g: {
    downloadThroughput: 500 * 1024 / 8,
    uploadThroughput: 500 * 1024 / 8,
    latency: 400,
  },
  offline: {
    downloadThroughput: 0,
    uploadThroughput: 0,
    latency: 0,
  },
};
