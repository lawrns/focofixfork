import fs from 'node:fs/promises'
import path from 'node:path'
import type { OpenClawConfiguredAgent, OpenClawRuntimeSnapshot } from './types'

const DEFAULT_GATEWAY_URL = 'http://127.0.0.1:18799'
const DEFAULT_RELAY_URL = 'http://127.0.0.1:18792'

type OpenClawConfigRecord = Record<string, unknown>

function homeDir(): string {
  return process.env.HOME ?? '/tmp'
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function resolveConfigPath(): string {
  const root = process.env.OPENCLAW_CONFIG_PATH
  if (root?.trim()) return path.join(root.trim(), 'openclaw.json')
  return path.join(homeDir(), '.openclaw', 'openclaw.json')
}

async function readConfig(): Promise<OpenClawConfigRecord> {
  try {
    const raw = await fs.readFile(resolveConfigPath(), 'utf8')
    return asRecord(JSON.parse(raw))
  } catch {
    return {}
  }
}

function extractGatewayToken(config: OpenClawConfigRecord): string | null {
  const gateway = asRecord(config.gateway)
  const auth = asRecord(gateway.auth)
  return readString(auth.token)
}

function extractHookToken(config: OpenClawConfigRecord): string | null {
  const hooks = asRecord(config.hooks)
  return readString(hooks.token)
}

function extractPrimaryModel(config: OpenClawConfigRecord): { model: string | null; alias: string | null } {
  const agents = asRecord(config.agents)
  const defaults = asRecord(agents.defaults)
  const rawModel = defaults.model
  const model = asRecord(rawModel)
  const models = asRecord(defaults.models)
  const primary = readString(rawModel) ?? readString(model.primary)
  const modelEntry = primary ? asRecord(models[primary]) : {}

  return {
    model: primary,
    alias: readString(modelEntry.alias),
  }
}

function extractConfiguredModels(config: OpenClawConfigRecord): string[] {
  const agents = asRecord(config.agents)
  const defaults = asRecord(agents.defaults)
  const models = asRecord(defaults.models)
  return Object.keys(models).filter((key) => key.trim().length > 0)
}

function extractAcpSettings(config: OpenClawConfigRecord): {
  enabled: boolean
  dispatchEnabled: boolean
  backend: string | null
} {
  const acp = asRecord(config.acp)
  const dispatch = asRecord(acp.dispatch)
  const enabled = acp.enabled === true
  const dispatchEnabled = dispatch.enabled === false ? false : true
  return {
    enabled,
    dispatchEnabled,
    backend: readString(acp.backend),
  }
}

function extractConfiguredAgents(config: OpenClawConfigRecord): OpenClawConfiguredAgent[] {
  const agents = asRecord(config.agents)
  const list = Array.isArray(agents.list)
    ? agents.list.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    : []

  return list
    .map((entry) => {
      const id = readString(entry.id)
      if (!id) return null
      const runtime = asRecord(entry.runtime)
      const acp = asRecord(runtime.acp)
      return {
        id,
        default: entry.default === true,
        runtimeType: readString(runtime.type) === 'acp' ? 'acp' : 'embedded',
        acpAgent: readString(acp.agent),
        acpBackend: readString(acp.backend),
        acpMode: readString(acp.mode),
        cwd: readString(acp.cwd),
      } satisfies OpenClawConfiguredAgent
    })
    .filter((entry): entry is OpenClawConfiguredAgent => Boolean(entry))
}

export async function getOpenClawServerConfig() {
  const config = await readConfig()
  const { model, alias } = extractPrimaryModel(config)
  const configuredModels = extractConfiguredModels(config)
  const acp = extractAcpSettings(config)
  const configuredAgents = extractConfiguredAgents(config)
  const gatewayTokenFromConfig = extractGatewayToken(config)
  const hookTokenFromConfig = extractHookToken(config)
  const envGatewayToken =
    process.env.FOCO_OPENCLAW_TOKEN ??
    process.env.OPENCLAW_SERVICE_TOKEN ??
    process.env.BOSUN_SERVICE_TOKEN ??
    ''
  const envHookToken =
    process.env.FOCO_OPENCLAW_HOOK_TOKEN ??
    process.env.OPENCLAW_HOOK_TOKEN ??
    ''

  return {
    configPath: resolveConfigPath(),
    config,
    primaryModel: model,
    modelAlias: alias,
    configuredModels,
    acpEnabled: acp.enabled,
    acpDispatchEnabled: acp.dispatchEnabled,
    acpBackend: acp.backend,
    configuredAgents,
    codexConfigured: configuredAgents.some((agent) => agent.id === 'codex' || agent.acpAgent === 'codex'),
    workspacePath: readString(asRecord(asRecord(config.agents).defaults).workspace),
    gatewayUrl: process.env.OPENCLAW_GATEWAY_URL ?? DEFAULT_GATEWAY_URL,
    relayUrl: process.env.FOCO_OPENCLAW_RELAY ?? DEFAULT_RELAY_URL,
    gatewayToken: envGatewayToken || gatewayTokenFromConfig || '',
    hookToken: envHookToken || hookTokenFromConfig || '',
    tokenSource:
      envHookToken || envGatewayToken
        ? 'env' as const
        : hookTokenFromConfig || gatewayTokenFromConfig
          ? 'config' as const
          : 'none' as const,
    version: readString(asRecord(config.meta).lastTouchedVersion),
  }
}

export function buildEmptyRuntimeSnapshot(configPath: string, relayUrl: string, gatewayUrl: string): OpenClawRuntimeSnapshot {
  return {
    configPath,
    relayUrl,
    gatewayUrl,
    relayReachable: false,
    gatewayHealthy: false,
    dispatchConfigured: false,
    tokenConfigured: false,
    tokenSource: 'none',
    primaryModel: null,
    modelAlias: null,
    configuredModels: [],
    acpEnabled: false,
    acpDispatchEnabled: true,
    acpBackend: null,
    configuredAgents: [],
    codexConfigured: false,
    defaultModelConfigured: false,
    workspacePath: null,
    attachedTabs: 0,
    tabs: [],
    profiles: [],
    version: null,
  }
}
