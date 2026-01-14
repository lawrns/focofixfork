'use client';

/**
 * VoiceInput Component
 * Microphone recording interface with audio visualization
 */

import React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  isRecording: boolean;
  isProcessing: boolean;
  audioLevel: number;
  transcript: string;
  error: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancel: () => void;
  className?: string;
}

export function VoiceInput({
  isRecording,
  isProcessing,
  audioLevel,
  transcript,
  error,
  onStartRecording,
  onStopRecording,
  onCancel,
  className,
}: VoiceInputProps) {
  return (
    <div className={cn('flex flex-col items-center space-y-4', className)}>
      {/* Microphone Button with Audio Visualization */}
      <div className="relative">
        {/* Pulsing rings when recording */}
        {isRecording && (
          <>
            <div
              className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20"
              style={{
                transform: `scale(${1 + audioLevel * 0.5})`,
                transition: 'transform 0.1s ease-out',
              }}
            />
            <div
              className="absolute inset-0 rounded-full bg-red-500 opacity-10"
              style={{
                transform: `scale(${1.2 + audioLevel * 0.3})`,
                transition: 'transform 0.1s ease-out',
              }}
            />
          </>
        )}

        {/* Main Button */}
        <button
          onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={isProcessing}
          className={cn(
            'relative z-10 w-20 h-20 rounded-full flex items-center justify-center',
            'transition-all duration-200 shadow-lg',
            'focus:outline-none focus:ring-4 focus:ring-offset-2',
            isRecording
              ? 'bg-red-500 hover:bg-red-600 focus:ring-red-300 scale-110'
              : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-300',
            isProcessing && 'opacity-50 cursor-not-allowed',
          )}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isProcessing ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </button>
      </div>

      {/* Audio Level Bars */}
      {isRecording && (
        <div className="flex items-center justify-center space-x-1 h-12">
          {Array.from({ length: 20 }).map((_, i) => {
            const barHeight = Math.max(
              4,
              Math.min(48, audioLevel * 200 * (Math.random() * 0.5 + 0.75))
            );
            return (
              <div
                key={i}
                className="w-1 bg-red-500 rounded-full transition-all duration-100"
                style={{
                  height: `${barHeight}px`,
                  opacity: 0.5 + audioLevel * 0.5,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Status Text */}
      <div className="text-center space-y-2 min-h-[60px]">
        {isProcessing && (
          <p className="text-sm text-muted-foreground animate-pulse">
            Processing your command...
          </p>
        )}

        {isRecording && !isProcessing && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-red-500">
              Recording...
            </p>
            <p className="text-xs text-muted-foreground">
              Click the button or press Esc to stop
            </p>
          </div>
        )}

        {!isRecording && !isProcessing && !transcript && !error && (
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Ready to listen
            </p>
            <p className="text-xs text-muted-foreground">
              Click the mic to start recording
            </p>
          </div>
        )}

        {transcript && (
          <div className="max-w-md p-3 bg-muted rounded-lg">
            <p className="text-sm text-foreground">{transcript}</p>
          </div>
        )}

        {error && (
          <div className="max-w-md p-3 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      {/* Cancel Button */}
      {(isRecording || transcript) && (
        <button
          onClick={onCancel}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
