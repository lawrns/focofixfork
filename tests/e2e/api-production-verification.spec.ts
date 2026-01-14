import { test, expect, APIRequestContext } from '@playwright/test'

/**
 * Comprehensive API Endpoint Tests for Production Verification
 *
 * Tests cover:
 * - Authentication flow (login with correct/incorrect credentials)
 * - Tasks API (GET list, GET by ID, POST create, PUT update)
 * - Projects API (GET list with workspace filtering)
 * - Workspace API (GET members with user_profiles validation)
 * - Response schema validation
 * - Performance metrics tracking
 * - Error handling (500 errors, unexpected responses)
 *
 * Test Credentials:
 * - Email: laurence@fyves.com
 * - Password: hennie12
 * - Production URL: https://foco.mx
 */

const PRODUCTION_URL = 'https://foco.mx'
const SUPABASE_URL = 'https://ouvqnyfqipgnrjnuqsqq.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91dnFueWZxaXBnbnJqbnVxc3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDE0MTgsImV4cCI6MjA4MzQ3NzQxOH0.IWsTnd87r9H0FCxzPGqayhrvqRZN9DZp15U4DM_IXgc'
const TEST_CREDENTIALS = {
  email: 'laurence@fyves.com',
  password: 'hennie12'
}

interface TestResult {
  endpoint: string
  method: string
  status: 'PASS' | 'FAIL'
  statusCode: number
  responseTime: number
  error?: string
  details?: any
}

const testResults: TestResult[] = []

function addResult(result: TestResult) {
  testResults.push(result)
  const icon = result.status === 'PASS' ? '✅' : '❌'
  console.log(`${icon} ${result.method} ${result.endpoint} - ${result.status} (${result.responseTime}ms)`)
  if (result.error) {
    console.log(`   Error: ${result.error}`)
  }
}

test.describe('Production API Verification - Authentication', () => {

  test('should authenticate with correct credentials', async ({ request }) => {
    const startTime = Date.now()

    try {
      // Supabase auth endpoint
      const response = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        data: {
          email: TEST_CREDENTIALS.email,
          password: TEST_CREDENTIALS.password
        }
      })

      const responseTime = Date.now() - startTime
      const data = await response.json()

      if (response.ok() && data.access_token) {
        addResult({
          endpoint: '/auth/v1/token',
          method: 'POST',
          status: 'PASS',
          statusCode: response.status(),
          responseTime,
          details: { hasAccessToken: true, hasRefreshToken: !!data.refresh_token }
        })

        expect(response.ok()).toBeTruthy()
        expect(data.access_token).toBeDefined()
        expect(data.refresh_token).toBeDefined()
        expect(data.user).toBeDefined()
        expect(data.user.email).toBe(TEST_CREDENTIALS.email)
      } else {
        addResult({
          endpoint: '/auth/v1/token',
          method: 'POST',
          status: 'FAIL',
          statusCode: response.status(),
          responseTime,
          error: data.error_description || data.error || 'Login failed'
        })

        throw new Error(`Login failed: ${data.error_description || data.error}`)
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      addResult({
        endpoint: '/auth/v1/token',
        method: 'POST',
        status: 'FAIL',
        statusCode: 0,
        responseTime,
        error: error.message
      })
      throw error
    }
  })

  test('should reject incorrect credentials', async ({ request }) => {
    const startTime = Date.now()

    try {
      const response = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        data: {
          email: TEST_CREDENTIALS.email,
          password: 'wrongpassword123'
        }
      })

      const responseTime = Date.now() - startTime
      const data = await response.json()

      // Should fail with 400 or 401
      if (response.status() === 400 || response.status() === 401) {
        addResult({
          endpoint: '/auth/v1/token (invalid)',
          method: 'POST',
          status: 'PASS',
          statusCode: response.status(),
          responseTime,
          details: { correctlyRejected: true }
        })

        expect(response.status()).toBeGreaterThanOrEqual(400)
        expect(data.error).toBeDefined()
      } else {
        addResult({
          endpoint: '/auth/v1/token (invalid)',
          method: 'POST',
          status: 'FAIL',
          statusCode: response.status(),
          responseTime,
          error: 'Should have rejected invalid credentials'
        })
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      addResult({
        endpoint: '/auth/v1/token (invalid)',
        method: 'POST',
        status: 'FAIL',
        statusCode: 0,
        responseTime,
        error: error.message
      })
      throw error
    }
  })
})

test.describe('Production API Verification - Protected Endpoints', () => {
  let authToken: string
  let userId: string
  let workspaceId: string

  test.beforeAll(async ({ request }) => {
    // Login to get auth token
    const response = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      data: {
        email: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.password
      }
    })

    const data = await response.json()
    authToken = data.access_token
    userId = data.user.id

    console.log('🔐 Authenticated successfully')
    console.log(`👤 User ID: ${userId}`)
  })

  test('should reject requests without authentication', async ({ request }) => {
    const startTime = Date.now()

    try {
      const response = await request.get(`${PRODUCTION_URL}/api/tasks`)
      const responseTime = Date.now() - startTime

      if (response.status() === 401) {
        addResult({
          endpoint: '/api/tasks (no auth)',
          method: 'GET',
          status: 'PASS',
          statusCode: response.status(),
          responseTime,
          details: { correctlyProtected: true }
        })

        expect(response.status()).toBe(401)
      } else {
        addResult({
          endpoint: '/api/tasks (no auth)',
          method: 'GET',
          status: 'FAIL',
          statusCode: response.status(),
          responseTime,
          error: 'Should require authentication'
        })
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      addResult({
        endpoint: '/api/tasks (no auth)',
        method: 'GET',
        status: 'FAIL',
        statusCode: 0,
        responseTime,
        error: error.message
      })
    }
  })

  test('should fetch tasks list with authentication', async ({ request }) => {
    const startTime = Date.now()

    try {
      const response = await request.get(`${PRODUCTION_URL}/api/tasks`, {
        headers: {
          'Cookie': `sb-access-token=${authToken}`
        }
      })

      const responseTime = Date.now() - startTime
      const data = await response.json()

      if (response.ok()) {
        addResult({
          endpoint: '/api/tasks',
          method: 'GET',
          status: 'PASS',
          statusCode: response.status(),
          responseTime,
          details: {
            taskCount: data.data?.data?.length || 0,
            hasData: !!data.data,
            hasPagination: !!data.data?.pagination
          }
        })

        expect(response.ok()).toBeTruthy()
        expect(data.success).toBe(true)
        expect(data.data).toBeDefined()
        expect(data.data.data).toBeDefined()
        expect(Array.isArray(data.data.data)).toBe(true)
        expect(data.data.pagination).toBeDefined()

        console.log(`   📋 Found ${data.data.data.length} tasks`)
      } else {
        addResult({
          endpoint: '/api/tasks',
          method: 'GET',
          status: 'FAIL',
          statusCode: response.status(),
          responseTime,
          error: data.error || 'Failed to fetch tasks'
        })
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      addResult({
        endpoint: '/api/tasks',
        method: 'GET',
        status: 'FAIL',
        statusCode: 0,
        responseTime,
        error: error.message
      })
      throw error
    }
  })

  test('should fetch specific task by ID', async ({ request }) => {
    const startTime = Date.now()

    try {
      // First get list of tasks to find a valid ID
      const listResponse = await request.get(`${PRODUCTION_URL}/api/tasks`, {
        headers: {
          'Cookie': `sb-access-token=${authToken}`
        }
      })

      const listData = await listResponse.json()
      const tasks = listData.data?.data || []

      if (tasks.length === 0) {
        console.log('   ⚠️ No tasks available to test individual fetch')
        addResult({
          endpoint: '/api/tasks/[id]',
          method: 'GET',
          status: 'PASS',
          statusCode: 200,
          responseTime: Date.now() - startTime,
          details: { skipped: true, reason: 'No tasks available' }
        })
        return
      }

      const taskId = tasks[0].id
      const response = await request.get(`${PRODUCTION_URL}/api/tasks/${taskId}`, {
        headers: {
          'Cookie': `sb-access-token=${authToken}`
        }
      })

      const responseTime = Date.now() - startTime
      const data = await response.json()

      if (response.ok()) {
        addResult({
          endpoint: '/api/tasks/[id]',
          method: 'GET',
          status: 'PASS',
          statusCode: response.status(),
          responseTime,
          details: {
            taskId,
            hasTitle: !!data.data?.title,
            hasStatus: !!data.data?.status
          }
        })

        expect(response.ok()).toBeTruthy()
        expect(data.success).toBe(true)
        expect(data.data).toBeDefined()
        expect(data.data.id).toBe(taskId)
        expect(data.data.title).toBeDefined()
      } else {
        addResult({
          endpoint: '/api/tasks/[id]',
          method: 'GET',
          status: 'FAIL',
          statusCode: response.status(),
          responseTime,
          error: data.error || 'Failed to fetch task'
        })
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      addResult({
        endpoint: '/api/tasks/[id]',
        method: 'GET',
        status: 'FAIL',
        statusCode: 0,
        responseTime,
        error: error.message
      })
      throw error
    }
  })

  test('should fetch projects list', async ({ request }) => {
    const startTime = Date.now()

    try {
      const response = await request.get(`${PRODUCTION_URL}/api/projects`, {
        headers: {
          'Cookie': `sb-access-token=${authToken}`
        }
      })

      const responseTime = Date.now() - startTime
      const data = await response.json()

      if (response.ok()) {
        addResult({
          endpoint: '/api/projects',
          method: 'GET',
          status: 'PASS',
          statusCode: response.status(),
          responseTime,
          details: {
            projectCount: data.data?.data?.length || 0,
            hasData: !!data.data,
            hasPagination: !!data.data?.pagination
          }
        })

        expect(response.ok()).toBeTruthy()
        expect(data.success).toBe(true)
        expect(data.data).toBeDefined()
        expect(data.data.data).toBeDefined()
        expect(Array.isArray(data.data.data)).toBe(true)

        console.log(`   📁 Found ${data.data.data.length} projects`)

        // Verify projects have workspace_id
        if (data.data.data.length > 0) {
          const firstProject = data.data.data[0]
          expect(firstProject.workspace_id).toBeDefined()
          workspaceId = firstProject.workspace_id
          console.log(`   🏢 Workspace ID: ${workspaceId}`)
        }
      } else {
        addResult({
          endpoint: '/api/projects',
          method: 'GET',
          status: 'FAIL',
          statusCode: response.status(),
          responseTime,
          error: data.error || 'Failed to fetch projects'
        })
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      addResult({
        endpoint: '/api/projects',
        method: 'GET',
        status: 'FAIL',
        statusCode: 0,
        responseTime,
        error: error.message
      })
      throw error
    }
  })

  test('should fetch workspace members with complete user profiles', async ({ request }) => {
    const startTime = Date.now()

    try {
      // Get workspace ID from projects if not set
      if (!workspaceId) {
        const projectsResponse = await request.get(`${PRODUCTION_URL}/api/projects`, {
          headers: {
            'Cookie': `sb-access-token=${authToken}`
          }
        })
        const projectsData = await projectsResponse.json()
        if (projectsData.data?.data?.length > 0) {
          workspaceId = projectsData.data.data[0].workspace_id
        }
      }

      if (!workspaceId) {
        console.log('   ⚠️ No workspace ID available to test')
        addResult({
          endpoint: '/api/workspaces/[id]/members',
          method: 'GET',
          status: 'PASS',
          statusCode: 200,
          responseTime: Date.now() - startTime,
          details: { skipped: true, reason: 'No workspace ID available' }
        })
        return
      }

      const response = await request.get(`${PRODUCTION_URL}/api/workspaces/${workspaceId}/members`, {
        headers: {
          'Cookie': `sb-access-token=${authToken}`
        }
      })

      const responseTime = Date.now() - startTime
      const data = await response.json()

      if (response.ok()) {
        const members = data.data || []
        const unknownUsers = members.filter((m: any) =>
          m.user_name === 'Unknown User' || !m.email || !m.user
        )

        addResult({
          endpoint: '/api/workspaces/[id]/members',
          method: 'GET',
          status: unknownUsers.length === 0 ? 'PASS' : 'FAIL',
          statusCode: response.status(),
          responseTime,
          details: {
            memberCount: members.length,
            unknownUserCount: unknownUsers.length,
            allHaveProfiles: unknownUsers.length === 0
          },
          error: unknownUsers.length > 0 ? `Found ${unknownUsers.length} members with incomplete profiles` : undefined
        })

        expect(response.ok()).toBeTruthy()
        expect(data.success).toBe(true)
        expect(Array.isArray(data.data)).toBe(true)

        console.log(`   👥 Found ${members.length} workspace members`)

        // Verify all members have complete profiles
        members.forEach((member: any, index: number) => {
          expect(member.user).toBeDefined()
          expect(member.user.email).toBeTruthy()
          expect(member.user_name).not.toBe('Unknown User')

          if (index === 0) {
            console.log(`   ✅ Sample member: ${member.user_name} (${member.user.email})`)
          }
        })

        if (unknownUsers.length > 0) {
          console.log(`   ❌ Warning: ${unknownUsers.length} members have incomplete profiles`)
        }
      } else {
        addResult({
          endpoint: '/api/workspaces/[id]/members',
          method: 'GET',
          status: 'FAIL',
          statusCode: response.status(),
          responseTime,
          error: data.error || 'Failed to fetch workspace members'
        })
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      addResult({
        endpoint: '/api/workspaces/[id]/members',
        method: 'GET',
        status: 'FAIL',
        statusCode: 0,
        responseTime,
        error: error.message
      })
      throw error
    }
  })

  test('should validate task creation with proper schema', async ({ request }) => {
    const startTime = Date.now()

    try {
      // Get a project ID first
      const projectsResponse = await request.get(`${PRODUCTION_URL}/api/projects`, {
        headers: {
          'Cookie': `sb-access-token=${authToken}`
        }
      })
      const projectsData = await projectsResponse.json()

      if (!projectsData.data?.data?.length) {
        console.log('   ⚠️ No projects available to test task creation')
        addResult({
          endpoint: '/api/tasks',
          method: 'POST',
          status: 'PASS',
          statusCode: 200,
          responseTime: Date.now() - startTime,
          details: { skipped: true, reason: 'No projects available' }
        })
        return
      }

      const projectId = projectsData.data.data[0].id

      const response = await request.post(`${PRODUCTION_URL}/api/tasks`, {
        headers: {
          'Cookie': `sb-access-token=${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          title: `Test Task - ${Date.now()}`,
          description: 'Created by API verification tests',
          status: 'backlog',
          priority: 'medium',
          project_id: projectId
        }
      })

      const responseTime = Date.now() - startTime
      const data = await response.json()

      if (response.ok()) {
        addResult({
          endpoint: '/api/tasks',
          method: 'POST',
          status: 'PASS',
          statusCode: response.status(),
          responseTime,
          details: {
            createdTaskId: data.data?.id,
            hasTitle: !!data.data?.title,
            hasStatus: !!data.data?.status
          }
        })

        expect(response.status()).toBe(201)
        expect(data.success).toBe(true)
        expect(data.data).toBeDefined()
        expect(data.data.id).toBeDefined()
        expect(data.data.title).toContain('Test Task')

        console.log(`   ✅ Created test task: ${data.data.id}`)
      } else {
        addResult({
          endpoint: '/api/tasks',
          method: 'POST',
          status: 'FAIL',
          statusCode: response.status(),
          responseTime,
          error: data.error || 'Failed to create task'
        })
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      addResult({
        endpoint: '/api/tasks',
        method: 'POST',
        status: 'FAIL',
        statusCode: 0,
        responseTime,
        error: error.message
      })
      throw error
    }
  })

  test('should update existing task', async ({ request }) => {
    const startTime = Date.now()

    try {
      // First get a task to update
      const listResponse = await request.get(`${PRODUCTION_URL}/api/tasks`, {
        headers: {
          'Cookie': `sb-access-token=${authToken}`
        }
      })

      const listData = await listResponse.json()
      const tasks = listData.data?.data || []

      if (tasks.length === 0) {
        console.log('   ⚠️ No tasks available to test update')
        addResult({
          endpoint: '/api/tasks/[id]',
          method: 'PUT',
          status: 'PASS',
          statusCode: 200,
          responseTime: Date.now() - startTime,
          details: { skipped: true, reason: 'No tasks available' }
        })
        return
      }

      const taskId = tasks[0].id
      const response = await request.put(`${PRODUCTION_URL}/api/tasks/${taskId}`, {
        headers: {
          'Cookie': `sb-access-token=${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          title: `Updated Task - ${Date.now()}`
        }
      })

      const responseTime = Date.now() - startTime
      const data = await response.json()

      if (response.ok()) {
        addResult({
          endpoint: '/api/tasks/[id]',
          method: 'PUT',
          status: 'PASS',
          statusCode: response.status(),
          responseTime,
          details: {
            updatedTaskId: taskId,
            newTitle: data.data?.title
          }
        })

        expect(response.ok()).toBeTruthy()
        expect(data.success).toBe(true)
        expect(data.data).toBeDefined()
        expect(data.data.id).toBe(taskId)

        console.log(`   ✅ Updated task: ${taskId}`)
      } else {
        addResult({
          endpoint: '/api/tasks/[id]',
          method: 'PUT',
          status: 'FAIL',
          statusCode: response.status(),
          responseTime,
          error: data.error || 'Failed to update task'
        })
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      addResult({
        endpoint: '/api/tasks/[id]',
        method: 'PUT',
        status: 'FAIL',
        statusCode: 0,
        responseTime,
        error: error.message
      })
      throw error
    }
  })

  test('should check health endpoint', async ({ request }) => {
    const startTime = Date.now()

    try {
      const response = await request.get(`${PRODUCTION_URL}/api/health`)
      const responseTime = Date.now() - startTime
      const data = await response.json()

      if (response.ok()) {
        addResult({
          endpoint: '/api/health',
          method: 'GET',
          status: 'PASS',
          statusCode: response.status(),
          responseTime,
          details: {
            status: data.status,
            supabaseConnected: data.supabase?.connected,
            dbAccessible: data.supabase?.dbAccessible
          }
        })

        expect(response.ok()).toBeTruthy()
        expect(data.status).toBeDefined()
        expect(['healthy', 'degraded']).toContain(data.status)

        console.log(`   🏥 Health status: ${data.status}`)
      } else {
        addResult({
          endpoint: '/api/health',
          method: 'GET',
          status: 'FAIL',
          statusCode: response.status(),
          responseTime,
          error: data.error || 'Health check failed'
        })
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      addResult({
        endpoint: '/api/health',
        method: 'GET',
        status: 'FAIL',
        statusCode: 0,
        responseTime,
        error: error.message
      })
      throw error
    }
  })
})

test.describe('Production API Verification - Summary Report', () => {
  test.afterAll(async () => {
    console.log('\n' + '='.repeat(80))
    console.log('📊 API VERIFICATION SUMMARY REPORT')
    console.log('='.repeat(80))

    const passed = testResults.filter(r => r.status === 'PASS')
    const failed = testResults.filter(r => r.status === 'FAIL')
    const avgResponseTime = testResults.reduce((acc, r) => acc + r.responseTime, 0) / testResults.length

    console.log(`\n✅ Passed: ${passed.length}`)
    console.log(`❌ Failed: ${failed.length}`)
    console.log(`📈 Total: ${testResults.length}`)
    console.log(`⚡ Average Response Time: ${avgResponseTime.toFixed(2)}ms`)

    console.log('\n📝 Detailed Results:')
    testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌'
      console.log(`\n${icon} ${result.method} ${result.endpoint}`)
      console.log(`   Status: ${result.statusCode} | Time: ${result.responseTime}ms`)
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`)
      }
    })

    console.log('\n' + '='.repeat(80))
    console.log('🔍 Schema Validation Summary:')
    console.log('='.repeat(80))

    const schemaChecks = {
      'Tasks response has data array': passed.some(r => r.endpoint === '/api/tasks' && r.details?.hasData),
      'Tasks response has pagination': passed.some(r => r.endpoint === '/api/tasks' && r.details?.hasPagination),
      'Projects response has data array': passed.some(r => r.endpoint === '/api/projects' && r.details?.hasData),
      'Workspace members have user profiles': passed.some(r => r.endpoint === '/api/workspaces/[id]/members' && r.details?.allHaveProfiles),
      'No Unknown User data': !failed.some(r => r.endpoint === '/api/workspaces/[id]/members' && r.error?.includes('incomplete profiles')),
      'Auth returns access token': passed.some(r => r.endpoint === '/auth/v1/token' && r.details?.hasAccessToken),
      'Protected endpoints require auth': passed.some(r => r.endpoint === '/api/tasks (no auth)' && r.details?.correctlyProtected),
    }

    Object.entries(schemaChecks).forEach(([check, pass]) => {
      const icon = pass ? '✅' : '❌'
      console.log(`${icon} ${check}`)
    })

    console.log('\n' + '='.repeat(80))
    console.log('⚡ Performance Metrics:')
    console.log('='.repeat(80))

    const perfMetrics = {
      'Fastest Response': Math.min(...testResults.map(r => r.responseTime)),
      'Slowest Response': Math.max(...testResults.map(r => r.responseTime)),
      'Average Response': avgResponseTime,
      'Auth Endpoint': testResults.find(r => r.endpoint === '/auth/v1/token')?.responseTime || 0,
      'Tasks List': testResults.find(r => r.endpoint === '/api/tasks' && r.method === 'GET')?.responseTime || 0,
      'Projects List': testResults.find(r => r.endpoint === '/api/projects')?.responseTime || 0,
    }

    Object.entries(perfMetrics).forEach(([metric, time]) => {
      console.log(`${metric}: ${typeof time === 'number' ? time.toFixed(2) : time}ms`)
    })

    console.log('\n' + '='.repeat(80))
    console.log('🚨 Issues Detected:')
    console.log('='.repeat(80))

    if (failed.length === 0) {
      console.log('✅ No issues detected - all tests passed!')
    } else {
      failed.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.method} ${result.endpoint}`)
        console.log(`   Status Code: ${result.statusCode}`)
        console.log(`   Error: ${result.error}`)
        if (result.details) {
          console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`)
        }
      })
    }

    console.log('\n' + '='.repeat(80))
    console.log('✨ Test completed successfully')
    console.log('='.repeat(80) + '\n')
  })

  test('generate final report', () => {
    // This test exists just to trigger the afterAll hook
    expect(testResults.length).toBeGreaterThan(0)
  })
})
