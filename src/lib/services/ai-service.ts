/**
 * AI Service - Multi-provider AI Service
 *
 * Supports OpenAI, DeepSeek, and GLM (Zhipu AI) for various AI operations
 *
 * GLM Note: GLM API keys contain a dot (id.secret) which can cause issues with
 * the OpenAI SDK. We use a custom fetch implementation for GLM.
 *
 * See: https://docs.bigmodel.cn/cn/guide/develop/http/introduction
 */

import OpenAI from 'openai';

export type AIProvider = 'openai' | 'deepseek' | 'glm';

interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  baseURL?: string;
  model: string;
}

/**
 * Custom fetch for GLM that properly handles the API key format
 * GLM API keys are in format: id.secret
 */
function createGLMFetch(apiKey: string) {
  return async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
    console.log('[AIService] GLM Fetch:', url);

    // Parse the original request
    const fetchUrl = typeof url === 'string' ? url : url.toString();
    const fetchOptions = options || {};

    // Get headers
    const headers = new Headers(fetchOptions.headers || {});
    headers.set('Authorization', `Bearer ${apiKey}`);

    // Make the request with GLM-specific auth
    return fetch(fetchUrl, {
      ...fetchOptions,
      headers
    });
  };
}

export class AIService {
  private client: OpenAI | null;
  private config: AIConfig;
  private isGLM: boolean;

  constructor(provider?: AIProvider) {
    // Determine provider and configuration
    const aiProvider = provider || (process.env.AI_PROVIDER as AIProvider) || 'glm';

    console.log('[AIService] Constructor called with provider:', aiProvider)
    console.log('[AIService] Environment variables:', {
      AI_PROVIDER: process.env.AI_PROVIDER,
      GLM_API_KEY: process.env.GLM_API_KEY ? '***' + process.env.GLM_API_KEY.slice(-4) : 'undefined',
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ? '***' + process.env.DEEPSEEK_API_KEY.slice(-4) : 'undefined',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '***' + process.env.OPENAI_API_KEY.slice(-4) : 'undefined',
    })

    this.isGLM = aiProvider === 'glm';

    if (aiProvider === 'glm') {
      this.config = {
        provider: 'glm',
        apiKey: process.env.Z_AI_API_KEY || process.env.GLM_API_KEY || '',
        baseURL: 'https://api.z.ai/api/coding/paas/v4/',
        model: process.env.GLM_MODEL || 'glm-5'
      };
      console.log('[AIService] Using GLM (Z.ai) CODING endpoint with model:', this.config.model)
    } else if (aiProvider === 'deepseek') {
      this.config = {
        provider: 'deepseek',
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        model: 'deepseek-chat'
      };
      console.log('[AIService] Using DeepSeek provider with model:', this.config.model)
    } else {
      this.config = {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini'
      };
      console.log('[AIService] Using OpenAI provider with model:', this.config.model)
    }

    console.log('[AIService] Config:', {
      provider: this.config.provider,
      hasApiKey: !!this.config.apiKey,
      model: this.config.model,
      baseURL: this.config.baseURL,
    })

    if (!this.config.apiKey) {
      console.warn(`⚠️  ${this.config.provider} API key not configured - AI features will use mock responses`);
    }

    // Initialize OpenAI client
    // For GLM, use custom fetch to handle API key format correctly
    if (this.isGLM) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey, // OpenAI SDK requires apiKey, but we override with custom fetch
        baseURL: this.config.baseURL,
        fetch: createGLMFetch(this.config.apiKey)
      });
    } else {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL,
      });
    }
  }

  /**
   * Generate chat completion
   */
  async chatCompletion(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>) {
    console.log('[AIService] chatCompletion called with', messages.length, 'messages')
    console.log('[AIService] Current provider:', this.config.provider, 'model:', this.config.model)

    if (!this.config.apiKey) {
      console.error('[AIService] No API key configured for', this.config.provider)
      throw new Error(`${this.config.provider} API key not configured`);
    }

    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      console.log('[AIService] Making API call to', this.config.baseURL, 'with model', this.config.model)

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000
      });

      console.log('[AIService] API response received')
      return response.choices[0]?.message?.content || '';

    } catch (error) {
      console.error('[AIService] API call failed:', error)
      console.error('[AIService] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: (error as any)?.status,
        code: (error as any)?.code,
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error;
    }
  }

  /**
   * Generate text completion using unified interface (matches OpenAIService)
   */
  async generate(request: {
    prompt: string;
    context?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ content: string; model: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    if (request.context) {
      messages.push({ role: 'system', content: `Context: ${request.context}` });
    }

    messages.push({ role: 'user', content: request.prompt });

    const content = await this.chatCompletion(messages);

    return {
      content,
      model: this.config.model
    };
  }

  /**
   * Transcribe audio to text (only works with OpenAI Whisper)
   * Note: GLM and DeepSeek do not support audio transcription
   */
  async transcribe(audioFile: File) {
    if (this.config.provider !== 'openai') {
      throw new Error(`Audio transcription is only supported with OpenAI provider. Current provider: ${this.config.provider}`);
    }

    if (!this.config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const response = await this.client.audio.transcriptions.create({
        model: 'whisper-1',
        file: audioFile
      });

      return response.text;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  /**
   * Get current provider info
   */
  getProviderInfo() {
    return {
      provider: this.config.provider,
      model: this.config.model,
      baseURL: this.config.baseURL
    };
  }
}

// Export singleton instance
export const aiService = new AIService();

// Export types
export type { AIConfig };
