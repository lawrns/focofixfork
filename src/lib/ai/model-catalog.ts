import type { AIProvider } from '@/lib/ai/policy'

export type ModelCatalogProvider = AIProvider | 'clawdbot'

export type ModelRuntimeSource =
  | 'openai_api'
  | 'anthropic_api'
  | 'claude_cli'
  | 'kimi_cli'
  | 'kimi_api'
  | 'zai_coding_api'
  | 'deepseek_api'

export interface ModelCatalogEntry {
  value: string
  label: string
  provider: ModelCatalogProvider
  runtimeSource: ModelRuntimeSource
  runtimeSourceLabel: string
  alternateRuntimeSources?: ModelRuntimeSource[]
  recommended?: boolean
  pipelineOnly?: boolean
}

export const MODEL_CATALOG: ModelCatalogEntry[] = [
  {
    provider: 'openai',
    value: 'gpt-5.4-medium',
    label: 'GPT-5.4 Medium',
    runtimeSource: 'openai_api',
    runtimeSourceLabel: 'OpenAI API',
    recommended: true,
  },
  {
    provider: 'openai',
    value: 'gpt-4o',
    label: 'GPT-4o',
    runtimeSource: 'openai_api',
    runtimeSourceLabel: 'OpenAI API',
  },
  {
    provider: 'openai',
    value: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    runtimeSource: 'openai_api',
    runtimeSourceLabel: 'OpenAI API',
  },
  {
    provider: 'anthropic',
    value: 'claude-opus-4-6',
    label: 'Claude Opus 4.6',
    runtimeSource: 'claude_cli',
    runtimeSourceLabel: 'Claude CLI',
    alternateRuntimeSources: ['anthropic_api'],
  },
  {
    provider: 'anthropic',
    value: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    runtimeSource: 'claude_cli',
    runtimeSourceLabel: 'Claude CLI',
    alternateRuntimeSources: ['anthropic_api'],
  },
  {
    provider: 'anthropic',
    value: 'claude-haiku-4-5-20251001',
    label: 'Claude Haiku 4.5',
    runtimeSource: 'anthropic_api',
    runtimeSourceLabel: 'Anthropic API',
    alternateRuntimeSources: ['claude_cli'],
  },
  {
    provider: 'glm',
    value: 'glm-5',
    label: 'GLM-5',
    runtimeSource: 'zai_coding_api',
    runtimeSourceLabel: 'Z.AI Coding',
  },
  {
    provider: 'glm',
    value: 'glm-4.7',
    label: 'GLM-4.7',
    runtimeSource: 'zai_coding_api',
    runtimeSourceLabel: 'Z.AI Coding',
  },
  {
    provider: 'deepseek',
    value: 'deepseek-chat',
    label: 'DeepSeek Chat',
    runtimeSource: 'deepseek_api',
    runtimeSourceLabel: 'DeepSeek API',
  },
  {
    provider: 'clawdbot',
    value: 'kimi-k2-standard',
    label: 'Kimi K2 Standard',
    runtimeSource: 'kimi_cli',
    runtimeSourceLabel: 'Kimi CLI / API',
    alternateRuntimeSources: ['kimi_api'],
    pipelineOnly: true,
  },
  {
    provider: 'clawdbot',
    value: 'kimi-k2-fast',
    label: 'Kimi K2 Fast',
    runtimeSource: 'kimi_cli',
    runtimeSourceLabel: 'Kimi CLI / API',
    alternateRuntimeSources: ['kimi_api'],
    pipelineOnly: true,
  },
  {
    provider: 'clawdbot',
    value: 'kimi-k2-max',
    label: 'Kimi K2 Max',
    runtimeSource: 'kimi_cli',
    runtimeSourceLabel: 'Kimi CLI / API',
    alternateRuntimeSources: ['kimi_api'],
    pipelineOnly: true,
  },
]

export function findModelCatalogEntry(model: string | null | undefined): ModelCatalogEntry | null {
  if (!model) return null
  return MODEL_CATALOG.find((entry) => entry.value === model) ?? null
}

export function getModelLabel(model: string | null | undefined): string {
  return findModelCatalogEntry(model)?.label ?? (model || 'Inherited')
}

export function getModelRuntimeSourceLabel(model: string | null | undefined): string | null {
  return findModelCatalogEntry(model)?.runtimeSourceLabel ?? null
}

export function getModelProvider(model: string | null | undefined): AIProvider | undefined {
  const provider = findModelCatalogEntry(model)?.provider
  return provider && provider !== 'clawdbot' ? provider : undefined
}

export function getSelectableModels(options?: { includePipelineOnly?: boolean }): ModelCatalogEntry[] {
  const includePipelineOnly = options?.includePipelineOnly ?? true
  return includePipelineOnly ? MODEL_CATALOG : MODEL_CATALOG.filter((entry) => !entry.pipelineOnly)
}
