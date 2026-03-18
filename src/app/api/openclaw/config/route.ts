import { NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function resolveConfigPath(): string {
  const root = process.env.OPENCLAW_CONFIG_PATH
  if (root?.trim()) return path.join(root.trim(), 'openclaw.json')
  return path.join(process.env.HOME ?? '/tmp', '.openclaw', 'openclaw.json')
}

export async function PATCH(req: Request) {
  try {
    const { model } = await req.json()
    if (!model || typeof model !== 'string') {
      return NextResponse.json({ error: 'model is required' }, { status: 400 })
    }

    const configPath = resolveConfigPath()
    let config: Record<string, unknown> = {}
    try {
      const raw = await fs.readFile(configPath, 'utf8')
      config = JSON.parse(raw)
    } catch {
      // start with empty config if file doesn't exist
    }

    // agents.defaults.model is a top-level string in the real config
    if (!config.agents || typeof config.agents !== 'object') config.agents = {}
    const agents = config.agents as Record<string, unknown>
    if (!agents.defaults || typeof agents.defaults !== 'object') agents.defaults = {}
    const defaults = agents.defaults as Record<string, unknown>
    defaults.model = model

    // atomic write via temp file
    const tmpPath = configPath + '.tmp'
    await fs.writeFile(tmpPath, JSON.stringify(config, null, 2), 'utf8')
    await fs.rename(tmpPath, configPath)

    return NextResponse.json({ ok: true, model })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
