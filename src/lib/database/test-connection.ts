import { databaseService } from './service'
import { getDatabase } from './connection'

export async function testDatabaseConnection(): Promise<{
  success: boolean
  results: Array<{ test: string; status: 'pass' | 'fail'; message: string; duration?: number }>
}> {
  const results: Array<{ test: string; status: 'pass' | 'fail'; message: string; duration?: number }> = []
  let overallSuccess = true

  // Helper function to run a test
  const runTest = async (testName: string, testFn: () => Promise<void>) => {
    const startTime = Date.now()
    try {
      await testFn()
      const duration = Date.now() - startTime
      results.push({
        test: testName,
        status: 'pass',
        message: 'Test passed successfully',
        duration
      })
    } catch (error) {
      const duration = Date.now() - startTime
      overallSuccess = false
      results.push({
        test: testName,
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration
      })
    }
  }

  console.log('🔍 Starting database connection tests...\n')

  // Test 1: Basic connection
  await runTest('Basic Connection', async () => {
    const client = await getDatabase()
    if (!client) {
      throw new Error('Failed to get database client')
    }
  })

  // Test 2: Health check
  await runTest('Health Check', async () => {
    const result = await databaseService.healthCheck()
    if (!result.success) {
      throw new Error(result.error || 'Health check failed')
    }
  })

  // Test 3: Organizations table access
  await runTest('Organizations Table Access', async () => {
    const result = await databaseService.getOrganizations({ limit: 1 })
    if (!result.success && !result.error?.includes('does not exist')) {
      throw new Error(result.error || 'Failed to access organizations table')
    }
  })

  // Test 4: Projects table access
  await runTest('Projects Table Access', async () => {
    const result = await databaseService.getProjects(undefined, { limit: 1 })
    if (!result.success && !result.error?.includes('does not exist')) {
      throw new Error(result.error || 'Failed to access projects table')
    }
  })

  // Test 5: Tasks table access
  await runTest('Tasks Table Access', async () => {
    const result = await databaseService.getTasks(undefined, { limit: 1 })
    if (!result.success && !result.error?.includes('does not exist')) {
      throw new Error(result.error || 'Failed to access tasks table')
    }
  })

  // Test 6: User profiles table access
  await runTest('User Profiles Table Access', async () => {
    try {
      // Try to get a user profile (this might fail if no users exist, which is okay)
      const result = await databaseService.getUserProfile('test-user-id')
      // We expect this to fail with "not found" rather than connection errors
      if (!result.success && !result.error?.includes('not found') && !result.error?.includes('does not exist')) {
        throw new Error(result.error || 'Unexpected error accessing user profiles table')
      }
    } catch (error) {
      // If the table doesn't exist, that's okay for testing
      if (error instanceof Error && !error.message.includes('does not exist')) {
        throw error
      }
    }
  })

  // Test 7: Environment variables
  await runTest('Environment Variables', async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
    }
    if (!supabaseKey) {
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
    }
    
    // Validate URL format
    try {
      new URL(supabaseUrl)
    } catch {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is not a valid URL')
    }
  })

  // Print results
  console.log('📊 Test Results:')
  console.log('================')
  
  results.forEach((result, index) => {
    const icon = result.status === 'pass' ? '✅' : '❌'
    const duration = result.duration ? ` (${result.duration}ms)` : ''
    console.log(`${icon} ${index + 1}. ${result.test}${duration}`)
    if (result.status === 'fail') {
      console.log(`   Error: ${result.message}`)
    }
  })

  console.log('\n📈 Summary:')
  console.log(`Total tests: ${results.length}`)
  console.log(`Passed: ${results.filter(r => r.status === 'pass').length}`)
  console.log(`Failed: ${results.filter(r => r.status === 'fail').length}`)
  console.log(`Overall status: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`)

  return {
    success: overallSuccess,
    results
  }
}

// Export for use in other files
export { databaseService } from './service'