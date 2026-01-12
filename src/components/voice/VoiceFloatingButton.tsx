/**
 * VoiceFloatingButton Component
 *
 * Floating action button for quick voice capture
 * Always accessible from anywhere in the app
 *
 * Features:
 * - Persistent bottom-right position
 * - Breathing pulse animation when listening
 * - Waveform visualization during recording
 * - Keyboard shortcut support (Cmd/Ctrl + Shift + V)
 */

'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Loader2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVoiceRecorder } from '@/hooks/useVoiceRecognition'
import { voiceService } from '@/lib/services/voice.service'

interface VoiceFloatingButtonProps {
  onTranscriptCapture?: (transcript: string) => void
  onTaskCreated?: (task: any) => void
  className?: string
}

export function VoiceFloatingButton({
  onTranscriptCapture,
  onTaskCreated,
  className,
}: VoiceFloatingButtonProps) {
  const {
    isRecording,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    clearRecording,
  } = useVoiceRecorder()

  const [transcription, setTranscription] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const { user } = useAuth()
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)

  // Process audio when recording stops
  useEffect(() => {
    if (audioBlob && !isProcessing) {
      processAudio(audioBlob)
    }
  }, [audioBlob, isProcessing])

  // Keyboard shortcut: Cmd/Ctrl + Shift + V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v') {
        e.preventDefault()
        if (isRecording) {
          stopRecording()
        } else {
          clearRecording()
          setShowSuccess(false)
          setShowError(false)
          startRecording()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRecording, stopRecording, clearRecording, startRecording])

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      clearRecording()
      setShowSuccess(false)
      setShowError(false)
      startRecording()
    }
  }

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true)

    try {
      // 1. Transcribe audio
      const transcript = await voiceService.transcribe(blob)

      onTranscriptCapture?.(transcript.text)

      // 2. Quick capture: Convert to task
      const result = await voiceService.quickCapture({
        transcript: transcript.text,
        user_id: user?.id || 'anonymous'
      })

      onTaskCreated?.(result.task)

      // Show success
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        clearRecording()
      }, 2000)
    } catch (err) {
      console.error('Voice processing error:', err)
      setShowError(true)
      setTimeout(() => {
        setShowError(false)
        clearRecording()
      }, 3000)
    } finally {
      setIsProcessing(false)
    }
  }

  const getButtonState = () => {
    if (showSuccess) return 'success'
    if (showError || error) return 'error'
    if (isProcessing) return 'processing'
    if (isRecording) return 'recording'
    return 'idle'
  }

  const buttonState = getButtonState()

  const buttonConfig = {
    idle: {
      icon: Mic,
      color: 'bg-emerald-600 hover:bg-emerald-700',
      pulse: false,
    },
    recording: {
      icon: Square,
      color: 'bg-rose-600 hover:bg-rose-700',
      pulse: true,
    },
    processing: {
      icon: Loader2,
      color: 'bg-blue-600',
      pulse: false,
    },
    success: {
      icon: Check,
      color: 'bg-green-600',
      pulse: false,
    },
    error: {
      icon: X,
      color: 'bg-red-600',
      pulse: false,
    },
  }

  const config = buttonConfig[buttonState]
  const Icon = config.icon

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={toggleRecording}
        disabled={isProcessing}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'w-16 h-16 rounded-full shadow-2xl',
          'flex items-center justify-center',
          'transition-all duration-200',
          'focus:outline-none focus:ring-4 focus:ring-emerald-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          config.color,
          className
        )}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <Icon
          className={cn(
            'h-7 w-7 text-white',
            buttonState === 'processing' && 'animate-spin'
          )}
        />

        {/* Breathing pulse effect when recording */}
        <AnimatePresence>
          {config.pulse && (
            <motion.div
              className="absolute inset-0 rounded-full bg-rose-600"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.5, 0, 0.5],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
        </AnimatePresence>
      </motion.button>

      {/* Tooltip with keyboard shortcut */}
      <AnimatePresence>
        {!isRecording && !isProcessing && (
          <motion.div
            className="fixed bottom-24 right-6 z-40"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 1 }}
          >
            <div className="bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
              <div className="font-medium mb-1">Quick Voice Capture</div>
              <div className="flex items-center gap-2 text-slate-300">
                <kbd className="px-2 py-0.5 bg-slate-700 rounded text-[10px] font-mono">
                  ⌘ Shift V
                </kbd>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording indicator with waveform */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            className="fixed bottom-24 right-6 z-40"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <div className="bg-white border border-rose-200 rounded-2xl shadow-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-rose-600 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-slate-700">
                    Recording...
                  </span>
                </div>
              </div>

              {/* Mini waveform */}
              <div className="flex items-end justify-center gap-0.5 h-8 mt-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 rounded-full bg-rose-500"
                    animate={{
                      height: [8, Math.random() * 24 + 8, 8],
                    }}
                    transition={{
                      duration: 0.5,
                      delay: i * 0.05,
                      repeat: Infinity,
                      repeatType: 'reverse',
                    }}
                  />
                ))}
              </div>

              <div className="text-xs text-slate-500 text-center mt-2">
                Click button to stop
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing indicator */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            className="fixed bottom-24 right-6 z-40"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <div className="bg-white border border-blue-200 rounded-2xl shadow-2xl p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <div>
                  <div className="text-sm font-medium text-slate-700">
                    Processing...
                  </div>
                  <div className="text-xs text-slate-500">
                    Creating task from voice
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success indicator */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="fixed bottom-24 right-6 z-40"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl shadow-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                  <Check className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-emerald-900">
                    Task created!
                  </div>
                  <div className="text-xs text-emerald-700">
                    Added to your inbox
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error indicator */}
      <AnimatePresence>
        {(showError || error) && (
          <motion.div
            className="fixed bottom-24 right-6 z-40"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <div className="bg-red-50 border border-red-200 rounded-2xl shadow-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                  <X className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-red-900">
                    Failed to process
                  </div>
                  <div className="text-xs text-red-700">
                    {error || 'Please try again'}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
