/**
 * AI Service - Multi-provider AI Service
 * 
 * Supports OpenAI and DeepSeek for various AI operations
 */

import OpenAI from 'openai';

export type AIProvider = 'openai' | 'deepseek';

interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  baseURL?: string;
  model: string;
}

export class AIService {
  private client: OpenAI;
  private config: AIConfig;

  constructor(provider?: AIProvider) {
    // Determine provider and configuration
    const aiProvider = provider || (process.env.AI_PROVIDER as AIProvider) || 'deepseek';
    
    console.log('[AIService] Constructor called with provider:', aiProvider)
    console.log('[AIService] Environment variables:', {
      AI_PROVIDER: process.env.AI_PROVIDER,
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ? '***' + process.env.DEEPSEEK_API_KEY.slice(-4) : 'undefined',
      DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
      DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL
    })
    
    if (aiProvider === 'deepseek') {
      this.config = {
        provider: 'deepseek',
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
      };
      
      // Handle different model names for DeepSeek
      if (this.config.model === 'deepseek-v3') {
        this.config.model = 'deepseek-chat';
        console.log('[AIService] Converted deepseek-v3 to deepseek-chat');
      }
    } else {
      this.config = {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini'
      };
    }

    console.log('[AIService] Config:', {
      provider: this.config.provider,
      hasApiKey: !!this.config.apiKey,
      model: this.config.model,
      baseURL: this.config.baseURL,
      originalModel: process.env.DEEPSEEK_MODEL
    })

    if (!this.config.apiKey) {
      console.warn(`⚠️  ${this.config.provider} API key not configured - AI features will use mock responses`);
    }

    // Initialize OpenAI client (works with OpenAI-compatible APIs like DeepSeek)
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL
    });
  }

  /**
   * Generate chat completion
   */
  async chatCompletion(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>) {
    console.log('[AIService] chatCompletion called with', messages.length, 'messages')
    
    if (!this.config.apiKey) {
      console.error('[AIService] No API key configured for', this.config.provider)
      throw new Error(`${this.config.provider} API key not configured`);
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
        code: (error as any)?.code
      })
      throw error;
    }
  }

  /**
   * Transcribe audio to text (only works with OpenAI Whisper)
   */
  async transcribe(audioFile: File) {
    if (this.config.provider !== 'openai') {
      throw new Error('Audio transcription is only supported with OpenAI provider');
    }

    if (!this.config.apiKey) {
      throw new Error('OpenAI API key not configured');
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
