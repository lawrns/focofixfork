#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'

const PORT = 4000
const HOST = process.env.HOST || '0.0.0.0'
const RESTART_DELAY_MS = 1500

let child = null
let shuttingDown = false

function killPortOwner() {
  const result = spawnSync('bash', ['-lc', `fuser -k ${PORT}/tcp || true`], {
    stdio: 'inherit',
  })

  if (result.error) {
    console.warn(`[dev-guard] failed to clear port ${PORT}: ${result.error.message}`)
  }
}

function startChild() {
  if (shuttingDown) return

  killPortOwner()
  console.log(`[dev-guard] starting Next.js on http://${HOST}:${PORT}`)

  child = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['next', 'dev', '--hostname', HOST, '--port', String(PORT)],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: String(PORT),
        HOST,
      },
    },
  )

  child.on('exit', (code, signal) => {
    if (shuttingDown) return
    console.error(
      `[dev-guard] next dev exited${signal ? ` with signal ${signal}` : ` with code ${code ?? 'unknown'}`}; restarting in ${RESTART_DELAY_MS}ms`,
    )
    setTimeout(startChild, RESTART_DELAY_MS)
  })
}

function shutdown(signal) {
  shuttingDown = true
  console.log(`[dev-guard] received ${signal}, shutting down`)
  if (child && !child.killed) {
    child.kill(signal)
  }
  process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('exit', () => {
  shuttingDown = true
  if (child && !child.killed) {
    child.kill('SIGTERM')
  }
})

startChild()
