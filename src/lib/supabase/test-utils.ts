import { supabase } from '../supabase-client'

/**
 * Test utilities for database connectivity and operations
 */

/**
 * Tests basic Supabase connection by checking if we can reach the service
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean
  message: string
  details?: any
}> {
  try {
    // Test basic connection by checking auth state
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      return {
        success: false,
        message: `Supabase connection failed: ${error.message}`,
        details: error
      }
    }

    // Test database connectivity by checking if we can query a simple table
    // We'll try to select from a table that should exist (organizations)
    const { data: testData, error: dbError } = await supabase
      .from('organizations')
      .select('count')
      .limit(1)

    if (dbError) {
      // If the table doesn't exist yet, that's expected - we just want to test connectivity
      if (dbError.code === 'PGRST116' || dbError.message.includes('relation "public.organizations" does not exist')) {
        return {
          success: true,
          message: 'Supabase connection successful - database schema not yet created',
          details: { authWorking: true, dbAccessible: true, schemaMissing: true }
        }
      }

      return {
        success: false,
        message: `Database connection failed: ${dbError.message}`,
        details: dbError
      }
    }

    return {
      success: true,
      message: 'Supabase connection and database access successful',
      details: {
        authWorking: true,
        dbAccessible: true,
        schemaExists: true,
        testResult: testData
      }
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Unexpected error testing Supabase connection: ${error.message}`,
      details: error
    }
  }
}

/**
 * Tests environment variable configuration
 */
export function testEnvironmentSetup(): {
  success: boolean
  message: string
  missingVars: string[]
} {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]

  const missingVars: string[] = []

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName)
    }
  }

  if (missingVars.length > 0) {
    return {
      success: false,
      message: `Missing required environment variables: ${missingVars.join(', ')}`,
      missingVars
    }
  }

  return {
    success: true,
    message: 'All required environment variables are configured',
    missingVars: []
  }
}

/**
 * Comprehensive database connectivity test
 */
export async function runDatabaseConnectivityTest(): Promise<{
  success: boolean
  results: {
    environment: { success: boolean; message: string; missingVars: string[] }
    connection: { success: boolean; message: string; details?: any }
  }
}> {
  const environment = testEnvironmentSetup()
  const connection = await testSupabaseConnection()

  return {
    success: environment.success && connection.success,
    results: {
      environment,
      connection
    }
  }
}


