/**
 * Supabase adapter — wraps the existing Supabase client with the DbAdapter interface.
 * Used when FOCO_DB=supabase (default for cloud / Vercel deployments).
 * No behaviour change from existing code — just wrapped in the common interface.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { DbAdapter, QueryResult, SingleResult } from './adapter'

function makeClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export class SupabaseAdapter implements DbAdapter {
  private client: SupabaseClient

  constructor() {
    this.client = makeClient()
  }

  async query<T = Record<string, unknown>>(
    table: string,
    opts: {
      select?: string
      filters?: Array<{ col: string; op: string; val: unknown }>
      order?: { col: string; ascending?: boolean }
      limit?: number
    } = {}
  ): Promise<QueryResult<T>> {
    let q = this.client.from(table).select(opts.select ?? '*')

    for (const f of opts.filters ?? []) {
      switch (f.op) {
        case 'eq':   q = q.eq(f.col, f.val as string);   break
        case 'neq':  q = q.neq(f.col, f.val as string);  break
        case 'gt':   q = q.gt(f.col, f.val as string);   break
        case 'gte':  q = q.gte(f.col, f.val as string);  break
        case 'lt':   q = q.lt(f.col, f.val as string);   break
        case 'lte':  q = q.lte(f.col, f.val as string);  break
        case 'like': q = q.like(f.col, f.val as string); break
        case 'ilike':q = q.ilike(f.col, f.val as string);break
        default:     q = q.eq(f.col, f.val as string)
      }
    }

    if (opts.order) {
      q = q.order(opts.order.col, { ascending: opts.order.ascending ?? true })
    }

    if (opts.limit) {
      q = q.limit(opts.limit)
    }

    const { data, error } = await q
    return { data: (data as T[] | null), error: error ? { message: error.message } : null }
  }

  async getById<T = Record<string, unknown>>(table: string, id: string): Promise<SingleResult<T>> {
    const { data, error } = await this.client
      .from(table)
      .select('*')
      .eq('id', id)
      .single()
    return { data: (data as T | null), error: error ? { message: error.message } : null }
  }

  async insert<T = Record<string, unknown>>(
    table: string,
    row: Record<string, unknown>
  ): Promise<SingleResult<T>> {
    const { data, error } = await this.client
      .from(table)
      .insert(row)
      .select()
      .single()
    return { data: (data as T | null), error: error ? { message: error.message } : null }
  }

  async update<T = Record<string, unknown>>(
    table: string,
    patch: Record<string, unknown>,
    filters: Array<{ col: string; val: unknown }>
  ): Promise<QueryResult<T>> {
    let q = this.client.from(table).update(patch).select()
    for (const f of filters) {
      q = q.eq(f.col, f.val as string)
    }
    const { data, error } = await q
    return { data: (data as T[] | null), error: error ? { message: error.message } : null }
  }

  async delete(
    table: string,
    filters: Array<{ col: string; val: unknown }>
  ): Promise<{ error: { message: string } | null }> {
    let q = this.client.from(table).delete()
    for (const f of filters) {
      q = q.eq(f.col, f.val as string)
    }
    const { error } = await q
    return { error: error ? { message: error.message } : null }
  }
}
