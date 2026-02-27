#!/usr/bin/env node
// foco CLI — local-first cockpit entry point
// Usage: foco <command> [options]
//   foco init                  Interactive setup wizard
//   foco start [--port 3011]   Start the Next.js UI + local worker
//   foco connect openclaw       Validate relay health, list attached tabs
//   foco seed                  Seed ledger from ~/.claude/projects/ sessions
//   foco doctor                System diagnostics

// Node version check
const [major] = process.versions.node.split('.').map(Number)
if (major < 18) {
  console.error('  ✗ foco requires Node.js 18 or later (current: ' + process.versions.node + ')')
  console.error('  → https://nodejs.org/en/download')
  process.exit(1)
}

import { createRequire } from 'module'
import { execSync, spawn } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PKG_ROOT = resolve(__dirname, '..')
const FOCO_DIR = join(homedir(), '.foco')
const CONFIG_PATH = join(FOCO_DIR, 'config.json')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readConfig() {
  if (!existsSync(CONFIG_PATH)) return {}
  try { return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) } catch { return {} }
}

function writeConfig(cfg) {
  if (!existsSync(FOCO_DIR)) mkdirSync(FOCO_DIR, { recursive: true })
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2))
}

function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve))
}

function color(code, text) {
  return `\x1b[${code}m${text}\x1b[0m`
}

const green = t => color('32', t)
const cyan  = t => color('36', t)
const red   = t => color('31', t)
const dim   = t => color('2',  t)

// ─── Checks ───────────────────────────────────────────────────────────────────

function checkSqliteSupport() {
  const { platform, arch } = process
  const supported = [
    ['linux', 'x64'], ['linux', 'arm64'],
    ['darwin', 'x64'], ['darwin', 'arm64'],
    ['win32', 'x64'],
  ]
  const ok = supported.some(([p, a]) => p === platform && a === arch)
  if (!ok) {
    console.warn(`  ⚠ better-sqlite3 may not have a prebuilt binary for ${platform}/${arch}`)
    console.warn('  → Run: npm rebuild better-sqlite3')
    console.warn('  → Or set FOCO_DB=supabase to skip SQLite')
  }
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function cmdInit() {
  const cfg = readConfig()
  const focoDb = process.env.FOCO_DB
  if (!focoDb || focoDb === 'sqlite') checkSqliteSupport()
  const rl = createInterface({ input: process.stdin, output: process.stdout })

  console.log('\n' + cyan('  foco init — local-first workspace setup') + '\n')

  const name = (await prompt(rl, `  Workspace name [${cfg.workspaceName ?? 'My Workspace'}]: `)).trim()
    || cfg.workspaceName || 'My Workspace'

  const dbPath = (await prompt(rl, `  SQLite path [${cfg.dbPath ?? join(FOCO_DIR, 'foco.db')}]: `)).trim()
    || cfg.dbPath || join(FOCO_DIR, 'foco.db')

  const port = (await prompt(rl, `  UI port [${cfg.port ?? 3011}]: `)).trim()
    || String(cfg.port ?? 3011)

  const token = (await prompt(rl, `  OpenClaw token [${cfg.openclawToken ? '***set***' : 'none'}]: `)).trim()
    || cfg.openclawToken || ''

  const relay = (await prompt(rl, `  OpenClaw relay URL [${cfg.relayUrl ?? 'http://127.0.0.1:18792'}]: `)).trim()
    || cfg.relayUrl || 'http://127.0.0.1:18792'

  rl.close()

  writeConfig({ workspaceName: name, dbPath, port: parseInt(port), openclawToken: token, relayUrl: relay })

  console.log('\n' + green('  ✓ Configuration saved to ' + CONFIG_PATH))
  console.log(dim('  Run `foco start` to launch the UI.\n'))
}

async function cmdStart(argv) {
  const cfg = readConfig()
  const focoDb = process.env.FOCO_DB
  if (!focoDb || focoDb === 'sqlite') checkSqliteSupport()
  const port = argv.includes('--port')
    ? argv[argv.indexOf('--port') + 1]
    : String(cfg.port ?? 3011)

  console.log(cyan(`\n  foco start — launching on http://localhost:${port}\n`))

  const env = {
    ...process.env,
    FOCO_DB: process.env.FOCO_DB ?? 'sqlite',
    FOCO_SQLITE_PATH: cfg.dbPath ?? join(FOCO_DIR, 'foco.db'),
    FOCO_OPENCLAW_RELAY: cfg.relayUrl ?? 'http://127.0.0.1:18792',
    FOCO_OPENCLAW_TOKEN: cfg.openclawToken ?? '',
    PORT: port,
  }

  const nextBin = resolve(PKG_ROOT, 'node_modules', '.bin', 'next')
  const bin = existsSync(nextBin) ? nextBin : 'next'

  const child = spawn(bin, ['start', '--port', port], {
    cwd: PKG_ROOT,
    env,
    stdio: 'inherit',
  })

  child.on('error', err => {
    console.error(red('  Failed to start: ' + err.message))
    process.exit(1)
  })

  child.on('exit', code => process.exit(code ?? 0))
}

async function cmdConnect(argv) {
  const cfg = readConfig()
  const relay = process.env.FOCO_OPENCLAW_RELAY ?? cfg.relayUrl ?? 'http://127.0.0.1:18792'
  const token = process.env.FOCO_OPENCLAW_TOKEN ?? cfg.openclawToken ?? ''

  console.log(cyan('\n  foco connect openclaw\n'))
  console.log(`  Relay: ${relay}`)
  console.log(`  Token: ${token ? '***set***' : red('NOT SET')}`)

  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const res = await fetch(`${relay}/health`, { headers, signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const body = await res.json().catch(() => ({}))
      console.log(green('\n  ✓ Relay reachable'))
      const tabs = body.tabs ?? []
      if (tabs.length > 0) {
        console.log(`\n  Attached tabs (${tabs.length}):`)
        tabs.forEach((t, i) => console.log(`    ${i + 1}. ${t.title ?? t.url ?? t.id}`))
      } else {
        console.log(dim('\n  No tabs attached'))
      }
    } else {
      console.log(red(`\n  ✗ Relay responded ${res.status}`))
    }
  } catch (err) {
    console.log(red(`\n  ✗ Relay unreachable: ${err.message}`))
  }

  console.log()
}

async function cmdSeed() {
  const seedScript = resolve(PKG_ROOT, 'scripts', 'seed-claude-sessions.mjs')
  if (!existsSync(seedScript)) {
    console.error(red('  Seed script not found: ' + seedScript))
    process.exit(1)
  }
  const cfg = readConfig()
  const env = {
    ...process.env,
    FOCO_DB: process.env.FOCO_DB ?? 'sqlite',
    FOCO_SQLITE_PATH: cfg.dbPath ?? join(FOCO_DIR, 'foco.db'),
  }
  const child = spawn(process.execPath, ['--input-type=module', seedScript], {
    cwd: PKG_ROOT,
    env,
    stdio: 'inherit',
  })
  child.on('exit', code => process.exit(code ?? 0))
}

async function cmdDoctor() {
  const cfg = readConfig()
  console.log('\n' + cyan('  foco doctor — system diagnostics') + '\n')

  const checks = []

  // 1. Node version ≥18
  const nodeMajor = Number(process.versions.node.split('.')[0])
  if (nodeMajor >= 18) {
    checks.push({ ok: true, msg: `Node v${process.versions.node} (≥18)` })
  } else {
    checks.push({ ok: false, msg: `Node v${process.versions.node} is below 18 — upgrade at https://nodejs.org/en/download` })
  }

  // 2. better-sqlite3 importable
  try {
    const req = createRequire(import.meta.url)
    req('better-sqlite3')
    checks.push({ ok: true, msg: 'better-sqlite3 importable' })
  } catch {
    checks.push({ ok: false, msg: 'better-sqlite3 not importable  → run: npm rebuild better-sqlite3' })
  }

  // 3. SQLite db file exists
  const dbPath = cfg.dbPath ?? join(FOCO_DIR, 'foco.db')
  if (existsSync(dbPath)) {
    checks.push({ ok: true, msg: `SQLite db found at ${dbPath}` })
  } else {
    checks.push({ ok: false, msg: `SQLite db not found at ${dbPath}  → run: foco init` })
  }

  // 4. OpenClaw relay reachable
  const relayUrl = cfg.relayUrl ?? 'http://127.0.0.1:18792'
  try {
    const res = await fetch(`${relayUrl}/health`, { signal: AbortSignal.timeout(2000) })
    if (res.ok) {
      checks.push({ ok: true, msg: `OpenClaw relay reachable at ${relayUrl}` })
    } else {
      checks.push({ ok: false, msg: `OpenClaw relay responded ${res.status} at ${relayUrl}  → start OpenClaw gateway` })
    }
  } catch {
    checks.push({ ok: false, msg: `OpenClaw relay unreachable at ${relayUrl}  → start OpenClaw gateway` })
  }

  // 5. OpenClaw token configured
  const hasToken = !!(cfg.openclawToken)
  checks.push({ ok: hasToken, msg: hasToken ? 'OpenClaw token configured' : 'OpenClaw token not set  → run: foco init' })

  // 6. Next.js binary
  const nextBin = resolve(PKG_ROOT, 'node_modules', '.bin', 'next')
  if (existsSync(nextBin)) {
    checks.push({ ok: true, msg: 'Next.js binary found' })
  } else {
    checks.push({ ok: false, msg: `Next.js binary not found at ${nextBin}  → run: npm install` })
  }

  // 7. Config file exists
  if (existsSync(CONFIG_PATH)) {
    checks.push({ ok: true, msg: 'Config file found' })
  } else {
    checks.push({ ok: false, msg: `Config file not found at ${CONFIG_PATH}  → run: foco init` })
  }

  for (const c of checks) {
    if (c.ok) {
      console.log('  ' + green('✓') + ' ' + c.msg)
    } else {
      console.log('  ' + red('✗') + ' ' + c.msg)
    }
  }

  const failures = checks.filter(c => !c.ok).length
  if (failures === 0) {
    console.log('\n  ' + green('All checks passed') + '\n')
  } else {
    console.log(`\n  ${red(failures + ' critical issue' + (failures === 1 ? '' : 's'))} — run \`foco init\` to fix\n`)
  }
}

// ─── Entry ────────────────────────────────────────────────────────────────────

const [,, cmd, ...rest] = process.argv

switch (cmd) {
  case 'init':    await cmdInit(); break
  case 'start':   await cmdStart(rest); break
  case 'connect': await cmdConnect(rest); break
  case 'seed':    await cmdSeed(); break
  case 'doctor':  await cmdDoctor(); break
  default:
    console.log(`
${cyan('foco')} — local-first OpenClaw + Bosun cockpit

Usage:
  foco init                   Interactive setup wizard
  foco start [--port <n>]     Start the UI (default: 3011)
  foco connect openclaw        Check relay health + list tabs
  foco seed                   Seed history from ~/.claude/projects/
  foco doctor                 System diagnostics

Config file: ${CONFIG_PATH}
`)
}
