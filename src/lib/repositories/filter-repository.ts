/**
 * Filter Repository
 * Type-safe database access for foco_saved_filters table
 */

import { BaseRepository, Result, Ok, Err } from './base-repository'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface SavedFilter {
  id: string
  workspace_id: string
  name: string
  filters: Record<string, any>
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateFilterData {
  workspace_id: string
  name: string
  filters?: Record<string, any>
  created_by: string
}

export interface UpdateFilterData {
  name?: string
  filters?: Record<string, any>
}

export class FilterRepository extends BaseRepository<SavedFilter> {
  protected table = 'foco_saved_filters'

  constructor(supabase: SupabaseClient) {
    super(supabase)
  }

  /**
   * Find all filters in a workspace for a user
   */
  async findByWorkspaceAndUser(
    workspaceId: string,
    userId: string,
    options?: {
      limit?: number
      offset?: number
    }
  ): Promise<Result<SavedFilter[]>> {
    let query = this.supabase
      .from(this.table)
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .eq('created_by', userId)

    // Apply pagination
    if (options?.limit !== undefined) {
      const offset = options.offset ?? 0
      query = query.range(offset, offset + options.limit - 1)
    }

    // Sort by updated_at descending
    query = query.order('updated_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch saved filters',
        details: error,
      })
    }

    return Ok(data as SavedFilter[], { count: count ?? undefined })
  }

  /**
   * Create a new saved filter
   */
  async createFilter(data: CreateFilterData): Promise<Result<SavedFilter>> {
    const filterData = {
      ...data,
      filters: data.filters ?? {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return this.create(filterData)
  }

  /**
   * Update a saved filter
   */
  async updateFilter(id: string, data: UpdateFilterData): Promise<Result<SavedFilter>> {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    }

    return this.update(id, updateData)
  }

  /**
   * Check if user owns the filter
   */
  async checkOwnership(filterId: string, userId: string): Promise<Result<boolean>> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('created_by')
      .eq('id', filterId)
      .maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to check filter ownership',
        details: error,
      })
    }

    if (!data) {
      return Err({
        code: 'NOT_FOUND',
        message: `Filter with id ${filterId} not found`,
        details: { filterId },
      })
    }

    return Ok(data.created_by === userId)
  }
}
