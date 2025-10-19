/**
 * Database Performance Optimizer
 * Provides utilities for optimizing PostgreSQL queries and database operations
 */

import { supabaseAdmin } from '@/lib/supabase-server'

export interface QueryMetrics {
  query: string
  executionTime: number
  rowCount: number
  timestamp: Date
}

export interface DatabaseStats {
  totalConnections: number
  activeConnections: number
  idleConnections: number
  databaseSize: string
  cacheHitRatio: number
  slowQueries: QueryMetrics[]
}

class DatabaseOptimizer {
  private queryCache = new Map<string, { result: any; timestamp: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Execute optimized query with caching
   */
  async executeQuery<T>(
    query: string,
    params?: any[],
    useCache: boolean = true
  ): Promise<T[]> {
    const cacheKey = `${query}:${JSON.stringify(params)}`
    
    // Check cache first
    if (useCache && this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey)!
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.result
      }
    }

    const startTime = Date.now()
    
    try {
      const { data, error } = await supabaseAdmin.rpc('execute_sql', {
        query,
        params: params || []
      })

      if (error) {
        throw new Error(`Database query error: ${error.message}`)
      }

      const executionTime = Date.now() - startTime
      
      // Log slow queries
      if (executionTime > 1000) {
        console.warn(`Slow query detected (${executionTime}ms):`, query)
      }

      // Cache result
      if (useCache) {
        this.queryCache.set(cacheKey, {
          result: data || [],
          timestamp: Date.now()
        })
      }

      return data || []
    } catch (error) {
      console.error('Database query failed:', error)
      throw error
    }
  }

  /**
   * Get database performance statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    try {
      const [
        connectionsResult,
        sizeResult,
        cacheResult,
        slowQueriesResult
      ] = await Promise.all([
        this.executeQuery(`
          SELECT 
            count(*) as total_connections,
            count(*) FILTER (WHERE state = 'active') as active_connections,
            count(*) FILTER (WHERE state = 'idle') as idle_connections
          FROM pg_stat_activity
        `),
        this.executeQuery(`
          SELECT pg_size_pretty(pg_database_size(current_database())) as database_size
        `),
        this.executeQuery(`
          SELECT 
            round(
              (sum(blks_hit) / (sum(blks_hit) + sum(blks_read))) * 100, 2
            ) as cache_hit_ratio
          FROM pg_stat_database 
          WHERE datname = current_database()
        `),
        this.executeQuery(`
          SELECT 
            query,
            mean_exec_time as execution_time,
            calls as row_count,
            now() as timestamp
          FROM pg_stat_statements 
          WHERE mean_exec_time > 1000
          ORDER BY mean_exec_time DESC
          LIMIT 10
        `)
      ])

      return {
        totalConnections: (connectionsResult[0] as any)?.total_connections || 0,
        activeConnections: (connectionsResult[0] as any)?.active_connections || 0,
        idleConnections: (connectionsResult[0] as any)?.idle_connections || 0,
        databaseSize: (sizeResult[0] as any)?.database_size || 'Unknown',
        cacheHitRatio: (cacheResult[0] as any)?.cache_hit_ratio || 0,
        slowQueries: slowQueriesResult.map((q: any) => ({
          query: q.query,
          executionTime: q.execution_time,
          rowCount: q.row_count,
          timestamp: new Date(q.timestamp)
        }))
      }
    } catch (error) {
      console.error('Failed to get database stats:', error)
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        databaseSize: 'Unknown',
        cacheHitRatio: 0,
        slowQueries: []
      }
    }
  }

  /**
   * Optimize database indexes
   */
  async optimizeIndexes(): Promise<{ optimized: number; recommendations: string[] }> {
    try {
      const unusedIndexes = await this.executeQuery(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes 
        WHERE idx_scan = 0
        ORDER BY pg_relation_size(indexrelid) DESC
      `)

      const duplicateIndexes = await this.executeQuery(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          pg_size_pretty(pg_relation_size(indexrelid)) as size
        FROM pg_stat_user_indexes 
        WHERE indexname LIKE '%_pkey'
        AND pg_relation_size(indexrelid) > 100000000
      `)

      const recommendations: string[] = []
      
      if (unusedIndexes.length > 0) {
        recommendations.push(`Found ${unusedIndexes.length} unused indexes that could be dropped`)
      }

      if (duplicateIndexes.length > 0) {
        recommendations.push(`Found ${duplicateIndexes.length} large primary key indexes that could be optimized`)
      }

      return {
        optimized: unusedIndexes.length + duplicateIndexes.length,
        recommendations
      }
    } catch (error) {
      console.error('Failed to optimize indexes:', error)
      return { optimized: 0, recommendations: [] }
    }
  }

  /**
   * Analyze table statistics for better query planning
   */
  async analyzeTables(): Promise<void> {
    try {
      const tables = await this.executeQuery(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
      `)

      for (const table of tables) {
        await this.executeQuery(`ANALYZE ${(table as any).tablename}`)
      }

      console.log(`Analyzed ${tables.length} tables`)
    } catch (error) {
      console.error('Failed to analyze tables:', error)
    }
  }

  /**
   * Clean up old data and optimize storage
   */
  async cleanupOldData(): Promise<{ cleaned: number; spaceFreed: string }> {
    try {
      // Clean up old audit logs (older than 90 days)
      const auditLogsResult = await this.executeQuery(`
        DELETE FROM activity_log 
        WHERE created_at < NOW() - INTERVAL '90 days'
        RETURNING id
      `)

      // Clean up old notifications (older than 30 days)
      const notificationsResult = await this.executeQuery(`
        DELETE FROM notifications 
        WHERE created_at < NOW() - INTERVAL '30 days'
        AND is_read = true
        RETURNING id
      `)

      // Vacuum and analyze
      await this.executeQuery('VACUUM ANALYZE')

      const totalCleaned = auditLogsResult.length + notificationsResult.length
      
      return {
        cleaned: totalCleaned,
        spaceFreed: 'Estimated space freed after VACUUM'
      }
    } catch (error) {
      console.error('Failed to cleanup old data:', error)
      return { cleaned: 0, spaceFreed: '0 bytes' }
    }
  }

  /**
   * Get query execution plan
   */
  async explainQuery(query: string, params?: any[]): Promise<any> {
    try {
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`
      const result = await this.executeQuery(explainQuery, params, false)
      return result[0]
    } catch (error) {
      console.error('Failed to explain query:', error)
      return null
    }
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.queryCache.size,
      hitRate: 0 // Would need to track hits/misses for accurate rate
    }
  }
}

export const databaseOptimizer = new DatabaseOptimizer()

