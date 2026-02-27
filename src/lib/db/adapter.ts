/**
 * DB Adapter — returns either a SqliteAdapter or SupabaseAdapter
 * based on the FOCO_DB environment variable (default: supabase for cloud,
 * sqlite when running locally via `foco start`).
 */

export type QueryResult<T = Record<string, unknown>> = {
  data: T[] | null
  error: { message: string } | null
}

export type SingleResult<T = Record<string, unknown>> = {
  data: T | null
  error: { message: string } | null
}

export interface DbAdapter {
  /** Run a raw query that returns multiple rows */
  query<T = Record<string, unknown>>(
    table: string,
    opts?: {
      select?: string
      filters?: Array<{ col: string; op: string; val: unknown }>
      order?: { col: string; ascending?: boolean }
      limit?: number
    }
  ): Promise<QueryResult<T>>

  /** Get a single row by id */
  getById<T = Record<string, unknown>>(table: string, id: string): Promise<SingleResult<T>>

  /** Insert a row and return it */
  insert<T = Record<string, unknown>>(table: string, row: Record<string, unknown>): Promise<SingleResult<T>>

  /** Update rows matching filters and return updated rows */
  update<T = Record<string, unknown>>(
    table: string,
    patch: Record<string, unknown>,
    filters: Array<{ col: string; val: unknown }>
  ): Promise<QueryResult<T>>

  /** Delete rows matching filters */
  delete(
    table: string,
    filters: Array<{ col: string; val: unknown }>
  ): Promise<{ error: { message: string } | null }>
}

let _adapter: DbAdapter | null = null

export async function getDb(): Promise<DbAdapter> {
  if (_adapter) return _adapter

  const mode = process.env.FOCO_DB ?? 'supabase'

  if (mode === 'sqlite') {
    const { SqliteAdapter } = await import('./sqlite-adapter')
    _adapter = new SqliteAdapter(process.env.FOCO_SQLITE_PATH)
  } else {
    const { SupabaseAdapter } = await import('./supabase-adapter')
    _adapter = new SupabaseAdapter()
  }

  return _adapter
}
