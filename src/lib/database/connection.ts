import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../supabase/types'

// Connection configuration
const CONNECTION_CONFIG = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' as const
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  db: {
    schema: 'public' as const
  },
  global: {
    headers: {
      'x-my-custom-header': 'foco-app'
    }
  }
}

// Connection retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  backoffMultiplier: 2
}

class DatabaseConnection {
  private static instance: DatabaseConnection
  private client: SupabaseClient<Database> | null = null
  private isConnected: boolean = false
  private connectionAttempts: number = 0

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection()
    }
    return DatabaseConnection.instance
  }

  public async connect(): Promise<SupabaseClient<Database>> {
    if (this.client && this.isConnected) {
      return this.client
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }

    try {
      this.client = createClient<Database>(supabaseUrl, supabaseAnonKey, CONNECTION_CONFIG) as SupabaseClient<Database>
      
      // Test the connection
      await this.testConnection()
      this.isConnected = true
      this.connectionAttempts = 0
      
      console.log('✅ Database connection established successfully')
      return this.client
    } catch (error) {
      this.isConnected = false
      this.connectionAttempts++
      
      if (this.connectionAttempts < RETRY_CONFIG.maxRetries) {
        console.log(`⚠️ Connection attempt ${this.connectionAttempts} failed, retrying...`)
        await this.delay(RETRY_CONFIG.retryDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, this.connectionAttempts - 1))
        return this.connect()
      }
      
      throw new Error(`Failed to connect to database after ${RETRY_CONFIG.maxRetries} attempts: ${error}`)
    }
  }

  public async testConnection(): Promise<boolean> {
    if (!this.client) {
      throw new Error('No database client available')
    }

    try {
      // Test auth connection
      const { error: authError } = await this.client.auth.getSession()
      if (authError) {
        throw new Error(`Auth test failed: ${authError.message}`)
      }

      // Test database connectivity by checking if we can query a table
      const { error: dbError } = await this.client
        .from('workspaces')
        .select('count')
        .limit(1)

      if (dbError && !dbError.message.includes('does not exist')) {
        throw new Error(`Database test failed: ${dbError.message}`)
      }

      return true
    } catch (error) {
      throw new Error(`Connection test failed: ${error}`)
    }
  }

  public getClient(): SupabaseClient<Database> {
    if (!this.client || !this.isConnected) {
      throw new Error('Database not connected. Call connect() first.')
    }
    return this.client
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      // Supabase doesn't have an explicit disconnect method
      // but we can clear our references
      this.client = null
      this.isConnected = false
      console.log('🔌 Database connection closed')
    }
  }

  public isConnectionHealthy(): boolean {
    return this.isConnected && this.client !== null
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Health check method for monitoring
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy'
    details: {
      connected: boolean
      lastCheck: string
      latency?: number
    }
  }> {
    const startTime = Date.now()
    
    try {
      if (!this.isConnectionHealthy()) {
        return {
          status: 'unhealthy',
          details: {
            connected: false,
            lastCheck: new Date().toISOString()
          }
        }
      }

      await this.testConnection()
      const latency = Date.now() - startTime

      return {
        status: 'healthy',
        details: {
          connected: true,
          lastCheck: new Date().toISOString(),
          latency
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          lastCheck: new Date().toISOString()
        }
      }
    }
  }
}

// Export singleton instance
export const dbConnection = DatabaseConnection.getInstance()

// Convenience function for getting connected client
export async function getDatabase(): Promise<SupabaseClient<Database>> {
  return await dbConnection.connect()
}

// Health check endpoint helper
export async function getDatabaseHealth() {
  return await dbConnection.healthCheck()
}