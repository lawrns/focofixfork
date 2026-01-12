'use client'

import React, { useEffect } from 'react'
import { AlertTriangle, Clock } from 'lucide-react'

interface RateLimitToastProps {
  isVisible: boolean
  countdown: number
  attempt: number
  onDismiss?: () => void
}

/**
 * Toast component for displaying rate limit feedback
 * Shows countdown timer and retry attempt number
 */
export function RateLimitToast({
  isVisible,
  countdown,
  attempt,
  onDismiss,
}: RateLimitToastProps) {
  const isRetrying = countdown > 0

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 pt-0.5">
            {isRetrying ? (
              <Clock className="h-5 w-5 text-yellow-600 animate-spin" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            )}
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900">
              Too Many Requests
            </h3>

            <p className="text-sm text-yellow-800 mt-1">
              {isRetrying
                ? `Retrying in ${countdown} second${countdown !== 1 ? 's' : ''}...`
                : 'Waiting for rate limit to reset...'}
            </p>

            <p className="text-xs text-yellow-700 mt-2">
              Attempt {attempt} • Please wait
            </p>
          </div>

          {onDismiss && !isRetrying && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 text-yellow-400 hover:text-yellow-600 transition-colors"
              aria-label="Dismiss"
            >
              <span className="text-xl">×</span>
            </button>
          )}
        </div>

        {isRetrying && (
          <div className="mt-3 w-full bg-yellow-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-yellow-600 h-full transition-all duration-1000"
              style={{
                width: `${Math.max(0, (countdown / Math.max(1, countdown)) * 100)}%`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Alert component for displaying rate limit errors
 * Used when retries are exhausted
 */
export function RateLimitAlert({
  message = 'Too many requests. Please try again later.',
  onRetry,
  onDismiss,
}: {
  message?: string
  onRetry?: () => void
  onDismiss?: () => void
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />

        <div className="flex-1">
          <h3 className="font-semibold text-red-900">Rate Limit Exceeded</h3>
          <p className="text-sm text-red-700 mt-1">{message}</p>

          <div className="flex gap-2 mt-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            )}

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-3 py-1.5 bg-red-100 text-red-700 text-sm font-medium rounded hover:bg-red-200 transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Inline feedback for rate limiting
 * Used within forms or page content
 */
export function RateLimitInline({
  countdown,
  isRetrying,
  compact = false,
}: {
  countdown: number
  isRetrying: boolean
  compact?: boolean
}) {
  if (!isRetrying && countdown === 0) {
    return null
  }

  if (compact) {
    return (
      <div className="text-sm text-yellow-700 flex items-center gap-2">
        <Clock className="h-4 w-4 animate-spin" />
        Retrying in {countdown}s...
      </div>
    )
  }

  return (
    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
      Too many requests. Retrying in {countdown} second{countdown !== 1 ? 's' : ''}...
    </div>
  )
}
