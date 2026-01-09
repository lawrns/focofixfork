import { randomUUID } from 'crypto'
import { FeatureFlagsService, FeatureFlagContext } from '../feature-flags/feature-flags'
import { EventBuilder } from '../events/event-envelope'
import { ApiError } from '../errors/api-error'
import { VoiceSessionsAdapter } from '../database/adapters'

/**
 * Voice Capture Service
 * Handles audio recording, streaming, and transcription in shadow mode
 * No core database writes - only to voice_sessions and voice_audio_chunks tables
 */

export interface VoiceCaptureOptions {
  maxDurationSeconds?: number
  sampleRate?: number
  channels?: number
  format?: 'webm' | 'wav' | 'mp3'
  noiseReduction?: boolean
  realTimeTranscription?: boolean
  language?: string
}

export interface AudioChunk {
  id: string
  sessionId: string
  sequenceNumber: number
  data: ArrayBuffer
  duration: number
  size: number
  format: string
  sampleRate: number
  timestamp: Date
}

export interface TranscriptionResult {
  text: string
  confidence: number
  language: string
  duration: number
  words?: Array<{
    word: string
    start: number
    end: number
    confidence: number
  }>
}

export interface VoiceCaptureSession {
  id: string
  userId: string
  organizationId: string
  status: 'initializing' | 'recording' | 'processing' | 'completed' | 'failed'
  startedAt: Date
  endedAt?: Date
  duration: number
  audioChunks: AudioChunk[]
  transcription?: TranscriptionResult
  metadata: Record<string, any>
}

/**
 * Voice Capture Service Class
 */
export class VoiceCaptureService {
  private featureFlags: FeatureFlagsService
  private activeSessions = new Map<string, VoiceCaptureSession>()
  private voiceSessionsAdapter: VoiceSessionsAdapter

  constructor() {
    this.featureFlags = FeatureFlagsService.getInstance()
    this.voiceSessionsAdapter = new VoiceSessionsAdapter({
      useCompatibilityViews: false,
      enableVoiceFeatures: true,
      enableDualWriteMode: false,
      context: { userId: '', organizationId: '', environment: 'development' }
    })
  }

  /**
   * Initialize a new voice capture session
   */
  async initializeSession(
    context: FeatureFlagContext,
    options: VoiceCaptureOptions = {}
  ): Promise<VoiceCaptureSession> {
    // Check feature flags
    this.validateFeatureFlags(context)

    const sessionId = randomUUID()
    const session: VoiceCaptureSession = {
      id: sessionId,
      userId: context.userId,
      organizationId: context.organizationId,
      status: 'initializing',
      startedAt: new Date(),
      duration: 0,
      audioChunks: [],
      metadata: {
        options,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
        timestamp: new Date().toISOString(),
        featureFlags: this.getActiveFlags(context)
      }
    }

    // Store in memory for active session tracking
    this.activeSessions.set(sessionId, session)

    // Create database session record (shadow mode)
    await this.createDatabaseSession(session, context)

    // Emit session created event
    await this.emitSessionEvent('voice_session_created', session, context)

    return session
  }

  /**
   * Start recording audio for a session
   */
  async startRecording(
    sessionId: string,
    context: FeatureFlagContext
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new ApiError('NOT_FOUND' as any, 'Voice session not found')
    }

    if (session.status !== 'initializing') {
      throw new ApiError('INVALID_STATE' as any, 'Session is not in initializing state')
    }

    session.status = 'recording'
    
    // Update database session
    await this.updateSessionStatus(sessionId, 'recording', context)

    // Emit recording started event
    await this.emitSessionEvent('voice_recording_started', session, context)
  }

  /**
   * Process an audio chunk
   */
  async processAudioChunk(
    sessionId: string,
    audioData: ArrayBuffer,
    context: FeatureFlagContext,
    metadata?: {
      duration?: number
      sampleRate?: number
      format?: string
    }
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new ApiError('NOT_FOUND' as any, 'Voice session not found')
    }

    if (session.status !== 'recording') {
      throw new ApiError('INVALID_STATE' as any, 'Session is not recording')
    }

    const chunkId = randomUUID()
    const sequenceNumber = session.audioChunks.length + 1
    const chunk: AudioChunk = {
      id: chunkId,
      sessionId,
      sequenceNumber,
      data: audioData,
      duration: metadata?.duration || 100, // Default 100ms
      size: audioData.byteLength,
      format: metadata?.format || 'webm',
      sampleRate: metadata?.sampleRate || 16000,
      timestamp: new Date()
    }

    // Add to session
    session.audioChunks.push(chunk)
    session.duration += chunk.duration

    // Store chunk in database (shadow mode)
    await this.storeAudioChunk(chunk, context)

    // Real-time transcription if enabled
    if (session.metadata.options.realTimeTranscription) {
      await this.processRealTimeTranscription(session, chunk, context)
    }

    // Emit chunk processed event
    await this.emitChunkEvent('audio_chunk_processed', chunk, session, context)
  }

  /**
   * Stop recording and start processing
   */
  async stopRecording(
    sessionId: string,
    context: FeatureFlagContext
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new ApiError('NOT_FOUND' as any, 'Voice session not found')
    }

    if (session.status !== 'recording') {
      throw new ApiError('INVALID_STATE' as any, 'Session is not recording')
    }

    session.status = 'processing'
    session.endedAt = new Date()

    // Update database session
    await this.updateSessionStatus(sessionId, 'processing', context)
    await this.updateSessionDuration(sessionId, session.duration, context)

    // Emit recording stopped event
    await this.emitSessionEvent('voice_recording_stopped', session, context)

    // Start transcription process
    await this.startTranscription(session, context)
  }

  /**
   * Get session status and metadata
   */
  async getSessionStatus(
    sessionId: string,
    context: FeatureFlagContext
  ): Promise<VoiceCaptureSession | null> {
    // Check memory first for active sessions
    const memorySession = this.activeSessions.get(sessionId)
    if (memorySession) {
      return memorySession
    }

    // Fall back to database for completed sessions
    return this.getDatabaseSession(sessionId, context)
  }

  /**
   * Cancel an active session
   */
  async cancelSession(
    sessionId: string,
    context: FeatureFlagContext
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new ApiError('NOT_FOUND' as any, 'Voice session not found')
    }

    session.status = 'failed'
    session.endedAt = new Date()

    // Update database session
    await this.updateSessionStatus(sessionId, 'failed', context)

    // Remove from active sessions
    this.activeSessions.delete(sessionId)

    // Emit session cancelled event
    await this.emitSessionEvent('voice_session_cancelled', session, context)
  }

  /**
   * Validate feature flags before proceeding
   */
  private validateFeatureFlags(context: FeatureFlagContext): void {
    const voiceCaptureEnabled = this.featureFlags.isEnabled('voice_capture_enabled', context)
    const shadowModeEnabled = this.featureFlags.isEnabled('voice_capture_shadow_mode', context)

    if (!voiceCaptureEnabled && !shadowModeEnabled) {
      throw new ApiError('FEATURE_FLAG_DISABLED' as any, 'Voice capture is not enabled')
    }
  }

  /**
   * Get active feature flags for session metadata
   */
  private getActiveFlags(context: FeatureFlagContext): string[] {
    const flags = [
      'voice_capture_enabled',
      'voice_capture_shadow_mode'
    ]

    return flags.filter(flag => this.featureFlags.isEnabled(flag as any, context))
  }

  /**
   * Create database session record
   */
  private async createDatabaseSession(
    session: VoiceCaptureSession,
    context: FeatureFlagContext
  ): Promise<void> {
    try {
      const options = session.metadata.options || {}
      
      await this.voiceSessionsAdapter.create({
        id: session.id,
        organization_id: session.organizationId,
        user_id: session.userId,
        title: `Voice Capture Session ${new Date().toISOString()}`,
        language: options.language || 'en',
        status: session.status,
        max_duration_seconds: options.maxDurationSeconds || 300,
        audio_format: options.format || 'webm',
        sample_rate: options.sampleRate || 16000,
        noise_reduction_enabled: options.noiseReduction || false,
        started_at: session.startedAt,
        transcription_status: 'pending',
        plan_status: 'pending',
        commit_status: 'pending',
        feature_flags: session.metadata.featureFlags,
        experimental_settings: {},
        metadata: session.metadata
      })
    } catch (error) {
      console.error('Failed to create database session (shadow mode):', error)
      // Don't throw - this is shadow mode and shouldn't block the user experience
    }
  }

  /**
   * Update session status in database
   */
  private async updateSessionStatus(
    sessionId: string,
    status: string,
    context: FeatureFlagContext
  ): Promise<void> {
    try {
      await this.voiceSessionsAdapter.update(sessionId, { status })
    } catch (error) {
      console.error('Failed to update session status (shadow mode):', error)
    }
  }

  /**
   * Update session duration in database
   */
  private async updateSessionDuration(
    sessionId: string,
    duration: number,
    context: FeatureFlagContext
  ): Promise<void> {
    try {
      await this.voiceSessionsAdapter.update(sessionId, { 
        ended_at: new Date(),
        last_activity_at: new Date()
      })
    } catch (error) {
      console.error('Failed to update session duration (shadow mode):', error)
    }
  }

  /**
   * Store audio chunk in database
   */
  private async storeAudioChunk(
    chunk: AudioChunk,
    context: FeatureFlagContext
  ): Promise<void> {
    try {
      // In shadow mode, we just store metadata, not the actual audio data
      // to save storage costs and maintain privacy
      const query = `
        INSERT INTO voice_audio_chunks (
          id, session_id, sequence_number, duration_ms, size_bytes, 
          format, sample_rate, recorded_at, transcription_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `
      
      // This would use the actual database connection in production
      console.log(`[SHADOW MODE] Storing audio chunk ${chunk.id} for session ${chunk.sessionId}`)
    } catch (error) {
      console.error('Failed to store audio chunk (shadow mode):', error)
    }
  }

  /**
   * Process real-time transcription
   */
  private async processRealTimeTranscription(
    session: VoiceCaptureSession,
    chunk: AudioChunk,
    context: FeatureFlagContext
  ): Promise<void> {
    try {
      // In shadow mode, we simulate transcription
      console.log(`[SHADOW MODE] Processing real-time transcription for chunk ${chunk.id}`)
      
      // This would integrate with OpenAI Whisper in production
      const mockTranscription = {
        text: `[Mock transcription for chunk ${chunk.sequenceNumber}]`,
        confidence: 0.85,
        language: session.metadata.options.language || 'en',
        duration: chunk.duration
      }

      // Store partial transcription
      if (!session.transcription) {
        session.transcription = mockTranscription
      } else {
        session.transcription.text += ' ' + mockTranscription.text
        session.transcription.confidence = 
          (session.transcription.confidence + mockTranscription.confidence) / 2
      }

    } catch (error) {
      console.error('Failed to process real-time transcription (shadow mode):', error)
    }
  }

  /**
   * Start full transcription process
   */
  private async startTranscription(
    session: VoiceCaptureSession,
    context: FeatureFlagContext
  ): Promise<void> {
    try {
      console.log(`[SHADOW MODE] Starting transcription for session ${session.id}`)
      
      // Simulate transcription process
      setTimeout(async () => {
        const mockTranscription: TranscriptionResult = {
          text: `[Mock full transcription for session ${session.id}. Total chunks: ${session.audioChunks.length}]`,
          confidence: 0.92,
          language: session.metadata.options.language || 'en',
          duration: session.duration,
          words: session.audioChunks.map((chunk, index) => ({
            word: `word${index}`,
            start: index * 100,
            end: (index + 1) * 100,
            confidence: 0.9
          }))
        }

        session.transcription = mockTranscription
        session.status = 'completed'

        // Update database with transcription
        await this.updateSessionTranscription(session.id, mockTranscription, context)
        await this.updateSessionStatus(session.id, 'completed', context)

        // Remove from active sessions
        this.activeSessions.delete(session.id)

        // Emit transcription completed event
        await this.emitSessionEvent('voice_transcription_completed', session, context)

      }, 2000) // Simulate 2 second transcription time

    } catch (error) {
      console.error('Failed to start transcription (shadow mode):', error)
      session.status = 'failed'
      await this.updateSessionStatus(session.id, 'failed', context)
    }
  }

  /**
   * Update session transcription in database
   */
  private async updateSessionTranscription(
    sessionId: string,
    transcription: TranscriptionResult,
    context: FeatureFlagContext
  ): Promise<void> {
    try {
      await this.voiceSessionsAdapter.update(sessionId, {
        transcript: transcription.text,
        transcript_confidence: transcription.confidence,
        transcription_status: 'completed',
        transcribed_at: new Date(),
        transcription_model: 'whisper-shadow-mock'
      })
    } catch (error) {
      console.error('Failed to update session transcription (shadow mode):', error)
    }
  }

  /**
   * Get database session
   */
  private async getDatabaseSession(
    sessionId: string,
    context: FeatureFlagContext
  ): Promise<VoiceCaptureSession | null> {
    try {
      const dbSession = await this.voiceSessionsAdapter.findById(sessionId)
      if (!dbSession) return null

      return {
        id: dbSession.id,
        userId: dbSession.user_id,
        organizationId: dbSession.organization_id,
        status: dbSession.status as any,
        startedAt: dbSession.started_at,
        endedAt: dbSession.ended_at,
        duration: dbSession.ended_at 
          ? Math.floor((dbSession.ended_at.getTime() - dbSession.started_at.getTime()) / 1000)
          : 0,
        audioChunks: [], // Would load from voice_audio_chunks in production
        transcription: dbSession.transcript ? {
          text: dbSession.transcript,
          confidence: dbSession.transcript_confidence || 0,
          language: dbSession.language,
          duration: 0
        } : undefined,
        metadata: dbSession.metadata
      }
    } catch (error) {
      console.error('Failed to get database session:', error)
      return null
    }
  }

  /**
   * Emit session-related events
   */
  private async emitSessionEvent(
    eventType: string,
    session: VoiceCaptureSession,
    context: FeatureFlagContext
  ): Promise<void> {
    try {
      const event = EventBuilder.voiceSessionStarted(
        session.organizationId,
        session.id,
        context.userId
      )

      console.log(`[SHADOW MODE] Event emitted:`, eventType, event.build())
    } catch (error) {
      console.error('Failed to emit session event:', error)
    }
  }

  /**
   * Emit chunk-related events
   */
  private async emitChunkEvent(
    eventType: string,
    chunk: AudioChunk,
    session: VoiceCaptureSession,
    context: FeatureFlagContext
  ): Promise<void> {
    try {
      const event = EventBuilder.voiceTranscriptReady(
        session.organizationId,
        session.id,
        context.userId,
        `Chunk event: ${eventType} for chunk ${chunk.id}`
      )

      console.log(`[SHADOW MODE] Chunk event emitted:`, eventType, event.build())
    } catch (error) {
      console.error('Failed to emit chunk event:', error)
    }
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.activeSessions.size
  }

  /**
   * Cleanup old sessions
   */
  cleanup(): void {
    const now = Date.now()
    const timeoutMs = 30 * 60 * 1000 // 30 minutes

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const sessionAge = now - session.startedAt.getTime()
      if (sessionAge > timeoutMs) {
        console.log(`Cleaning up stale session: ${sessionId}`)
        this.activeSessions.delete(sessionId)
      }
    }
  }
}

/**
 * Export singleton instance
 */
export const voiceCaptureService = new VoiceCaptureService()

/**
 * Convenience functions
 */
export async function initializeVoiceCapture(
  context: FeatureFlagContext,
  options?: VoiceCaptureOptions
): Promise<VoiceCaptureSession> {
  return voiceCaptureService.initializeSession(context, options)
}

export async function startVoiceRecording(
  sessionId: string,
  context: FeatureFlagContext
): Promise<void> {
  return voiceCaptureService.startRecording(sessionId, context)
}

export async function processVoiceChunk(
  sessionId: string,
  audioData: ArrayBuffer,
  context: FeatureFlagContext,
  metadata?: {
    duration?: number
    sampleRate?: number
    format?: string
  }
): Promise<void> {
  return voiceCaptureService.processAudioChunk(sessionId, audioData, context, metadata)
}

export async function stopVoiceRecording(
  sessionId: string,
  context: FeatureFlagContext
): Promise<void> {
  return voiceCaptureService.stopRecording(sessionId, context)
}
