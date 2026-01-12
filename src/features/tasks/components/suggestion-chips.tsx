'use client'

import { Button } from '@/components/ui/button'
import { X, RotateCcw } from 'lucide-react'
import { Loader2 } from 'lucide-react'

interface SuggestionChipsProps {
  suggestions: string[]
  isLoading?: boolean
  error?: string | null
  onSelectSuggestion: (suggestion: string) => void
  onRegenerate?: () => void
  onClose: () => void
}

export function SuggestionChips({
  suggestions,
  isLoading = false,
  error = null,
  onSelectSuggestion,
  onRegenerate,
  onClose,
}: SuggestionChipsProps) {
  if (error) {
    return (
      <div className="space-y-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        {onRegenerate && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRegenerate}
            className="text-xs"
          >
            Try Again
          </Button>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400 mr-2" />
        <span className="text-sm text-blue-700 dark:text-blue-300">
          Generating suggestions...
        </span>
      </div>
    )
  }

  if (!suggestions || suggestions.length === 0) {
    return null
  }

  return (
    <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
          Suggested titles
        </p>
        <button
          onClick={onClose}
          className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          aria-label="Close suggestions"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={`${suggestion}-${index}`}
            data-testid="suggestion-chip"
            onClick={() => {
              onSelectSuggestion(suggestion)
              onClose()
            }}
            className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-slate-800 text-sm font-medium text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-full hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {onRegenerate && (
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
        >
          <RotateCcw className="h-3 w-3" />
          Regenerate
        </button>
      )}
    </div>
  )
}
