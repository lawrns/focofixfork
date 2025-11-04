import { WebSocket } from 'ws'
import { randomUUID } from 'crypto'
import { FeatureFlagsService, FeatureFlagContext } from '../feature-flags/feature-flags'
import { EventBuilder } from '../events/event-envelope'
import { AudioChunk, VoiceCaptureSession } from './capture-service'

/**
 * WebSocket Audio Streaming Service
 * Handles real-time bidirectional audio streaming between client and server
 * Supports chunked audio transmission, real-time transcription, and live feedback
 */

export interface WebSocketConfig {
  url?: string
  protocols?: string[]
  reconnectAttempts?: number
  reconnectDelay?: number
  heartbeatInterval?: number
  chunkSize?: number
  compressionEnabled?: boolean
}

export interface StreamingSession {
  id: string
  userId: string
  organizationId: string
  voiceSessionId: string
  status: 'connecting' | 'connected' | 'streaming' | 'disconnected' | 'error'
  connectedAt?: Date
  lastActivityAt: Date
  bytesReceived: number
  bytesSent: number
  chunksReceived: number
  chunksSent: number
  metadata: Record<string, any>
}

export interface AudioStreamMessage {
  type: 'audio_chunk' | 'transcription' | 'error' | 'status' | 'heartbeat' | 'config'
  sessionId: string
  timestamp: number
  data: any
}

export interface TranscriptionDelta {
  text: string
  confidence: number
  isFinal: boolean
  offset: number
}

/**
 * WebSocket Audio Streaming Service
 */
export class WebSocketAudioService {
  private featureFlags: FeatureFlagsService
  private activeStreams = new Map<string, StreamingSession>()
  private webSocketConnections = new Map<string, WebSocket>()
  private config: WebSocketConfig
  private heartbeatIntervals = new Map<string, NodeJS.Timeout>()

  constructor(config: WebSocketConfig = {}) {
    this.featureFlags = FeatureFlagsService.getInstance()
    this.config = {
      url: config.url || process.env.WEBSOCKET_URL || 'ws://localhost:8080/audio-stream',
      protocols: config.protocols || ['audio-stream-v1'],
      reconnectAttempts: config.reconnectAttempts || 3,
      reconnectDelay: config.reconnectDelay || 1000,
      heartbeatInterval: config.heartbeatInterval || 30000,
      chunkSize: config.chunkSize || 1024 * 8, // 8KB chunks
      compressionEnabled: config.compressionEnabled !== false
    }
  }

  /**
   * Initialize a new streaming session
   */
  async initializeStream(
    voiceSessionId: string,
    context: FeatureFlagContext
  ): Promise<StreamingSession> {
    // Check feature flags
    this.validateFeatureFlags(context)

    const streamId = randomUUID()
    const session: StreamingSession = {
      id: streamId,
      userId: context.userId,
      organizationId: context.organizationId,
      voiceSessionId,
      status: 'connecting',
      lastActivityAt: new Date(),
      bytesReceived: 0,
      bytesSent: 0,
      chunksReceived: 0,
      chunksSent: 0,
      metadata: {
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
        config: this.config,
        timestamp: new Date().toISOString()
      }
    }

    // Store session
    this.activeStreams.set(streamId, session)

    // Create WebSocket connection
    await this.createWebSocketConnection(streamId, context)

    return session
  }

  /**
   * Stream audio chunk to server
   */
  async streamAudioChunk(
    streamId: string,
    audioData: ArrayBuffer,
    metadata?: {
      sequenceNumber?: number
      duration?: number
      sampleRate?: number
      format?: string
    }
  ): Promise<void> {
    const session = this.activeStreams.get(streamId)
    if (!session) {
      throw new Error('Streaming session not found')
    }

    if (session.status !== 'connected' && session.status !== 'streaming') {
      throw new Error('WebSocket is not connected')
    }

    const ws = this.webSocketConnections.get(streamId)
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket connection is not open')
    }

    // Create message
    const message: AudioStreamMessage = {
      type: 'audio_chunk',
      sessionId: streamId,
      timestamp: Date.now(),
      data: {
        audioData: Array.from(new Uint8Array(audioData)),
        sequenceNumber: metadata?.sequenceNumber || session.chunksSent + 1,
        duration: metadata?.duration || 100,
        sampleRate: metadata?.sampleRate || 16000,
        format: metadata?.format || 'webm',
        size: audioData.byteLength
      }
    }

    // Send message
    ws.send(JSON.stringify(message))

    // Update session stats
    session.chunksSent++
    session.bytesSent += audioData.byteLength
    session.lastActivityAt = new Date()
    session.status = 'streaming'

    // Emit chunk sent event
    await this.emitStreamEvent('audio_chunk_sent', session, { 
      chunkSize: audioData.byteLength,
      sequenceNumber: metadata?.sequenceNumber
    })
  }

  /**
   * Start real-time transcription for a stream
   */
  async startRealTimeTranscription(
    streamId: string,
    options: {
      language?: string
      model?: string
      enablePunctuation?: boolean
      enableTimestamps?: boolean
    } = {}
  ): Promise<void> {
    const session = this.activeStreams.get(streamId)
    if (!session) {
      throw new Error('Streaming session not found')
    }

    const ws = this.webSocketConnections.get(streamId)
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket connection is not open')
    }

    const message: AudioStreamMessage = {
      type: 'config',
      sessionId: streamId,
      timestamp: Date.now(),
      data: {
        action: 'start_transcription',
        options: {
          language: options.language || 'en',
          model: options.model || 'whisper-1',
          enablePunctuation: options.enablePunctuation !== false,
          enableTimestamps: options.enableTimestamps !== false
        }
      }
    }

    ws.send(JSON.stringify(message))
  }

  /**
   * Stop real-time transcription
   */
  async stopRealTimeTranscription(streamId: string): Promise<void> {
    const session = this.activeStreams.get(streamId)
    if (!session) {
      throw new Error('Streaming session not found')
    }

    const ws = this.webSocketConnections.get(streamId)
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket connection is not open')
    }

    const message: AudioStreamMessage = {
      type: 'config',
      sessionId: streamId,
      timestamp: Date.now(),
      data: {
        action: 'stop_transcription'
      }
    }

    ws.send(JSON.stringify(message))
  }

  /**
   * Get streaming session status
   */
  getStreamStatus(streamId: string): StreamingSession | null {
    return this.activeStreams.get(streamId) || null
  }

  /**
   * Close streaming session
   */
  async closeStream(streamId: string): Promise<void> {
    const session = this.activeStreams.get(streamId)
    if (!session) {
      return
    }

    // Close WebSocket
    const ws = this.webSocketConnections.get(streamId)
    if (ws) {
      ws.close()
      this.webSocketConnections.delete(streamId)
    }

    // Clear heartbeat
    const heartbeat = this.heartbeatIntervals.get(streamId)
    if (heartbeat) {
      clearInterval(heartbeat)
      this.heartbeatIntervals.delete(streamId)
    }

    // Update session
    session.status = 'disconnected'
    session.lastActivityAt = new Date()

    // Remove from active sessions
    this.activeStreams.delete(streamId)

    // Emit session closed event
    await this.emitStreamEvent('stream_closed', session)
  }

  /**
   * Validate feature flags
   */
  private validateFeatureFlags(context: FeatureFlagContext): void {
    const voiceCaptureEnabled = this.featureFlags.isEnabled('voice_capture_enabled', context)
    const realTimeEnabled = this.featureFlags.isEnabled('voice_capture_real_time_transcription', context)

    if (!voiceCaptureEnabled) {
      throw new Error('Voice capture is not enabled')
    }

    if (!realTimeEnabled) {
      throw new Error('Real-time transcription is not enabled')
    }
  }

  /**
   * Create WebSocket connection
   */
  private async createWebSocketConnection(
    streamId: string,
    context: FeatureFlagContext
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(this.config.url!, this.config.protocols)
        this.webSocketConnections.set(streamId, ws)

        const session = this.activeStreams.get(streamId)!
        
        ws.onopen = () => {
          session.status = 'connected'
          session.connectedAt = new Date()
          session.lastActivityAt = new Date()

          // Start heartbeat
          this.startHeartbeat(streamId)

          // Send initial config
          this.sendInitialConfig(streamId, context)

          // Emit connection established event
          this.emitStreamEvent('stream_connected', session)
          
          resolve()
        }

        ws.onclose = (event) => {
          session.status = 'disconnected'
          session.lastActivityAt = new Date()

          // Clear heartbeat
          const heartbeat = this.heartbeatIntervals.get(streamId)
          if (heartbeat) {
            clearInterval(heartbeat)
            this.heartbeatIntervals.delete(streamId)
          }

          // Emit connection closed event
          this.emitStreamEvent('stream_disconnected', session, {
            code: event.code,
            reason: event.reason
          })

          // Attempt reconnection if not intentionally closed
          if (event.code !== 1000) {
            this.attemptReconnection(streamId, context)
          }
        }

        ws.onerror = (error) => {
          session.status = 'error'
          session.lastActivityAt = new Date()

          // Emit error event
          this.emitStreamEvent('stream_error', session, { error: error.message })

          reject(new Error('WebSocket connection failed'))
        }

      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(streamId: string, data: string): void {
    try {
      const message: AudioStreamMessage = JSON.parse(data)
      const session = this.activeStreams.get(streamId)

      if (!session) {
        return
      }

      session.lastActivityAt = new Date()

      switch (message.type) {
        case 'transcription':
          this.handleTranscriptionMessage(streamId, message.data)
          break
        case 'error':
          this.handleErrorMessage(streamId, message.data)
          break
        case 'status':
          this.handleStatusMessage(streamId, message.data)
          break
        case 'heartbeat':
          // Heartbeat response - no action needed
          break
        default:
          console.warn(`Unknown message type: ${message.type}`)
      }

    } catch (error) {
      console.error('Failed to handle WebSocket message:', error)
    }
  }

  /**
   * Handle transcription messages
   */
  private handleTranscriptionMessage(streamId: string, data: any): void {
    const session = this.activeStreams.get(streamId)
    if (!session) return

    session.bytesReceived += JSON.stringify(data).length

    // Emit transcription event
    this.emitStreamEvent('transcription_received', session, data)

    // In a real implementation, you would update the UI with the transcription
    console.log(`Transcription for stream ${streamId}:`, data.text)
  }

  /**
   * Handle error messages
   */
  private handleErrorMessage(streamId: string, data: any): void {
    const session = this.activeStreams.get(streamId)
    if (!session) return

    // Emit error event
    this.emitStreamEvent('stream_error', session, data)

    console.error(`Stream error for ${streamId}:`, data.message)
  }

  /**
   * Handle status messages
   */
  private handleStatusMessage(streamId: string, data: any): void {
    const session = this.activeStreams.get(streamId)
    if (!session) return

    // Update session status based on message
    if (data.status) {
      session.status = data.status
    }

    // Emit status event
    this.emitStreamEvent('status_updated', session, data)
  }

  /**
   * Send initial configuration
   */
  private sendInitialConfig(streamId: string, context: FeatureFlagContext): void {
    const ws = this.webSocketConnections.get(streamId)
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return
    }

    const message: AudioStreamMessage = {
      type: 'config',
      sessionId: streamId,
      timestamp: Date.now(),
      data: {
        userId: context.userId,
        organizationId: context.organizationId,
        config: this.config,
        features: {
          realTimeTranscription: this.featureFlags.isEnabled('voice_capture_real_time_transcription', context),
          noiseReduction: this.featureFlags.isEnabled('voice_capture_noise_reduction', context),
          multiLanguage: this.featureFlags.isEnabled('voice_capture_multi_language', context)
        }
      }
    }

    ws.send(JSON.stringify(message))
  }

  /**
   * Start heartbeat for connection
   */
  private startHeartbeat(streamId: string): void {
    const heartbeat = setInterval(() => {
      const ws = this.webSocketConnections.get(streamId)
      if (ws && ws.readyState === WebSocket.OPEN) {
        const message: AudioStreamMessage = {
          type: 'heartbeat',
          sessionId: streamId,
          timestamp: Date.now(),
          data: {}
        }
        ws.send(JSON.stringify(message))
      } else {
        // Connection is dead, clear heartbeat
        clearInterval(heartbeat)
        this.heartbeatIntervals.delete(streamId)
      }
    }, this.config.heartbeatInterval)

    this.heartbeatIntervals.set(streamId, heartbeat)
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private async attemptReconnection(streamId: string, context: FeatureFlagContext): Promise<void> {
    const session = this.activeStreams.get(streamId)
    if (!session) return

    let attempts = 0
    const maxAttempts = this.config.reconnectAttempts!

    const reconnect = async () => {
      if (attempts >= maxAttempts) {
        session.status = 'error'
        this.emitStreamEvent('reconnection_failed', session)
        return
      }

      attempts++
      session.status = 'connecting'

      try {
        await new Promise(resolve => setTimeout(resolve, this.config.reconnectDelay))
        await this.createWebSocketConnection(streamId, context)
        this.emitStreamEvent('reconnection_success', session, { attempts })
      } catch (error) {
        console.error(`Reconnection attempt ${attempts} failed:`, error)
        if (attempts < maxAttempts) {
          reconnect()
        } else {
          session.status = 'error'
          this.emitStreamEvent('reconnection_failed', session, { attempts })
        }
      }
    }

    reconnect()
  }

  /**
   * Emit stream events
   */
  private async emitStreamEvent(
    eventType: string,
    session: StreamingSession,
    data?: any
  ): Promise<void> {
    try {
      const event = EventBuilder.voiceTranscriptReady(
        session.organizationId,
        session.id,
        session.userId,
        { eventType, ...data }
      )

      console.log(`[WEBSOCKET] Stream event emitted:`, eventType, event.build())
    } catch (error) {
      console.error('Failed to emit stream event:', error)
    }
  }

  /**
   * Get active streams count
   */
  getActiveStreamsCount(): number {
    return this.activeStreams.size
  }

  /**
   * Get connection stats
   */
  getConnectionStats(): {
    totalStreams: number
    connectedStreams: number
    streamingStreams: number
    totalBytesReceived: number
    totalBytesSent: number
  } {
    const sessions = Array.from(this.activeStreams.values())
    
    return {
      totalStreams: sessions.length,
      connectedStreams: sessions.filter(s => s.status === 'connected').length,
      streamingStreams: sessions.filter(s => s.status === 'streaming').length,
      totalBytesReceived: sessions.reduce((sum, s) => sum + s.bytesReceived, 0),
      totalBytesSent: sessions.reduce((sum, s) => sum + s.bytesSent, 0)
    }
  }

  /**
   * Cleanup all streams
   */
  async cleanup(): Promise<void> {
    const streamIds = Array.from(this.activeStreams.keys())
    
    for (const streamId of streamIds) {
      await this.closeStream(streamId)
    }
  }
}

/**
 * Export singleton instance
 */
export const webSocketAudioService = new WebSocketAudioService()

/**
 * Convenience functions
 */
export async function initializeAudioStream(
  voiceSessionId: string,
  context: FeatureFlagContext
): Promise<StreamingSession> {
  return webSocketAudioService.initializeStream(voiceSessionId, context)
}

export async function streamAudioChunk(
  streamId: string,
  audioData: ArrayBuffer,
  metadata?: {
    sequenceNumber?: number
    duration?: number
    sampleRate?: number
    format?: string
  }
): Promise<void> {
  return webSocketAudioService.streamAudioChunk(streamId, audioData, metadata)
}
