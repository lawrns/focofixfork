'use client';

/**
 * VoiceFeedback Component
 * Displays visual feedback and progress for voice commands
 */

import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VoiceFeedback as VoiceFeedbackType } from '@/lib/crico/types';

interface VoiceFeedbackProps {
  feedback: VoiceFeedbackType;
  className?: string;
}

export function VoiceFeedback({ feedback, className }: VoiceFeedbackProps) {
  const { type, message, visualData, awaitingResponse } = feedback;

  const getIcon = () => {
    switch (type) {
      case 'completion':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'confirmation':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'clarification':
        return <Info className="w-5 h-5 text-blue-600" />;
      case 'progress':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'completion':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'confirmation':
        return 'bg-yellow-50 border-yellow-200';
      case 'clarification':
        return 'bg-blue-50 border-blue-200';
      case 'progress':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Main feedback message */}
      <div className={cn('p-4 rounded-lg border', getBgColor())}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium">{message}</p>

            {/* Show visual data if available */}
            {visualData && type === 'confirmation' && (
              <div className="mt-2 p-2 bg-white/50 rounded text-xs font-mono">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(visualData, null, 2)}
                </pre>
              </div>
            )}

            {/* Awaiting response indicator */}
            {awaitingResponse && (
              <div className="flex items-center space-x-2 mt-2">
                <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                <p className="text-xs text-muted-foreground">
                  Waiting for your response...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expected responses hint */}
      {feedback.expectedResponses && feedback.expectedResponses.length > 0 && (
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <span>Expected responses:</span>
          <div className="flex space-x-1">
            {feedback.expectedResponses.map((response) => (
              <span
                key={response}
                className="px-2 py-0.5 bg-muted rounded-full font-medium"
              >
                {response}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
