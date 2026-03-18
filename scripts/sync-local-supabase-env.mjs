#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function parseEnvBlock(text) {
  const entries = {}

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('Stopped services:')) continue

    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match) continue

    const [, key, rawValue] = match
    const value = rawValue.replace(/^"/, '').replace(/"$/, '')
    entries[key] = value
  }

  return entries
}

function main() {
  const output = execFileSync('supabase', ['status', '-o', 'env'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const env = parseEnvBlock(output)
  const target = resolve(process.cwd(), '.env.local.supabase-local')

  const lines = [
    '# Generated from `supabase status -o env`.',
    '# Load or merge these values when you want focofixfork to use the local Supabase stack.',
    'NEXT_PUBLIC_SUPABASE_URL=' + (env.API_URL ?? 'http://127.0.0.1:54321'),
    'NEXT_PUBLIC_SUPABASE_ANON_KEY=' + (env.ANON_KEY ?? ''),
    'SUPABASE_URL=' + (env.API_URL ?? 'http://127.0.0.1:54321'),
    'SUPABASE_SERVICE_ROLE_KEY=' + (env.SERVICE_ROLE_KEY ?? ''),
    'DATABASE_URL=' + (env.DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'),
    'NEXT_PUBLIC_APP_URL=http://127.0.0.1:4000',
    'NEXT_PUBLIC_BASE_URL=http://127.0.0.1:4000',
    '',
  ]

  writeFileSync(target, lines.join('\n'))
  process.stdout.write(`Wrote ${target}\n`)
}

main()
