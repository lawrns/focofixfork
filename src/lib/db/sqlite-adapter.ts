/**
 * SQLite adapter — wraps better-sqlite3 with the same DbAdapter interface.
 * Used when FOCO_DB=sqlite (local `foco start` mode).
 */

import { join } from 'path'
import { homedir } from 'os'
import type { DbAdapter, QueryResult, SingleResult } from './adapter'

const DEFAULT_PATH = join(homedir(), '.foco', 'foco.db')

// Op map from abstract filter ops to SQLite SQL
const OP_MAP: Record<string, string> = {
  eq: '=',
  neq: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  like: 'LIKE',
  ilike: 'LIKE',
}

type BetterSqlite3Database = {
  prepare: (sql: string) => { all: (...args: unknown[]) => unknown[]; get: (...args: unknown[]) => unknown; run: (...args: unknown[]) => { changes: number } }
  exec: (sql: string) => void
}

export class SqliteAdapter implements DbAdapter {
  private dbPath: string
  private _db: BetterSqlite3Database | null = null

  constructor(dbPath?: string) {
    this.dbPath = dbPath ?? DEFAULT_PATH
  }

  private get db(): BetterSqlite3Database {
    if (this._db) return this._db
    // Dynamic require — better-sqlite3 is optional and only needed in SQLite mode
    // eslint-disable-next-line
    const Database = require('better-sqlite3')
    this._db = new Database(this.dbPath) as BetterSqlite3Database
    this.ensureSchema()
    return this._db!
  }

  private ensureSchema() {
    const { readFileSync, existsSync } = require('fs')
    const { resolve } = require('path')
    // Look for schema relative to this file (compiled to .next/) or src/
    const candidates = [
      resolve(__dirname, 'sqlite-schema.sql'),
      resolve(__dirname, '..', '..', '..', 'src', 'lib', 'db', 'sqlite-schema.sql'),
    ]
    for (const p of candidates) {
      if (existsSync(p)) {
        this.db.exec(readFileSync(p, 'utf8'))
        return
      }
    }
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
    try {
      const cols = opts.select ?? '*'
      const conditions: string[] = []
      const values: unknown[] = []

      for (const f of opts.filters ?? []) {
        const sqlOp = OP_MAP[f.op] ?? '='
        conditions.push(`"${f.col}" ${sqlOp} ?`)
        values.push(f.val)
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
      const orderClause = opts.order
        ? `ORDER BY "${opts.order.col}" ${opts.order.ascending === false ? 'DESC' : 'ASC'}`
        : ''
      const limitClause = opts.limit ? `LIMIT ${opts.limit}` : ''

      const sql = `SELECT ${cols} FROM "${table}" ${where} ${orderClause} ${limitClause}`.trim()
      const rows = this.db.prepare(sql).all(...values) as T[]
      return { data: rows, error: null }
    } catch (err) {
      return { data: null, error: { message: String(err) } }
    }
  }

  async getById<T = Record<string, unknown>>(table: string, id: string): Promise<SingleResult<T>> {
    try {
      const row = this.db.prepare(`SELECT * FROM "${table}" WHERE id = ?`).get(id) as T | undefined
      if (!row) return { data: null, error: { message: 'Not found' } }
      return { data: row, error: null }
    } catch (err) {
      return { data: null, error: { message: String(err) } }
    }
  }

  async insert<T = Record<string, unknown>>(
    table: string,
    row: Record<string, unknown>
  ): Promise<SingleResult<T>> {
    try {
      const cols = Object.keys(row)
      const placeholders = cols.map(() => '?').join(', ')
      const sql = `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders}) RETURNING *`
      const inserted = this.db.prepare(sql).get(...Object.values(row)) as T
      return { data: inserted, error: null }
    } catch (err) {
      return { data: null, error: { message: String(err) } }
    }
  }

  async update<T = Record<string, unknown>>(
    table: string,
    patch: Record<string, unknown>,
    filters: Array<{ col: string; val: unknown }>
  ): Promise<QueryResult<T>> {
    try {
      const setClauses = Object.keys(patch).map(c => `"${c}" = ?`).join(', ')
      const whereClauses = filters.map(f => `"${f.col}" = ?`).join(' AND ')
      const sql = `UPDATE "${table}" SET ${setClauses} WHERE ${whereClauses} RETURNING *`
      const values = [...Object.values(patch), ...filters.map(f => f.val)]
      const rows = this.db.prepare(sql).all(...values) as T[]
      return { data: rows, error: null }
    } catch (err) {
      return { data: null, error: { message: String(err) } }
    }
  }

  async delete(
    table: string,
    filters: Array<{ col: string; val: unknown }>
  ): Promise<{ error: { message: string } | null }> {
    try {
      const whereClauses = filters.map(f => `"${f.col}" = ?`).join(' AND ')
      const sql = `DELETE FROM "${table}" WHERE ${whereClauses}`
      this.db.prepare(sql).run(...filters.map(f => f.val))
      return { error: null }
    } catch (err) {
      return { error: { message: String(err) } }
    }
  }
}
