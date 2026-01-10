/**
 * useVoiceRecognition Hook
 *
 * Provides ambient listening mode with wake phrase detection
 * Uses Web Speech API for browser-native voice recognition
 *
 * Features:
 * - Wake phrase detection ("Hey Foco")
 * - Continuous listening mode
 * - Automatic transcription
 * - Browser compatibility handling
 */

import { useState, useEffect, useRef, useCallback } from 'react'

export interface VoiceRecognitionConfig {
  wakePhrases?: string[]
  continuous?: boolean
  interimResults?: boolean
  language?: string
  autoStart?: boolean
}

export interface VoiceRecognitionState {
  isListening: boolean
  isProcessing: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  confidence: number
  isSupported: boolean
}

export interface VoiceRecognitionControls {
  start: () => void
  stop: () => void
  toggle: () => void
  reset: () => void
}

const DEFAULT_WAKE_PHRASES = ['hey foco', 'ok foco', 'foco']

export function useVoiceRecognition(
  config: VoiceRecognitionConfig = {}
): [VoiceRecognitionState, VoiceRecognitionControls] {
  const {
    wakePhrases = DEFAULT_WAKE_PHRASES,
    continuous = false,
    interimResults = true,
    language = 'en-US',
    autoStart = false,
  } = config

  // Check browser support
  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const [state, setState] = useState<VoiceRecognitionState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    confidence: 0,
    isSupported,
  })

  const recognitionRef = useRef<any>(null)
  const listeningForWakePhraseRef = useRef(true)
  const wakePhraseDetectedTimeRef = useRef<number>(0)

  // Initialize SpeechRecognition
  useEffect(() => {
    if (!isSupported) {
      setState(prev => ({
        ...prev,
        error: 'Speech recognition not supported in this browser',
      }))
      return
    }

    // @ts-ignore - Browser API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.lang = language
    recognition.maxAlternatives = 1

    // Event: Start
    recognition.onstart = () => {
      setState(prev => ({
        ...prev,
        isListening: true,
        error: null,
      }))
    }

    // Event: Result
    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      let finalTranscript = ''
      let maxConfidence = 0

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript
        const confidence = result[0].confidence

        if (result.isFinal) {
          finalTranscript += transcript
          maxConfidence = Math.max(maxConfidence, confidence)
        } else {
          interimTranscript += transcript
        }
      }

      // Wake phrase detection
      if (listeningForWakePhraseRef.current) {
        const combinedText = (finalTranscript + interimTranscript).toLowerCase()
        const detectedWakePhrase = wakePhrases.some(phrase =>
          combinedText.includes(phrase.toLowerCase())
        )

        if (detectedWakePhrase) {
          listeningForWakePhraseRef.current = false
          wakePhraseDetectedTimeRef.current = Date.now()

          setState(prev => ({
            ...prev,
            isProcessing: true,
            transcript: '',
            interimTranscript: 'Wake phrase detected... Listening...',
            confidence: 1.0,
          }))

          // Clear the wake phrase from transcript after brief delay
          setTimeout(() => {
            setState(prev => ({
              ...prev,
              isProcessing: false,
              interimTranscript: '',
            }))
          }, 800)

          return
        }
      }

      // Regular transcription (after wake phrase)
      if (!listeningForWakePhraseRef.current) {
        setState(prev => ({
          ...prev,
          transcript: finalTranscript || prev.transcript,
          interimTranscript,
          confidence: maxConfidence,
        }))
      }
    }

    // Event: Error
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)

      let errorMessage = 'Voice recognition error'
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected'
          break
        case 'audio-capture':
          errorMessage = 'No microphone found'
          break
        case 'not-allowed':
          errorMessage = 'Microphone permission denied'
          break
        case 'network':
          errorMessage = 'Network error'
          break
        default:
          errorMessage = `Error: ${event.error}`
      }

      setState(prev => ({
        ...prev,
        isListening: false,
        isProcessing: false,
        error: errorMessage,
      }))
    }

    // Event: End
    recognition.onend = () => {
      setState(prev => ({
        ...prev,
        isListening: false,
      }))

      // Auto-restart for continuous listening (ambient mode)
      if (continuous && recognitionRef.current) {
        try {
          recognition.start()
        } catch (error) {
          console.error('Failed to restart recognition:', error)
        }
      }
    }

    recognitionRef.current = recognition

    // Auto-start if configured
    if (autoStart) {
      try {
        recognition.start()
      } catch (error) {
        console.error('Failed to auto-start recognition:', error)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    }
  }, [isSupported, continuous, interimResults, language, autoStart, wakePhrases])

  // Controls
  const start = useCallback(() => {
    if (!recognitionRef.current || state.isListening) return

    try {
      listeningForWakePhraseRef.current = continuous
      recognitionRef.current.start()
    } catch (error) {
      console.error('Failed to start recognition:', error)
      setState(prev => ({
        ...prev,
        error: 'Failed to start voice recognition',
      }))
    }
  }, [state.isListening, continuous])

  const stop = useCallback(() => {
    if (!recognitionRef.current || !state.isListening) return

    try {
      recognitionRef.current.stop()
      listeningForWakePhraseRef.current = true
    } catch (error) {
      console.error('Failed to stop recognition:', error)
    }
  }, [state.isListening])

  const toggle = useCallback(() => {
    if (state.isListening) {
      stop()
    } else {
      start()
    }
  }, [state.isListening, start, stop])

  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      error: null,
      confidence: 0,
    }))
    listeningForWakePhraseRef.current = continuous
  }, [continuous])

  return [
    state,
    { start, stop, toggle, reset }
  ]
}

/**
 * Hook for simple voice recording (alternative to continuous listening)
 * Records audio blob for server-side transcription via Whisper API
 */
export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
      setError(null)
    } catch (err: any) {
      console.error('Failed to start recording:', err)
      setError('Microphone permission denied or not available')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  const clearRecording = useCallback(() => {
    setAudioBlob(null)
    chunksRef.current = []
  }, [])

  return {
    isRecording,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    clearRecording,
  }
}
