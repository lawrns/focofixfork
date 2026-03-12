#!/usr/bin/env node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://127.0.0.1:4000'

function usage() {
  console.error(`Usage:
  node scripts/openclaw-foco-tool.mjs manifest --workspace <uuid> --user <uuid> [--base-url <url>] [--use-case <use_case>] [--agent <id>]
  node scripts/openclaw-foco-tool.mjs exec <tool_name> '<json-args>' --workspace <uuid> --user <uuid> [--base-url <url>] [--use-case <use_case>] [--agent <id>] [--correlation <id>]
`)
}

function parseFlags(argv) {
  const flags = {
    workspace: null,
    user: null,
    baseUrl: DEFAULT_BASE_URL,
    useCase: 'command_surface_execute',
    agent: null,
    correlation: null,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    const next = argv[index + 1]
    if (token === '--workspace') {
      flags.workspace = next ?? null
      index += 1
    } else if (token === '--user') {
      flags.user = next ?? null
      index += 1
    } else if (token === '--base-url') {
      flags.baseUrl = next ?? flags.baseUrl
      index += 1
    } else if (token === '--use-case') {
      flags.useCase = next ?? flags.useCase
      index += 1
    } else if (token === '--agent') {
      flags.agent = next ?? null
      index += 1
    } else if (token === '--correlation') {
      flags.correlation = next ?? null
      index += 1
    }
  }

  return flags
}

function normalizeBaseUrl(url) {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

function readOpenClawConfig() {
  try {
    const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json')
    return JSON.parse(fs.readFileSync(configPath, 'utf8'))
  } catch {
    return {}
  }
}

function resolveToken() {
  const config = readOpenClawConfig()
  return (
    process.env.OPENCLAW_SERVICE_TOKEN ||
    process.env.FOCO_OPENCLAW_TOKEN ||
    process.env.OPENCLAW_GATEWAY_TOKEN ||
    config?.gateway?.auth?.token ||
    config?.hooks?.token ||
    ''
  )
}

async function requestJson(url, body) {
  const token = resolveToken()
  if (!token) {
    throw new Error('No OpenClaw service token found in env or ~/.openclaw/openclaw.json')
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }

  if (!response.ok) {
    const message = data?.error?.message || data?.error || data?.message || text || `HTTP ${response.status}`
    throw new Error(message)
  }

  return data
}

async function main() {
  const [command, maybeToolName, maybeJsonArgs, ...rest] = process.argv.slice(2)
  if (!command || (command !== 'manifest' && command !== 'exec')) {
    usage()
    process.exit(1)
  }

  const flags = parseFlags(command === 'manifest' ? [maybeToolName, maybeJsonArgs, ...rest].filter(Boolean) : rest)
  if (!flags.workspace || !flags.user) {
    usage()
    process.exit(1)
  }

  const baseUrl = normalizeBaseUrl(flags.baseUrl)

  if (command === 'manifest') {
    const data = await requestJson(`${baseUrl}/api/openclaw/tools/manifest`, {
      workspace_id: flags.workspace,
      actor_user_id: flags.user,
      use_case: flags.useCase,
      agent_id: flags.agent,
    })
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`)
    return
  }

  if (!maybeToolName) {
    usage()
    process.exit(1)
  }

  let parsedArgs = {}
  try {
    parsedArgs = maybeJsonArgs ? JSON.parse(maybeJsonArgs) : {}
  } catch (error) {
    throw new Error(`Invalid JSON args: ${error instanceof Error ? error.message : String(error)}`)
  }

  const data = await requestJson(`${baseUrl}/api/openclaw/tools/execute`, {
    workspace_id: flags.workspace,
    actor_user_id: flags.user,
    use_case: flags.useCase,
    agent_id: flags.agent,
    correlation_id: flags.correlation,
    tool: maybeToolName,
    args: parsedArgs,
  })

  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
