import { createReadStream } from 'fs'
import FormData from 'form-data'
import { FeatureFlagsService, FeatureFlagContext } from '../feature-flags/feature-flags'
import { EventBuilder } from '../events/event-envelope'
import { ApiError } from '../errors/api-error'

/**
 * OpenAI Whisper Integration Service
 * Handles speech-to-text transcription using OpenAI's Whisper API
 * Supports both file-based and real-time transcription with multiple languages
 */

export interface WhisperConfig {
  apiKey?: string
  model?: 'whisper-1'
  language?: string
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt'
  temperature?: number
  timestampGranularities?: ('word' | 'segment')[]
}

export interface TranscriptionOptions {
  language?: string
  prompt?: string
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt'
  temperature?: number
  timestampGranularities?: ('word' | 'segment')[]
}

export interface TranscriptionResult {
  text: string
  language: string
  duration: number
  words?: WhisperWord[]
  segments?: WhisperSegment[]
  confidence?: number
}

export interface WhisperWord {
  word: string
  start: number
  end: number
  confidence: number
}

export interface WhisperSegment {
  id: number
  seek: number
  start: number
  end: number
  text: string
  tokens: number[]
  temperature: number
  avg_logprob: number
  compression_ratio: number
  no_speech_prob: number
}

export interface AudioFile {
  data: Buffer | ArrayBuffer
  filename: string
  mimeType: string
  size: number
}

/**
 * OpenAI Whisper Service
 */
export class OpenAIWhisperService {
  private featureFlags: FeatureFlagsService
  private config: WhisperConfig
  private baseUrl: string

  constructor(config: WhisperConfig = {}) {
    this.featureFlags = FeatureFlagsService.getInstance()
    this.config = {
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      model: config.model || 'whisper-1',
      language: config.language || 'en',
      responseFormat: config.responseFormat || 'json',
      temperature: config.temperature || 0.0,
      timestampGranularities: config.timestampGranularities || ['word', 'segment']
    }
    this.baseUrl = 'https://api.openai.com/v1'
  }

  /**
   * Transcribe audio file using Whisper
   */
  async transcribeAudio(
    audioFile: AudioFile,
    context: FeatureFlagContext,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    // Check feature flags
    this.validateFeatureFlags(context)

    if (!this.config.apiKey) {
      throw new ApiError('MISSING_API_KEY' as any, 'OpenAI API key is required')
    }

    const startTime = Date.now()

    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', audioFile.data, {
        filename: audioFile.filename,
        contentType: audioFile.mimeType
      })
      formData.append('model', this.config.model!)
      formData.append('language', options.language || this.config.language!)
      formData.append('response_format', options.responseFormat || this.config.responseFormat!)
      formData.append('temperature', (options.temperature || this.config.temperature!).toString())

      if (options.prompt) {
        formData.append('prompt', options.prompt)
      }

      if (options.timestampGranularities) {
        options.timestampGranularities.forEach(granularity => {
          formData.append('timestamp_granularities[]', granularity)
        })
      }

      // Make API request
      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          ...formData.getHeaders()
        },
        body: formData as any
      })

      if (!response.ok) {
        const error = await response.json()
        throw new ApiError('WHISPER_API_ERROR' as any, `Whisper API error: ${error.error?.message || 'Unknown error'}`)
      }

      const result = await response.json()
      const processingTime = Date.now() - startTime

      // Parse response based on format
      const transcription = this.parseWhisperResponse(result, options.responseFormat || 'json')

      // Emit transcription event
      await this.emitTranscriptionEvent('whisper_transcription_completed', context, {
        duration: transcription.duration,
        processingTime,
        language: transcription.language,
        confidence: transcription.confidence,
        wordCount: transcription.words?.length || 0
      })

      return transcription

    } catch (error) {
      const processingTime = Date.now() - startTime
      
      // Emit error event
      await this.emitTranscriptionEvent('whisper_transcription_failed', context, {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      })

      throw error
    }
  }

  /**
   * Transcribe audio from URL
   */
  async transcribeFromUrl(
    audioUrl: string,
    context: FeatureFlagContext,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    try {
      // Download audio file
      const response = await fetch(audioUrl)
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.statusText}`)
      }

      const buffer = await response.arrayBuffer()
      const filename = audioUrl.split('/').pop() || 'audio.webm'
      const mimeType = response.headers.get('content-type') || 'audio/webm'

      const audioFile: AudioFile = {
        data: Buffer.from(buffer),
        filename,
        mimeType,
        size: buffer.byteLength
      }

      return this.transcribeAudio(audioFile, context, options)

    } catch (error) {
      throw new ApiError('URL_TRANSCRIPTION_FAILED' as any, `Failed to transcribe from URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Real-time transcription streaming (simulated - Whisper doesn't support true streaming)
   */
  async streamTranscription(
    audioChunks: ArrayBuffer[],
    context: FeatureFlagContext,
    options: TranscriptionOptions & {
      onProgress?: (partial: string, confidence: number) => void
      chunkInterval?: number
    } = {}
  ): Promise<TranscriptionResult> {
    const { onProgress, chunkInterval = 2000, ...transcriptionOptions } = options

    // Combine chunks into a single audio file
    const combinedBuffer = this.combineAudioChunks(audioChunks)
    
    const audioFile: AudioFile = {
      data: Buffer.from(combinedBuffer),
      filename: 'streaming_audio.webm',
      mimeType: 'audio/webm',
      size: combinedBuffer.byteLength
    }

    // Simulate streaming by processing chunks periodically
    if (onProgress && audioChunks.length > 1) {
      for (let i = 0; i < audioChunks.length; i++) {
        const chunkFile: AudioFile = {
          data: Buffer.from(audioChunks[i]),
          filename: `chunk_${i}.webm`,
          mimeType: 'audio/webm',
          size: audioChunks[i].byteLength
        }

        try {
          const partialResult = await this.transcribeAudio(chunkFile, context, {
            ...transcriptionOptions,
            responseFormat: 'text'
          })

          onProgress(partialResult.text, partialResult.confidence || 0.8)

          // Wait before processing next chunk
          if (i < audioChunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, chunkInterval))
          }
        } catch (error) {
          console.warn(`Failed to transcribe chunk ${i}:`, error)
        }
      }
    }

    // Final transcription with full audio
    return this.transcribeAudio(audioFile, context, {
      ...transcriptionOptions,
      responseFormat: 'verbose_json'
    })
  }

  /**
   * Detect language from audio
   */
  async detectLanguage(
    audioFile: AudioFile,
    context: FeatureFlagContext
  ): Promise<{ language: string; confidence: number }> {
    // Check feature flags
    this.validateFeatureFlags(context)

    if (!this.config.apiKey) {
      throw new ApiError('MISSING_API_KEY' as any, 'OpenAI API key is required')
    }

    try {
      const formData = new FormData()
      formData.append('file', audioFile.data, {
        filename: audioFile.filename,
        contentType: audioFile.mimeType
      })
      formData.append('model', this.config.model!)

      const response = await fetch(`${this.baseUrl}/audio/translations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          ...formData.getHeaders()
        },
        body: formData as any
      })

      if (!response.ok) {
        const error = await response.json()
        throw new ApiError('WHISPER_API_ERROR' as any, `Whisper API error: ${error.error?.message || 'Unknown error'}`)
      }

      const result = await response.json()
      
      // Whisper doesn't provide confidence for language detection, so we estimate
      return {
        language: this.config.language || 'en',
        confidence: 0.9
      }

    } catch (error) {
      throw new ApiError('LANGUAGE_DETECTION_FAILED' as any, `Failed to detect language: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate feature flags
   */
  private validateFeatureFlags(context: FeatureFlagContext): void {
    const whisperEnabled = this.featureFlags.isEnabled('ai_whisper_integration', context)
    if (!whisperEnabled) {
      throw new ApiError('FEATURE_FLAG_DISABLED' as any, 'OpenAI Whisper integration is not enabled')
    }
  }

  /**
   * Parse Whisper API response based on format
   */
  private parseWhisperResponse(result: any, format: string): TranscriptionResult {
    switch (format) {
      case 'verbose_json':
        return {
          text: result.text,
          language: result.language || 'en',
          duration: result.duration || 0,
          words: result.words?.map((word: any) => ({
            word: word.word,
            start: word.start,
            end: word.end,
            confidence: word.confidence || 0.8
          })),
          segments: result.segments,
          confidence: this.calculateOverallConfidence(result.words || [])
        }
      
      case 'json':
      case 'text':
        return {
          text: typeof result === 'string' ? result : result.text,
          language: this.config.language || 'en',
          duration: 0,
          confidence: 0.8
        }
      
      case 'srt':
      case 'vtt':
        // Parse subtitle format to extract text and timing
        const parsed = this.parseSubtitleFormat(result, format)
        return {
          text: parsed.text,
          language: this.config.language || 'en',
          duration: parsed.duration,
          confidence: 0.8
        }
      
      default:
        throw new Error(`Unsupported response format: ${format}`)
    }
  }

  /**
   * Calculate overall confidence from word-level confidences
   */
  private calculateOverallConfidence(words: WhisperWord[]): number {
    if (words.length === 0) return 0.8
    
    const totalConfidence = words.reduce((sum, word) => sum + word.confidence, 0)
    return totalConfidence / words.length
  }

  /**
   * Parse subtitle formats (SRT/VTT)
   */
  private parseSubtitleFormat(content: string, format: string): { text: string; duration: number } {
    const lines = content.split('\n')
    const textLines = lines.filter(line => 
      line.trim() && 
      !line.match(/^\d+$/) && 
      !line.match(/^\d{2}:\d{2}:\d{2}/)
    )
    
    const text = textLines.join(' ').replace(/<[^>]*>/g, '') // Remove HTML tags
    
    // Extract duration from timing lines
    const timingLines = lines.filter(line => line.match(/^\d{2}:\d{2}:\d{2}/))
    let duration = 0
    
    if (timingLines.length > 0) {
      const lastTiming = timingLines[timingLines.length - 1]
      const match = lastTiming.match(/(\d{2}):(\d{2}):(\d{2})/)
      if (match) {
        const [, hours, minutes, seconds] = match
        duration = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds)
      }
    }
    
    return { text, duration }
  }

  /**
   * Combine multiple audio chunks into a single buffer
   */
  private combineAudioChunks(chunks: ArrayBuffer[]): ArrayBuffer {
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
    const combined = new Uint8Array(totalSize)
    
    let offset = 0
    for (const chunk of chunks) {
      combined.set(new Uint8Array(chunk), offset)
      offset += chunk.byteLength
    }
    
    return combined.buffer
  }

  /**
   * Emit transcription events
   */
  private async emitTranscriptionEvent(
    eventType: string,
    context: FeatureFlagContext,
    data: any
  ): Promise<void> {
    try {
      // Log transcription event for monitoring
      console.log(`[WHISPER] Transcription event:`, eventType, { 
        userId: context.userId,
        organizationId: context.organizationId,
        data 
      })
    } catch (error) {
      console.error('Failed to emit transcription event:', error)
    }
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return [
      'af', 'ar', 'hy', 'az', 'be', 'bs', 'bg', 'ca', 'zh', 'hr', 'cs', 'da', 'nl', 'en', 'et', 'fi', 'fr',
      'gl', 'de', 'el', 'he', 'hi', 'hu', 'is', 'id', 'it', 'ja', 'kn', 'kk', 'ko', 'lv', 'lt', 'mk', 'ms',
      'ml', 'mt', 'mi', 'mr', 'ne', 'no', 'fa', 'pl', 'pt', 'ro', 'ru', 'sr', 'sk', 'sl', 'es', 'sw',
      'sv', 'tl', 'ta', 'th', 'tr', 'uk', 'ur', 'vi', 'cy'
    ]
  }

  /**
   * Validate audio file format
   */
  validateAudioFormat(audioFile: AudioFile): boolean {
    const supportedTypes = [
      'audio/m4a', 'audio/mp3', 'audio/mp4', 'audio/mpeg', 'audio/mpga',
      'audio/ogg', 'audio/opus', 'audio/wav', 'audio/webm'
    ]
    
    return supportedTypes.includes(audioFile.mimeType) && audioFile.size > 0 && audioFile.size <= 25 * 1024 * 1024 // 25MB limit
  }

  /**
   * Get service configuration
   */
  getConfig(): WhisperConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<WhisperConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

/**
 * Export singleton instance
 */
export const openAIWhisperService = new OpenAIWhisperService()

/**
 * Convenience functions
 */
export async function transcribeAudio(
  audioFile: AudioFile,
  context: FeatureFlagContext,
  options?: TranscriptionOptions
): Promise<TranscriptionResult> {
  return openAIWhisperService.transcribeAudio(audioFile, context, options)
}

export async function transcribeFromUrl(
  audioUrl: string,
  context: FeatureFlagContext,
  options?: TranscriptionOptions
): Promise<TranscriptionResult> {
  return openAIWhisperService.transcribeFromUrl(audioUrl, context, options)
}

export async function streamTranscription(
  audioChunks: ArrayBuffer[],
  context: FeatureFlagContext,
  options?: TranscriptionOptions & {
    onProgress?: (partial: string, confidence: number) => void
    chunkInterval?: number
  }
): Promise<TranscriptionResult> {
  return openAIWhisperService.streamTranscription(audioChunks, context, options)
}
