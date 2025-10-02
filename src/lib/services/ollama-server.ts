// Server-safe version of OllamaService for API routes
// This file does NOT import supabase to avoid client-side code in serverless functions

export interface OllamaConfig {
  host: string
  defaultModel: string
  codeModel: string
  chatModel: string
  timeout: number
  maxRetries: number
}

export interface OllamaRequest {
  model: string
  prompt: string
  context?: string
  stream?: boolean
  options?: {
    temperature?: number
    top_p?: number
    top_k?: number
    num_predict?: number
    num_ctx?: number
  }
}

export interface OllamaResponse {
  model: string
  created_at: string
  response: string
  done: boolean
  context?: number[]
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  eval_count?: number
  eval_duration?: number
}

export class OllamaServerService {
  public config: OllamaConfig
  private abortController: AbortController | null = null

  constructor(config?: Partial<OllamaConfig>) {
    // Use NEXT_PUBLIC_OLLAMA_URL if available, otherwise fall back to local
    const ollamaHost = process.env.NEXT_PUBLIC_OLLAMA_URL ||
                      process.env.NEXT_PUBLIC_OLLAMA_HOST ||
                      'http://127.0.0.1:11434'

    this.config = {
      host: ollamaHost,
      defaultModel: process.env.NEXT_PUBLIC_OLLAMA_DEFAULT_MODEL || 'llama2',
      codeModel: process.env.NEXT_PUBLIC_OLLAMA_CODE_MODEL || 'codellama',
      chatModel: process.env.NEXT_PUBLIC_OLLAMA_CHAT_MODEL || 'mistral',
      timeout: 30000,
      maxRetries: 3,
      ...config
    }
  }

  /**
   * Test connection to Ollama server
   */
  async testConnection(): Promise<{ success: boolean; message: string; models?: string[] }> {
    // Check if Ollama host is configured
    if (!this.config.host) {
      return {
        success: false,
        message: 'Ollama host not configured'
      }
    }

    try {
      const response = await this.makeRequest('/api/tags')

      if (response.ok) {
        const data = await response.json()
        const models = data.models?.map((m: any) => m.name) || []
        return {
          success: true,
          message: 'Ollama server is running',
          models
        }
      } else {
        return {
          success: false,
          message: `Ollama server responded with status ${response.status}`
        }
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to connect to Ollama: ${error.message}`
      }
    }
  }

  /**
   * Generate text using Ollama
   */
  async generate(request: OllamaRequest): Promise<OllamaResponse> {
    if (!this.config.host) {
      throw new Error('Ollama host not configured')
    }

    const payload = {
      model: request.model,
      prompt: request.prompt,
      context: request.context,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        ...request.options
      }
    }

    const response = await this.makeRequest('/api/generate', {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * List available models
   */
  async listModels(): Promise<{ name: string; size: number; modified_at: string }[]> {
    const response = await this.makeRequest('/api/tags')

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.models || []
  }

  /**
   * Private helper methods
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (!this.config.host) {
      throw new Error('Ollama host not configured')
    }

    const url = `${this.config.host}${endpoint}`
    console.log('[OllamaServer] Fetching:', url)

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options
    }

    const response = await fetch(url, defaultOptions)
    console.log('[OllamaServer] Response:', response.status, response.statusText)
    return response
  }
}

// Export singleton instance for server-side use
export const ollamaServerService = new OllamaServerService()
