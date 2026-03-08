/**
 * Ollama Proxy Client
 *
 * Wraps a self-hosted Ollama instance behind an ngrok auth proxy.
 * Used as a fallback when primary AI providers (OpenAI, Anthropic, etc.) fail.
 *
 * API format is native Ollama (NOT OpenAI-compatible):
 *   POST /api/chat    — chat completions
 *   POST /api/generate — text generation
 */

export interface OllamaProxyChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OllamaProxyChatRequest {
  model: string
  messages: OllamaProxyChatMessage[]
  stream?: boolean
}

export interface OllamaProxyChatResponse {
  model: string
  message: { role: string; content: string }
  done: boolean
}

export type OllamaProxyModel = 'qwen3.5:latest' | 'kimi-k2.5:cloud'

const DEFAULT_MODEL: OllamaProxyModel = 'qwen3.5:latest'
const COMPLEX_MODEL: OllamaProxyModel = 'kimi-k2.5:cloud'
const STANDARD_TIMEOUT = 30_000
const LONGFORM_TIMEOUT = 120_000

function getConfig() {
  const url = process.env.OLLAMA_PROXY_URL
  const key = process.env.OLLAMA_PROXY_KEY
  if (!url || !key) return null
  return { url: url.replace(/\/+$/, ''), key }
}

function buildHeaders(key: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
    'ngrok-skip-browser-warning': 'true',
  }
}

export function isOllamaProxyConfigured(): boolean {
  return Boolean(process.env.OLLAMA_PROXY_URL && process.env.OLLAMA_PROXY_KEY)
}

export function pickOllamaModel(complex: boolean = false): OllamaProxyModel {
  return complex ? COMPLEX_MODEL : DEFAULT_MODEL
}

/**
 * Chat completion via Ollama proxy (non-streaming).
 */
export async function ollamaProxyChat(
  messages: OllamaProxyChatMessage[],
  options?: {
    model?: OllamaProxyModel
    longform?: boolean
  }
): Promise<{ content: string; model: string }> {
  const cfg = getConfig()
  if (!cfg) throw new Error('Ollama proxy not configured (missing OLLAMA_PROXY_URL or OLLAMA_PROXY_KEY)')

  const model = options?.model ?? DEFAULT_MODEL
  const timeout = options?.longform ? LONGFORM_TIMEOUT : STANDARD_TIMEOUT

  const body: OllamaProxyChatRequest = {
    model,
    messages,
    stream: false,
  }

  const response = await fetch(`${cfg.url}/api/chat`, {
    method: 'POST',
    headers: buildHeaders(cfg.key),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Ollama proxy error ${response.status}: ${text.slice(0, 500)}`)
  }

  const data = (await response.json()) as OllamaProxyChatResponse
  return {
    content: data.message?.content ?? '',
    model: data.model ?? model,
  }
}

/**
 * Text generation via Ollama proxy (non-streaming).
 */
export async function ollamaProxyGenerate(
  prompt: string,
  options?: {
    model?: OllamaProxyModel
    system?: string
    longform?: boolean
  }
): Promise<{ content: string; model: string }> {
  const cfg = getConfig()
  if (!cfg) throw new Error('Ollama proxy not configured (missing OLLAMA_PROXY_URL or OLLAMA_PROXY_KEY)')

  const model = options?.model ?? DEFAULT_MODEL
  const timeout = options?.longform ? LONGFORM_TIMEOUT : STANDARD_TIMEOUT

  const body: Record<string, unknown> = {
    model,
    prompt,
    stream: false,
  }
  if (options?.system) body.system = options.system

  const response = await fetch(`${cfg.url}/api/generate`, {
    method: 'POST',
    headers: buildHeaders(cfg.key),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Ollama proxy error ${response.status}: ${text.slice(0, 500)}`)
  }

  const data = (await response.json()) as { response?: string; model?: string }
  return {
    content: data.response ?? '',
    model: data.model ?? model,
  }
}
