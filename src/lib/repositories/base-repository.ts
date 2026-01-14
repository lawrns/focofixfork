/**
 * Base Repository Pattern
 * Provides type-safe database access with explicit cardinality handling
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Result type for repository operations
 * Enforces explicit error handling
 */
export type Result<T, E = RepositoryError> = 
  | { ok: true; data: T; meta?: QueryMeta }
  | { ok: false; error: E }

export interface RepositoryError {
  code: string
  message: string
  details?: unknown
}

export interface QueryMeta {
  count?: number
  duration?: number
}

export interface QueryOptions {
  limit?: number
  offset?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Helper functions for Result type
 */
export function Ok<T>(data: T, meta?: QueryMeta): Result<T> {
  return { ok: true, data, meta }
}

export function Err<E = RepositoryError>(error: E): Result<never, E> {
  return { ok: false, error }
}

/**
 * Type guard to check if result is an error
 * Helps TypeScript narrow the union type properly
 */
export function isError<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok
}

/**
 * Type guard to check if result is success
 */
export function isSuccess<T, E>(result: Result<T, E>): result is { ok: true; data: T; meta?: QueryMeta } {
  return result.ok
}

/**
 * Get error from result if it's an error, undefined otherwise
 */
export function getError<T, E>(result: Result<T, E>): E | undefined {
  if (isError(result)) return result.error
  return undefined
}

/**
 * Get data from result if it's success, undefined otherwise
 */
export function getData<T, E>(result: Result<T, E>): T | undefined {
  if (isSuccess(result)) return result.data
  return undefined
}

/**
 * Base repository class with common CRUD operations
 * Enforces:
 * - Explicit cardinality (.maybeSingle() for single records)
 * - Type-safe query results
 * - Consistent error handling
 */
export abstract class BaseRepository<T> {
  protected abstract table: string
  protected supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Find a single record by ID
   * Returns error if not found (NOT null)
   */
  async findById(id: string): Promise<Result<T>> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('id', id)
      .maybeSingle() // ✓ Correct cardinality handling

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: `Failed to fetch ${this.table} by id`,
        details: error,
      })
    }

    if (!data) {
      return Err({
        code: 'NOT_FOUND',
        message: `${this.table} with id ${id} not found`,
        details: { id },
      })
    }

    return Ok(data as T)
  }

  /**
   * Find multiple records with filters
   * Always returns array (empty if no results)
   */
  async findMany(
    filters?: Record<string, any>,
    options?: QueryOptions
  ): Promise<Result<T[]>> {
    let query = this.supabase
      .from(this.table)
      .select('*', { count: 'exact' })

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value)
        }
      })
    }

    // Apply pagination
    if (options?.limit !== undefined) {
      const offset = options.offset ?? 0
      query = query.range(offset, offset + options.limit - 1)
    }

    // Apply sorting
    if (options?.sortBy) {
      query = query.order(options.sortBy, {
        ascending: options.sortOrder === 'asc',
      })
    }

    const { data, error, count } = await query

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: `Failed to fetch ${this.table} records`,
        details: error,
      })
    }

    return Ok(data as T[], { count: count ?? undefined })
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<Result<T>> {
    const { data: created, error } = await this.supabase
      .from(this.table)
      .insert(data)
      .select()
      .single()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: `Failed to create ${this.table} record`,
        details: error,
      })
    }

    return Ok(created as T)
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: Partial<T>): Promise<Result<T>> {
    const { data: updated, error } = await this.supabase
      .from(this.table)
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      // Check if record not found
      if (error.code === 'PGRST116') {
        return Err({
          code: 'NOT_FOUND',
          message: `${this.table} with id ${id} not found`,
          details: { id },
        })
      }

      return Err({
        code: 'DATABASE_ERROR',
        message: `Failed to update ${this.table} record`,
        details: error,
      })
    }

    return Ok(updated as T)
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<Result<void>> {
    const { error } = await this.supabase
      .from(this.table)
      .delete()
      .eq('id', id)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: `Failed to delete ${this.table} record`,
        details: error,
      })
    }

    return Ok(undefined)
  }

  /**
   * Check if a record exists
   */
  async exists(id: string): Promise<Result<boolean>> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: `Failed to check existence in ${this.table}`,
        details: error,
      })
    }

    return Ok(!!data)
  }

  /**
   * Count records matching filters
   */
  async count(filters?: Record<string, any>): Promise<Result<number>> {
    let query = this.supabase
      .from(this.table)
      .select('*', { count: 'exact', head: true })

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value)
        }
      })
    }

    const { count, error } = await query

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: `Failed to count ${this.table} records`,
        details: error,
      })
    }

    return Ok(count ?? 0)
  }
}
