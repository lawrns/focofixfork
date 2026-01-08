import { Pool } from 'pg'
import { FeatureFlagsService, FeatureFlagContext } from '../feature-flags/feature-flags'
import { PaginationQuery, PaginatedResponse, createPaginatedResponse } from '../pagination/pagination'

/**
 * Database Adapter Layer for Voice Planning Migration
 * Provides abstraction between application logic and database schema changes
 * Supports both legacy and new schema during migration phases
 */

// Database connection configuration
const DB_CONFIG = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
}

// Create database pool
const pool = new Pool(DB_CONFIG)

/**
 * Base adapter interface
 */
export interface BaseAdapter<T> {
  findById(id: string): Promise<T | null>
  findMany(filters?: any, pagination?: PaginationQuery): Promise<PaginatedResponse<T>>
  create(data: Partial<T>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T>
  delete(id: string): Promise<boolean>
}

/**
 * Voice session data model
 */
export interface VoiceSession {
  id: string
  organization_id: string
  user_id: string
  title?: string
  description?: string
  language: string
  status: string
  max_duration_seconds: number
  audio_format: string
  sample_rate: number
  noise_reduction_enabled: boolean
  started_at: Date
  ended_at?: Date
  last_activity_at: Date
  transcription_status: string
  transcript?: string
  transcript_confidence?: number
  transcribed_at?: Date
  transcription_model?: string
  plan_status: string
  plan_json?: any
  plan_confidence?: number
  plan_generated_at?: Date
  plan_model?: string
  commit_status: string
  commit_errors?: any
  committed_at?: Date
  created_at: Date
  updated_at: Date
  created_by?: string
  updated_by?: string
  feature_flags: any
  experimental_settings: any
  metadata: any
}

/**
 * Enhanced project model (includes voice data)
 */
export interface EnhancedProject {
  id: string
  name: string
  description?: string
  organization_id: string
  status: string
  priority: string
  start_date?: Date
  due_date?: Date
  progress_percentage: number
  created_at: Date
  updated_at: Date
  created_by?: string
  updated_by?: string
  
  // Voice-related fields
  voice_session_id?: string
  voice_generated: boolean
  voice_confidence?: number
  voice_metadata: any
  voice_commit_status: string
  voice_committed_at?: Date
  
  // Computed fields from compatibility view
  voice_session_title?: string
  voice_session_description?: string
  voice_session_language?: string
  voice_session_status?: string
  voice_session_started_at?: Date
  voice_session_ended_at?: Date
  voice_session_transcript?: string
  voice_session_transcript_confidence?: number
  voice_plan_status?: string
  voice_plan_confidence?: number
  voice_plan_generated_at?: Date
  creation_method: string
  is_voice_committed: boolean
  voice_quality_rating: string
}

/**
 * Enhanced milestone model (includes voice data)
 */
export interface EnhancedMilestone {
  id: string
  name: string
  description?: string
  project_id: string
  status: string
  progress_percentage: number
  deadline?: Date
  due_date?: Date
  completion_date?: Date
  created_at: Date
  updated_at: Date
  created_by?: string
  updated_by?: string
  
  // Voice-related fields
  voice_session_id?: string
  voice_generated: boolean
  voice_task_id?: string
  voice_confidence?: number
  voice_metadata: any
  voice_commit_status: string
  voice_committed_at?: Date
  
  // Voice session details
  voice_session_title?: string
  voice_session_language?: string
  voice_session_started_at?: Date
  voice_session_transcript?: string
  voice_plan_confidence?: number
  voice_plan_milestone?: any
  creation_method: string
  is_voice_committed: boolean
}

/**
 * Enhanced task model (includes voice data)
 */
export interface EnhancedTask {
  id: string
  title: string
  description?: string
  project_id: string
  milestone_id?: string
  status: string
  priority: string
  assignee_id?: string
  estimated_hours?: number
  actual_hours?: number
  due_date?: Date
  created_at: Date
  updated_at: Date
  created_by?: string
  updated_by?: string
  
  // Voice-related fields
  voice_session_id?: string
  voice_generated: boolean
  voice_task_id?: string
  voice_milestone_id?: string
  voice_confidence?: number
  voice_metadata: any
  voice_dependencies: string[]
  voice_commit_status: string
  voice_committed_at?: Date
  
  // Voice session details
  voice_session_title?: string
  voice_session_language?: string
  voice_session_started_at?: Date
  voice_session_transcript?: string
  voice_plan_confidence?: number
  voice_plan_task?: any
  resolved_dependencies?: string[]
  creation_method: string
  is_voice_committed: boolean
  voice_quality_rating: string
  voice_dependency_count: number
}

/**
 * Adapter configuration for choosing between legacy and new schema
 */
export interface AdapterConfig {
  useCompatibilityViews: boolean
  enableVoiceFeatures: boolean
  enableDualWriteMode: boolean
  context: FeatureFlagContext
}

/**
 * Voice Sessions Adapter
 */
export class VoiceSessionsAdapter implements BaseAdapter<VoiceSession> {
  private config: AdapterConfig

  constructor(config: AdapterConfig) {
    this.config = config
  }

  async findById(id: string): Promise<VoiceSession | null> {
    const query = `
      SELECT * FROM voice_sessions 
      WHERE id = $1 AND 
      (organization_id = ANY(SELECT organization_id FROM user_organizations WHERE user_id = $2) OR user_id = $2)
    `
    
    const result = await pool.query(query, [id, this.config.context.userId])
    return result.rows[0] || null
  }

  async findMany(filters: any = {}, pagination?: PaginationQuery): Promise<PaginatedResponse<VoiceSession>> {
    let query = 'SELECT * FROM voice_sessions WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    // Apply filters
    if (filters.organization_id) {
      query += ` AND organization_id = $${paramIndex++}`
      params.push(filters.organization_id)
    }
    
    if (filters.user_id) {
      query += ` AND user_id = $${paramIndex++}`
      params.push(filters.user_id)
    }
    
    if (filters.status) {
      query += ` AND status = $${paramIndex++}`
      params.push(filters.status)
    }
    
    if (filters.plan_status) {
      query += ` AND plan_status = $${paramIndex++}`
      params.push(filters.plan_status)
    }

    // Add user access control
    query += ` AND (organization_id = ANY(SELECT organization_id FROM user_organizations WHERE user_id = $${paramIndex++}) OR user_id = $${paramIndex++})`
    params.push(this.config.context.userId, this.config.context.userId)

    // Add ordering
    query += ' ORDER BY created_at DESC'

    // Add pagination
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.limit
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
      params.push(pagination.limit, offset)
    }

    const result = await pool.query(query, params)
    
    // Get total count for pagination
    const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) FROM').replace(/ORDER BY.*$/, '')
    const countResult = await pool.query(countQuery, params.slice(0, -2)) // Remove limit/offset params
    const totalItems = parseInt(countResult.rows[0].count)

    return createPaginatedResponse(result.rows, totalItems, pagination || { page: 1, limit: 20 })
  }

  async create(data: Partial<VoiceSession>): Promise<VoiceSession> {
    if (!this.config.enableVoiceFeatures) {
      throw new Error('Voice features are disabled')
    }

    const fields = Object.keys(data).filter(key => data[key as keyof VoiceSession] !== undefined)
    const values = fields.map(field => data[field as keyof VoiceSession])
    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ')

    const query = `
      INSERT INTO voice_sessions (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `

    const result = await pool.query(query, values)
    return result.rows[0]
  }

  async update(id: string, data: Partial<VoiceSession>): Promise<VoiceSession> {
    if (!this.config.enableVoiceFeatures) {
      throw new Error('Voice features are disabled')
    }

    const fields = Object.keys(data).filter(key => data[key as keyof VoiceSession] !== undefined)
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ')
    const values = fields.map(field => data[field as keyof VoiceSession])

    const query = `
      UPDATE voice_sessions 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1 AND 
      (organization_id = ANY(SELECT organization_id FROM user_organizations WHERE user_id = $${fields.length + 2}) OR user_id = $${fields.length + 2})
      RETURNING *
    `

    const result = await pool.query(query, [id, ...values, this.config.context.userId, this.config.context.userId])
    return result.rows[0]
  }

  async delete(id: string): Promise<boolean> {
    if (!this.config.enableVoiceFeatures) {
      throw new Error('Voice features are disabled')
    }

    const query = `
      DELETE FROM voice_sessions 
      WHERE id = $1 AND 
      (organization_id = ANY(SELECT organization_id FROM user_organizations WHERE user_id = $2) OR user_id = $2)
    `

    const result = await pool.query(query, [id, this.config.context.userId])
    return result.rowCount > 0
  }

  // Voice-specific methods
  async findByUserId(userId: string): Promise<VoiceSession[]> {
    const query = 'SELECT * FROM voice_sessions WHERE user_id = $1 ORDER BY created_at DESC'
    const result = await pool.query(query, [userId])
    return result.rows
  }

  async findActiveSession(userId: string): Promise<VoiceSession | null> {
    const query = `
      SELECT * FROM voice_sessions 
      WHERE user_id = $1 AND status = 'active' 
      ORDER BY started_at DESC 
      LIMIT 1
    `
    const result = await pool.query(query, [userId])
    return result.rows[0] || null
  }

  async updateTranscription(sessionId: string, transcript: string, confidence: number): Promise<VoiceSession> {
    const query = `
      UPDATE voice_sessions 
      SET transcript = $2, transcript_confidence = $3, transcription_status = 'completed', transcribed_at = NOW()
      WHERE id = $1
      RETURNING *
    `
    const result = await pool.query(query, [sessionId, transcript, confidence])
    return result.rows[0]
  }

  async updatePlan(sessionId: string, planJson: any, confidence: number, model: string): Promise<VoiceSession> {
    const query = `
      UPDATE voice_sessions 
      SET plan_json = $2, plan_confidence = $3, plan_model = $4, plan_status = 'completed', plan_generated_at = NOW()
      WHERE id = $1
      RETURNING *
    `
    const result = await pool.query(query, [sessionId, planJson, confidence, model])
    return result.rows[0]
  }
}

/**
 * Projects Adapter (with voice support)
 */
export class ProjectsAdapter implements BaseAdapter<EnhancedProject> {
  private config: AdapterConfig

  constructor(config: AdapterConfig) {
    this.config = config
  }

  private getTableName(): string {
    return this.config.useCompatibilityViews ? 'projects_compat' : 'projects'
  }

  async findById(id: string): Promise<EnhancedProject | null> {
    const tableName = this.getTableName()
    const query = `
      SELECT * FROM ${tableName} 
      WHERE id = $1 AND organization_id = ANY(
        SELECT organization_id FROM user_organizations WHERE user_id = $2
      )
    `
    
    const result = await pool.query(query, [id, this.config.context.userId])
    return result.rows[0] || null
  }

  async findMany(filters: any = {}, pagination?: PaginationQuery): Promise<PaginatedResponse<EnhancedProject>> {
    const tableName = this.getTableName()
    let query = `SELECT * FROM ${tableName} WHERE 1=1`
    const params: any[] = []
    let paramIndex = 1

    // Apply filters
    if (filters.organization_id) {
      query += ` AND organization_id = $${paramIndex++}`
      params.push(filters.organization_id)
    }
    
    if (filters.status) {
      query += ` AND status = $${paramIndex++}`
      params.push(filters.status)
    }
    
    if (filters.voice_generated !== undefined) {
      query += ` AND voice_generated = $${paramIndex++}`
      params.push(filters.voice_generated)
    }
    
    if (filters.voice_commit_status) {
      query += ` AND voice_commit_status = $${paramIndex++}`
      params.push(filters.voice_commit_status)
    }

    // Add organization access control
    query += ` AND organization_id = ANY(SELECT organization_id FROM user_organizations WHERE user_id = $${paramIndex++})`
    params.push(this.config.context.userId)

    // Add ordering
    query += ' ORDER BY created_at DESC'

    // Add pagination
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.limit
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
      params.push(pagination.limit, offset)
    }

    const result = await pool.query(query, params)
    
    // Get total count for pagination
    const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) FROM').replace(/ORDER BY.*$/, '')
    const countResult = await pool.query(countQuery, params.slice(0, -2))
    const totalItems = parseInt(countResult.rows[0].count)

    return createPaginatedResponse(result.rows, totalItems, pagination || { page: 1, limit: 20 })
  }

  async create(data: Partial<EnhancedProject>): Promise<EnhancedProject> {
    const tableName = this.getTableName()
    
    // If voice features are enabled and this is a voice-generated project
    if (this.config.enableVoiceFeatures && data.voice_generated && data.voice_session_id) {
      // Add voice metadata
      const enhancedData = {
        ...data,
        voice_commit_status: 'pending',
        voice_committed_at: null
      }
      
      const fields = Object.keys(enhancedData).filter(key => enhancedData[key as keyof EnhancedProject] !== undefined)
      const values = fields.map(field => enhancedData[field as keyof EnhancedProject])
      const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ')

      const query = `
        INSERT INTO ${tableName} (${fields.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `

      const result = await pool.query(query, values)
      return result.rows[0]
    }

    // Standard project creation
    const fields = Object.keys(data).filter(key => data[key as keyof EnhancedProject] !== undefined)
    const values = fields.map(field => data[field as keyof EnhancedProject])
    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ')

    const query = `
      INSERT INTO ${tableName} (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `

    const result = await pool.query(query, values)
    return result.rows[0]
  }

  async update(id: string, data: Partial<EnhancedProject>): Promise<EnhancedProject> {
    const tableName = this.getTableName()
    const fields = Object.keys(data).filter(key => data[key as keyof EnhancedProject] !== undefined)
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ')
    const values = fields.map(field => data[field as keyof EnhancedProject])

    const query = `
      UPDATE ${tableName} 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1 AND organization_id = ANY(
        SELECT organization_id FROM user_organizations WHERE user_id = $${fields.length + 2}
      )
      RETURNING *
    `

    const result = await pool.query(query, [id, ...values, this.config.context.userId])
    return result.rows[0]
  }

  async delete(id: string): Promise<boolean> {
    const tableName = this.getTableName()
    const query = `
      DELETE FROM ${tableName} 
      WHERE id = $1 AND organization_id = ANY(
        SELECT organization_id FROM user_organizations WHERE user_id = $2
      )
    `

    const result = await pool.query(query, [id, this.config.context.userId])
    return result.rowCount > 0
  }

  // Voice-specific methods
  async findByVoiceSession(sessionId: string): Promise<EnhancedProject[]> {
    const tableName = this.getTableName()
    const query = `
      SELECT * FROM ${tableName} 
      WHERE voice_session_id = $1 AND organization_id = ANY(
        SELECT organization_id FROM user_organizations WHERE user_id = $2
      )
      ORDER BY created_at DESC
    `
    const result = await pool.query(query, [sessionId, this.config.context.userId])
    return result.rows
  }

  async markVoiceCommitted(id: string, confidence: number): Promise<EnhancedProject> {
    const tableName = this.getTableName()
    const query = `
      UPDATE ${tableName} 
      SET voice_commit_status = 'committed', voice_committed_at = NOW(), voice_confidence = $2
      WHERE id = $1
      RETURNING *
    `
    const result = await pool.query(query, [id, confidence])
    return result.rows[0]
  }
}

/**
 * Adapter Factory
 */
export class AdapterFactory {
  private static featureFlags = FeatureFlagsService.getInstance()

  static createVoiceSessionsAdapter(context: FeatureFlagContext): VoiceSessionsAdapter {
    const config: AdapterConfig = {
      useCompatibilityViews: false, // Voice sessions are always new
      enableVoiceFeatures: this.featureFlags.isEnabled('voice_capture_enabled', context) ||
                          this.featureFlags.isEnabled('voice_capture_shadow_mode', context),
      enableDualWriteMode: this.featureFlags.isEnabled('system_dual_write_mode', context),
      context
    }

    return new VoiceSessionsAdapter(config)
  }

  static createProjectsAdapter(context: FeatureFlagContext): ProjectsAdapter {
    const config: AdapterConfig = {
      useCompatibilityViews: this.featureFlags.isEnabled('system_compatibility_views', context),
      enableVoiceFeatures: this.featureFlags.isEnabled('voice_capture_enabled', context) ||
                          this.featureFlags.isEnabled('voice_capture_shadow_mode', context),
      enableDualWriteMode: this.featureFlags.isEnabled('system_dual_write_mode', context),
      context
    }

    return new ProjectsAdapter(config)
  }

  static createAdapterConfig(context: FeatureFlagContext): AdapterConfig {
    return {
      useCompatibilityViews: this.featureFlags.isEnabled('system_compatibility_views', context),
      enableVoiceFeatures: this.featureFlags.isEnabled('voice_capture_enabled', context) ||
                          this.featureFlags.isEnabled('voice_capture_shadow_mode', context),
      enableDualWriteMode: this.featureFlags.isEnabled('system_dual_write_mode', context),
      context
    }
  }
}

/**
 * Database connection utilities
 */
export class DatabaseUtils {
  static async getConnection(): Promise<Pool> {
    return pool
  }

  static async testConnection(): Promise<boolean> {
    try {
      const client = await pool.connect()
      const result = await client.query('SELECT NOW()')
      client.release()
      return result.rows.length > 0
    } catch (error) {
      console.error('Database connection test failed:', error)
      return false
    }
  }

  static async closeConnection(): Promise<void> {
    await pool.end()
  }

  static async executeQuery(query: string, params: any[] = []): Promise<any> {
    const result = await pool.query(query, params)
    return result.rows
  }

  static async executeTransaction(queries: Array<{ query: string; params?: any[] }>): Promise<any[]> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const results = []
      
      for (const { query, params = [] } of queries) {
        const result = await client.query(query, params)
        results.push(result.rows)
      }
      
      await client.query('COMMIT')
      return results
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}

// Types are already exported through their interface declarations
