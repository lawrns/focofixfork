import { createClient } from '@supabase/supabase-js';

/**
 * API Test Helpers
 * Utilities for testing Next.js API routes
 */

// Test database client
export const createTestSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return createClient(supabaseUrl, supabaseKey);
};

// Test user creation
export interface TestUser {
  id: string;
  email: string;
  password: string;
  session?: any;
}

export const createTestUser = async (): Promise<TestUser> => {
  const supabase = createTestSupabaseClient();
  const email = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
  const password = 'Test123!@#';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  return {
    id: data.user!.id,
    email,
    password,
    session: data.session,
  };
};

// Test organization creation
export const createTestOrganization = async (userId: string) => {
  const supabase = createTestSupabaseClient();
  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name: `Test Org ${Date.now()}`,
      slug: `test-org-${Date.now()}`,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Test workspace creation
export const createTestWorkspace = async (organizationId: string, userId: string) => {
  const supabase = createTestSupabaseClient();
  const { data, error } = await supabase
    .from('workspaces')
    .insert({
      name: `Test Workspace ${Date.now()}`,
      organization_id: organizationId,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Test project creation
export const createTestProject = async (workspaceId: string, organizationId: string, userId: string) => {
  const supabase = createTestSupabaseClient();
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: `Test Project ${Date.now()}`,
      workspace_id: workspaceId,
      organization_id: organizationId,
      created_by: userId,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Test task creation
export const createTestTask = async (projectId: string, workspaceId: string, organizationId: string, userId: string) => {
  const supabase = createTestSupabaseClient();
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: `Test Task ${Date.now()}`,
      description: 'Test task description',
      project_id: projectId,
      workspace_id: workspaceId,
      organization_id: organizationId,
      created_by: userId,
      assigned_to: userId,
      status: 'todo',
      priority: 'medium',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Cleanup test data
export const cleanupTestUser = async (userId: string) => {
  const supabase = createTestSupabaseClient();

  // Delete in order due to foreign key constraints
  await supabase.from('tasks').delete().eq('created_by', userId);
  await supabase.from('projects').delete().eq('created_by', userId);
  await supabase.from('workspaces').delete().eq('created_by', userId);
  await supabase.from('organizations').delete().eq('created_by', userId);
  await supabase.auth.admin.deleteUser(userId);
};

// Mock request helpers
export const mockRequest = (
  method: string,
  body?: any,
  headers?: Record<string, string>,
  searchParams?: Record<string, string>
) => {
  const url = new URL('http://localhost:3000/api/test');

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return new Request(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
};

// Test authentication token
export const getAuthToken = async (email: string, password: string): Promise<string> => {
  const supabase = createTestSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data.session!.access_token;
};

// API route testing helper
export const testApiRoute = async (
  handler: (req: Request) => Promise<Response>,
  method: string,
  body?: any,
  headers?: Record<string, string>
): Promise<{ status: number; data: any; headers: Headers }> => {
  const req = mockRequest(method, body, headers);
  const response = await handler(req);

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    status: response.status,
    data,
    headers: response.headers,
  };
};

// Rate limiting test helper
export const testRateLimit = async (
  handler: (req: Request) => Promise<Response>,
  attempts: number = 100
): Promise<boolean> => {
  const requests = Array.from({ length: attempts }, () =>
    testApiRoute(handler, 'GET')
  );

  const responses = await Promise.all(requests);
  return responses.some(r => r.status === 429);
};

// IDOR (Insecure Direct Object Reference) test helper
export const testIDOR = async (
  handler: (req: Request) => Promise<Response>,
  resourceId: string,
  unauthorizedToken: string
): Promise<boolean> => {
  const response = await testApiRoute(
    handler,
    'GET',
    undefined,
    { Authorization: `Bearer ${unauthorizedToken}` }
  );

  return response.status === 403 || response.status === 404;
};

// Input validation test helper
export const testInputValidation = async (
  handler: (req: Request) => Promise<Response>,
  invalidInputs: any[]
): Promise<boolean> => {
  const results = await Promise.all(
    invalidInputs.map(input => testApiRoute(handler, 'POST', input))
  );

  return results.every(r => r.status === 400 || r.status === 422);
};

// Create complete test environment
export interface TestEnvironment {
  user: TestUser;
  organization: any;
  workspace: any;
  project: any;
  task: any;
  cleanup: () => Promise<void>;
}

export const createTestEnvironment = async (): Promise<TestEnvironment> => {
  const user = await createTestUser();
  const organization = await createTestOrganization(user.id);
  const workspace = await createTestWorkspace(organization.id, user.id);
  const project = await createTestProject(workspace.id, organization.id, user.id);
  const task = await createTestTask(project.id, workspace.id, organization.id, user.id);

  return {
    user,
    organization,
    workspace,
    project,
    task,
    cleanup: async () => {
      await cleanupTestUser(user.id);
    },
  };
};

// Performance measurement helpers
export const measureApiPerformance = async (
  handler: (req: Request) => Promise<Response>,
  iterations: number = 10
): Promise<{ avg: number; min: number; max: number; p95: number; p99: number }> => {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await testApiRoute(handler, 'GET');
    const end = performance.now();
    times.push(end - start);
  }

  times.sort((a, b) => a - b);

  return {
    avg: times.reduce((a, b) => a + b, 0) / times.length,
    min: times[0],
    max: times[times.length - 1],
    p95: times[Math.floor(times.length * 0.95)],
    p99: times[Math.floor(times.length * 0.99)],
  };
};

// SQL injection test patterns
export const sqlInjectionPayloads = [
  "' OR '1'='1",
  "1' OR '1' = '1",
  "'; DROP TABLE tasks;--",
  "1 UNION SELECT * FROM users--",
  "admin'--",
  "' OR 1=1--",
  "' OR 'a'='a",
  "1'; DELETE FROM tasks WHERE '1'='1",
];

// XSS test patterns
export const xssPayloads = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  '<svg onload=alert("XSS")>',
  'javascript:alert("XSS")',
  '<iframe src="javascript:alert(\'XSS\')">',
  '<body onload=alert("XSS")>',
];

// Test data factories
export const createBulkTestTasks = async (
  projectId: string,
  workspaceId: string,
  organizationId: string,
  userId: string,
  count: number
) => {
  const supabase = createTestSupabaseClient();

  const tasks = Array.from({ length: count }, (_, i) => ({
    title: `Bulk Test Task ${i + 1}`,
    description: `Description for task ${i + 1}`,
    project_id: projectId,
    workspace_id: workspaceId,
    organization_id: organizationId,
    created_by: userId,
    assigned_to: userId,
    status: ['todo', 'in_progress', 'done'][i % 3],
    priority: ['low', 'medium', 'high'][i % 3],
  }));

  const { data, error } = await supabase
    .from('tasks')
    .insert(tasks)
    .select();

  if (error) throw error;
  return data;
};

// Wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry helper for flaky operations
export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxAttempts - 1) {
        await waitFor(delay);
      }
    }
  }

  throw lastError;
};
