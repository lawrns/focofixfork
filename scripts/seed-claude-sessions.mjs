#!/usr/bin/env node
/**
 * seed-claude-sessions.mjs
 *
 * Reads ~/.claude/projects/ JSONL session files and seeds the local database
 * with historical Claude Code sessions as runs + ledger events.
 *
 * Usage:
 *   node scripts/seed-claude-sessions.mjs
 *   FOCO_DB=sqlite FOCO_SQLITE_PATH=~/.foco/foco.db node scripts/seed-claude-sessions.mjs
 *   FOCO_DB=supabase node scripts/seed-claude-sessions.mjs  (uses Supabase env vars)
 *
 * What it creates:
 *   - One `run` per .jsonl session file
 *   - tool_use entries → ledger_events with type=claude.tool_use
 *   - file-edit entries → ledger_events with type=claude.file_edit
 *   - Session start/end → run.started_at / run.ended_at
 */

import { createReadStream, existsSync, readdirSync, statSync } from 'fs'
import { homedir } from 'os'
import { join, basename } from 'path'
import { createInterface } from 'readline'

// ─── Config ──────────────────────────────────────────────────────────────────

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects')
const DB_MODE = process.env.FOCO_DB ?? 'sqlite'
const SQLITE_PATH = (process.env.FOCO_SQLITE_PATH ?? join(homedir(), '.foco', 'foco.db'))
  .replace(/^~/, homedir())

// ─── DB helpers ──────────────────────────────────────────────────────────────

let db

function getDb() {
  if (db) return db
  if (DB_MODE === 'sqlite') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = (await import('better-sqlite3')).default
    db = new Database(SQLITE_PATH)
    return db
  }
  throw new Error('Only sqlite mode supported in seed script. Set FOCO_DB=sqlite.')
}

function dbRun(sql, params = []) {
  return getDb().prepare(sql).run(...params)
}

function dbGet(sql, params = []) {
  return getDb().prepare(sql).get(...params)
}

function uuid() {
  // Simple random UUID-like id for SQLite
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

// ─── JSONL parsing ───────────────────────────────────────────────────────────

async function parseSession(filePath) {
  const lines = []
  const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line.trim()) continue
    try {
      lines.push(JSON.parse(line))
    } catch {
      // skip malformed lines
    }
  }
  return lines
}

function extractSessionMeta(entries) {
  const timestamps = entries
    .map(e => e.timestamp ?? e.ts ?? e.created_at)
    .filter(Boolean)
    .sort()

  const toolUseEntries = entries.filter(e =>
    e.type === 'tool_use' ||
    (e.message?.content && Array.isArray(e.message.content) &&
     e.message.content.some(c => c.type === 'tool_use'))
  )

  const summary = entries
    .filter(e => e.type === 'summary' || e.type === 'assistant_summary')
    .map(e => e.summary ?? e.content ?? '')
    .join(' ')
    .trim()
    .slice(0, 500)

  return {
    startedAt: timestamps[0] ?? null,
    endedAt: timestamps[timestamps.length - 1] ?? null,
    toolUseCount: toolUseEntries.length,
    summary: summary || null,
  }
}

// ─── Seeding ─────────────────────────────────────────────────────────────────

async function seedSession(filePath, projectSlug) {
  const sessionId = basename(filePath, '.jsonl')
  const entries = await parseSession(filePath)
  if (entries.length === 0) return { skipped: true, reason: 'empty' }

  const meta = extractSessionMeta(entries)

  // Check if run already exists
  const existing = dbGet(`SELECT id FROM runs WHERE id = ?`, [sessionId])
  if (existing) return { skipped: true, reason: 'exists' }

  // Insert run
  dbRun(
    `INSERT INTO runs (id, status, summary, started_at, ended_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      'completed',
      meta.summary ?? `Session from ${projectSlug}`,
      meta.startedAt,
      meta.endedAt,
      meta.startedAt ?? new Date().toISOString(),
      meta.endedAt ?? new Date().toISOString(),
    ]
  )

  let ledgerCount = 0

  for (const entry of entries) {
    const ts = entry.timestamp ?? entry.ts ?? entry.created_at ?? new Date().toISOString()

    // Tool use entries
    if (entry.type === 'tool_use') {
      const toolName = entry.name ?? entry.tool ?? 'unknown'
      const isFileEdit = ['Edit', 'Write', 'NotebookEdit'].includes(toolName)

      const eventType = isFileEdit ? 'claude.file_edit' : 'claude.tool_use'
      const payload = {
        tool: toolName,
        run_id: sessionId,
        project: projectSlug,
        input: entry.input ?? {},
        output: entry.output ?? entry.result ?? {},
      }

      dbRun(
        `INSERT INTO ledger_events (id, type, source, context_id, payload, timestamp, workspace_id, user_id)
         VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`,
        [uuid(), eventType, 'claude-code', sessionId, JSON.stringify(payload), ts]
      )
      ledgerCount++
    }

    // Inlined tool_use blocks in assistant messages
    if (entry.message?.content && Array.isArray(entry.message.content)) {
      for (const block of entry.message.content) {
        if (block.type !== 'tool_use') continue
        const toolName = block.name ?? 'unknown'
        const isFileEdit = ['Edit', 'Write', 'NotebookEdit'].includes(toolName)
        const eventType = isFileEdit ? 'claude.file_edit' : 'claude.tool_use'

        dbRun(
          `INSERT INTO ledger_events (id, type, source, context_id, payload, timestamp, workspace_id, user_id)
           VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`,
          [
            uuid(),
            eventType,
            'claude-code',
            sessionId,
            JSON.stringify({ tool: toolName, project: projectSlug, input: block.input ?? {} }),
            ts,
          ]
        )
        ledgerCount++
      }
    }
  }

  return { skipped: false, runId: sessionId, ledgerCount }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(CLAUDE_PROJECTS_DIR)) {
    console.error(`✗ ~/.claude/projects/ not found at ${CLAUDE_PROJECTS_DIR}`)
    process.exit(1)
  }

  // Ensure schema exists
  if (DB_MODE === 'sqlite') {
    const { readFileSync, existsSync: fe } = await import('fs')
    const { resolve, dirname } = await import('path')
    const { fileURLToPath } = await import('url')
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const schemaPath = resolve(__dirname, '..', 'src', 'lib', 'db', 'sqlite-schema.sql')
    if (fe(schemaPath)) {
      getDb().exec(readFileSync(schemaPath, 'utf8'))
    }
  }

  const projectDirs = readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  console.log(`\n  Seeding from ${CLAUDE_PROJECTS_DIR}`)
  console.log(`  Found ${projectDirs.length} project director${projectDirs.length === 1 ? 'y' : 'ies'}\n`)

  let totalRuns = 0
  let totalLedger = 0
  let totalSkipped = 0

  for (const projectSlug of projectDirs) {
    const projectPath = join(CLAUDE_PROJECTS_DIR, projectSlug)
    const sessionFiles = readdirSync(projectPath)
      .filter(f => f.endsWith('.jsonl'))

    if (sessionFiles.length === 0) continue

    console.log(`  ${projectSlug} (${sessionFiles.length} session${sessionFiles.length !== 1 ? 's' : ''})`)

    for (const file of sessionFiles) {
      const filePath = join(projectPath, file)
      const stats = statSync(filePath)
      if (stats.size === 0) continue

      const result = await seedSession(filePath, projectSlug)

      if (result.skipped) {
        process.stdout.write(`    · ${file} — skipped (${result.reason})\n`)
        totalSkipped++
      } else {
        process.stdout.write(`    ✓ ${file} — run ${result.runId.slice(0, 8)}… · ${result.ledgerCount} events\n`)
        totalRuns++
        totalLedger += result.ledgerCount ?? 0
      }
    }
  }

  console.log(`\n  Done — ${totalRuns} runs · ${totalLedger} ledger events · ${totalSkipped} skipped\n`)
}

main().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
