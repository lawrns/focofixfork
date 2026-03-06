import { spawnSync } from 'node:child_process'
import { MODEL_CATALOG, type ModelRuntimeSource } from '@/lib/ai/model-catalog'

export type AIRuntimeSourceHealth = {
  source: ModelRuntimeSource
  label: string
  available: boolean
  reason: string
}

export type AIModelHealth = {
  model: string
  label: string
  provider: string
  preferred_runtime_source: ModelRuntimeSource
  preferred_runtime_label: string
  alternate_runtime_sources: ModelRuntimeSource[]
  available: boolean
  available_via: ModelRuntimeSource[]
  reason: string
}

const SOURCE_LABELS: Record<ModelRuntimeSource, string> = {
  openai_api: 'OpenAI API',
  anthropic_api: 'Anthropic API',
  claude_cli: 'Claude CLI',
  kimi_cli: 'Kimi CLI',
  kimi_api: 'Kimi API',
  zai_coding_api: 'Z.AI Coding',
  deepseek_api: 'DeepSeek API',
}

function commandExists(command: string): boolean {
  const result = spawnSync('bash', ['-lc', `command -v ${command}`], {
    stdio: 'ignore',
    timeout: 1200,
  })
  return result.status === 0
}

async function fetchClawdbotCapabilities(): Promise<any | null> {
  const baseUrl = process.env.CLAWDBOT_API_URL ?? 'http://127.0.0.1:18794'
  const token = process.env.OPENCLAW_SERVICE_TOKEN ?? ''
  try {
    const headers: Record<string, string> = {}
    if (token) headers.authorization = `Bearer ${token}`
    const res = await fetch(`${baseUrl}/capabilities`, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(2500),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function buildRuntimeSourceHealth(capabilities: any | null): Record<ModelRuntimeSource, AIRuntimeSourceHealth> {
  const availableClawdbotModels = new Set(
    Array.isArray(capabilities?.models)
      ? capabilities.models
          .filter((item: any) => item?.available && typeof item?.id === 'string')
          .map((item: any) => item.id as string)
      : []
  )

  const claudeCliAvailable = commandExists('claude')
  const kimiCliAvailable = commandExists('kimi')
  const kimiApiConfigured = Boolean(process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY)

  return {
    openai_api: {
      source: 'openai_api',
      label: SOURCE_LABELS.openai_api,
      available: Boolean(process.env.OPENAI_API_KEY),
      reason: process.env.OPENAI_API_KEY ? 'Configured' : 'Missing OPENAI_API_KEY',
    },
    anthropic_api: {
      source: 'anthropic_api',
      label: SOURCE_LABELS.anthropic_api,
      available: Boolean(process.env.ANTHROPIC_API_KEY),
      reason: process.env.ANTHROPIC_API_KEY ? 'Configured' : 'Missing ANTHROPIC_API_KEY',
    },
    claude_cli: {
      source: 'claude_cli',
      label: SOURCE_LABELS.claude_cli,
      available: claudeCliAvailable,
      reason: claudeCliAvailable ? 'CLI detected' : 'Claude CLI not found on PATH',
    },
    kimi_cli: {
      source: 'kimi_cli',
      label: SOURCE_LABELS.kimi_cli,
      available: kimiCliAvailable || availableClawdbotModels.has('kimi-k2-standard') || availableClawdbotModels.has('kimi-k2-fast') || availableClawdbotModels.has('kimi-k2-max'),
      reason: kimiCliAvailable
        ? 'CLI detected'
        : availableClawdbotModels.size > 0
          ? 'Available through ClawdBot routing'
          : 'Kimi CLI not found and ClawdBot does not report Kimi availability',
    },
    kimi_api: {
      source: 'kimi_api',
      label: SOURCE_LABELS.kimi_api,
      available: kimiApiConfigured,
      reason: kimiApiConfigured ? 'Configured' : 'Missing KIMI_API_KEY or MOONSHOT_API_KEY',
    },
    zai_coding_api: {
      source: 'zai_coding_api',
      label: SOURCE_LABELS.zai_coding_api,
      available: Boolean(process.env.Z_AI_API_KEY || process.env.GLM_API_KEY),
      reason: process.env.Z_AI_API_KEY || process.env.GLM_API_KEY ? 'Configured' : 'Missing Z_AI_API_KEY or GLM_API_KEY',
    },
    deepseek_api: {
      source: 'deepseek_api',
      label: SOURCE_LABELS.deepseek_api,
      available: Boolean(process.env.DEEPSEEK_API_KEY),
      reason: process.env.DEEPSEEK_API_KEY ? 'Configured' : 'Missing DEEPSEEK_API_KEY',
    },
  }
}

export async function getAIRuntimeHealth() {
  const capabilities = await fetchClawdbotCapabilities()
  const runtimeSources = buildRuntimeSourceHealth(capabilities)

  const models: AIModelHealth[] = MODEL_CATALOG.map((entry) => {
    const candidateSources = [entry.runtimeSource, ...(entry.alternateRuntimeSources ?? [])]
    const availableVia = candidateSources.filter((source, index) => candidateSources.indexOf(source) === index)
      .filter((source) => runtimeSources[source]?.available)
    const preferred = runtimeSources[entry.runtimeSource]

    return {
      model: entry.value,
      label: entry.label,
      provider: entry.provider,
      preferred_runtime_source: entry.runtimeSource,
      preferred_runtime_label: entry.runtimeSourceLabel,
      alternate_runtime_sources: entry.alternateRuntimeSources ?? [],
      available: availableVia.length > 0,
      available_via: availableVia,
      reason: availableVia.length > 0
        ? `Available via ${availableVia.map((source) => SOURCE_LABELS[source]).join(', ')}`
        : preferred?.reason ?? 'Unavailable',
    }
  })

  return {
    ok: models.some((model) => model.available),
    status: models.some((model) => model.available) ? 'ready' : 'unconfigured',
    message: models.some((model) => model.available)
      ? 'AI runtime health is available'
      : 'No configured AI runtimes are currently available',
    models,
    runtime_sources: Object.values(runtimeSources),
    clawdbot: capabilities
      ? {
          reachable: true,
          reported_models: Array.isArray(capabilities?.models)
            ? capabilities.models.filter((item: any) => item?.available).map((item: any) => item.id).filter(Boolean)
            : [],
        }
      : {
          reachable: false,
          reported_models: [],
        },
  }
}
