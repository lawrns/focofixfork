import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../supabase/types'
import { getDatabase } from './connection'
import { logger } from '@/lib/logger'

type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
type ProjectInsert = Database['public']['Tables']['projects']['Insert']
type TaskInsert = Database['public']['Tables']['tasks']['Insert']

// Type definitions for database operations
export type DatabaseResult<T> = {
  data: T | null
  error: string | null
  success: boolean
}

export type QueryOptions = {
  limit?: number
  offset?: number
  orderBy?: string
  ascending?: boolean
}

export class DatabaseService {
  private client: SupabaseClient<Database> | null = null

  constructor() {
    this.initializeClient()
  }

  private async initializeClient(): Promise<void> {
    try {
      this.client = await getDatabase()
    } catch (error) {
      logger.error('Database client init failed', error as any)
    }
  }

  private async ensureClient(): Promise<SupabaseClient<Database>> {
    if (!this.client) {
      this.client = await getDatabase()
    }
    return this.client
  }

  // Generic query method with error handling
  private async executeQuery<T>(
    operation: (client: SupabaseClient<Database>) => Promise<{ data: T | null; error: any }>
  ): Promise<DatabaseResult<T>> {
    try {
      const client = await this.ensureClient()
      const { data, error } = await operation(client)

      if (error) {
        logger.error('Database query error', error as any)
        return {
          data: null,
          error: (error as any)?.message || 'Database operation failed',
          success: false
        }
      }

      return {
        data,
        error: null,
        success: true
      }
    } catch (error) {
      logger.error('Database service error', error as any)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown database error',
        success: false
      }
    }
  }

  // Organizations
  async getOrganizations(options: QueryOptions = {}): Promise<DatabaseResult<Database['public']['Tables']['organizations']['Row'][]>> {
    return this.executeQuery(async (client) => {
      let query = client.from('organizations').select('*')
      
      if (options.limit) query = query.limit(options.limit)
      if (options.offset) query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1)
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? true })
      }

      return await query
    })
  }

  async getOrganizationById(id: string): Promise<DatabaseResult<Database['public']['Tables']['organizations']['Row']>> {
    return this.executeQuery(async (client) => {
      return await client
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single()
    })
  }

  async createOrganization(data: OrganizationInsert): Promise<DatabaseResult<Database['public']['Tables']['organizations']['Row']>> {
    return this.executeQuery(async (client) => {
      return await client
        .from('organizations')
        .insert(data)
        .select()
        .single()
    })
  }

  // Projects
  async getProjects(organizationId?: string, options: QueryOptions = {}): Promise<DatabaseResult<Database['public']['Tables']['projects']['Row'][]>> {
    return this.executeQuery(async (client) => {
      let query = client.from('projects').select('*')
      
      if (organizationId) query = query.eq('organization_id', organizationId)
      if (options.limit) query = query.limit(options.limit)
      if (options.offset) query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1)
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? true })
      }

      return await query
    })
  }

  async getProjectById(id: string): Promise<DatabaseResult<Database['public']['Tables']['projects']['Row']>> {
    return this.executeQuery(async (client) => {
      return await client
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()
    })
  }

  async createProject(data: ProjectInsert): Promise<DatabaseResult<Database['public']['Tables']['projects']['Row']>> {
    return this.executeQuery(async (client) => {
      return await client
        .from('projects')
        .insert(data)
        .select()
        .single()
    })
  }

  // Tasks
  async getTasks(projectId?: string, options: QueryOptions = {}): Promise<DatabaseResult<Database['public']['Tables']['tasks']['Row'][]>> {
    return this.executeQuery(async (client) => {
      let query = client.from('tasks').select('*')
      
      if (projectId) query = query.eq('project_id', projectId)
      if (options.limit) query = query.limit(options.limit)
      if (options.offset) query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1)
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? true })
      }

      return await query
    })
  }

  async getTaskById(id: string): Promise<DatabaseResult<Database['public']['Tables']['tasks']['Row']>> {
    return this.executeQuery(async (client) => {
      return await client
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single()
    })
  }

  async createTask(data: TaskInsert): Promise<DatabaseResult<Database['public']['Tables']['tasks']['Row']>> {
    return this.executeQuery(async (client) => {
      return await client
        .from('tasks')
        .insert(data)
        .select()
        .single()
    })
  }

  async updateTask(id: string, data: Database['public']['Tables']['tasks']['Update']): Promise<DatabaseResult<Database['public']['Tables']['tasks']['Row']>> {
    return this.executeQuery(async (client) => {
      return await client
        .from('tasks')
        .update(data)
        .eq('id', id)
        .select()
        .single()
    })
  }

  // Milestones
  async getMilestones(projectId?: string, options: QueryOptions = {}): Promise<DatabaseResult<Database['public']['Tables']['milestones']['Row'][]>> {
    return this.executeQuery(async (client) => {
      let query = client.from('milestones').select('*')
      
      if (projectId) query = query.eq('project_id', projectId)
      if (options.limit) query = query.limit(options.limit)
      if (options.offset) query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1)
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? true })
      }

      return await query
    })
  }

  // User Profiles
  async getUserProfile(userId: string): Promise<DatabaseResult<Database['public']['Tables']['user_profiles']['Row']>> {
    return this.executeQuery(async (client) => {
      return await client
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()
    })
  }

  async updateUserProfile(userId: string, data: Database['public']['Tables']['user_profiles']['Update']): Promise<DatabaseResult<Database['public']['Tables']['user_profiles']['Row']>> {
    return this.executeQuery(async (client) => {
      return await client
        .from('user_profiles')
        .update(data)
        .eq('id', userId)
        .select()
        .single()
    })
  }

  // Real-time subscriptions
  subscribeToTable<T = any>(
    table: keyof Database['public']['Tables'],
    callback: (payload: any) => void,
    filter?: string
  ) {
    return this.client?.channel(`public:${table}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: table as string,
          filter: filter 
        }, 
        callback
      )
      .subscribe()
  }

  // Batch operations
  async batchInsert(
    table: keyof Database['public']['Tables'],
    data: any[]
  ): Promise<DatabaseResult<any[]>> {
    return this.executeQuery(async (client) => {
      return await client
        .from(table)
        .insert(data)
        .select()
    })
  }

  // Health check
  async healthCheck(): Promise<DatabaseResult<{ status: string; timestamp: string }>> {
    return this.executeQuery(async (client) => {
      const { data, error } = await client
        .from('organizations')
        .select('count')
        .limit(1)

      if (error && !error.message.includes('does not exist')) {
        throw error
      }

      return {
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString()
        },
        error: null
      }
    })
  }
}

// Export singleton instance
export const databaseService = new DatabaseService()

// Convenience exports
export { getDatabase } from './connection'
