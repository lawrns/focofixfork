/**
 * DeprecationBanner Component
 *
 * In-app notification for deprecated features
 * Shows clear migration path and timeline
 *
 * Part of Foco's Phase 3: Full Transition to Simplified Mode
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, X, Download, ArrowRight, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type DeprecatedFeature =
  | 'gantt'
  | 'custom_fields'
  | 'advanced_table'
  | 'time_tracking'
  | 'goals'
  | 'advanced_filters'
  | 'file_uploads'

interface DeprecationBannerProps {
  feature: DeprecatedFeature
  deprecationDate: string
  onDismiss?: () => void
  onExport?: () => void
  className?: string
}

const FEATURE_INFO: Record<DeprecatedFeature, {
  name: string
  alternative: string
  exportAvailable: boolean
}> = {
  gantt: {
    name: 'Gantt Charts',
    alternative: 'Simple Kanban board + Calendar view',
    exportAvailable: true,
  },
  custom_fields: {
    name: 'Custom Fields',
    alternative: 'AI extracts metadata automatically',
    exportAvailable: true,
  },
  advanced_table: {
    name: 'Advanced Table View',
    alternative: 'Simple List view',
    exportAvailable: false,
  },
  time_tracking: {
    name: 'Time Tracking',
    alternative: 'Focus on task completion',
    exportAvailable: true,
  },
  goals: {
    name: 'Goals',
    alternative: 'Milestones (auto-migrated)',
    exportAvailable: false,
  },
  advanced_filters: {
    name: 'Advanced Filters',
    alternative: 'AI-powered Smart Inbox',
    exportAvailable: false,
  },
  file_uploads: {
    name: 'File Uploads',
    alternative: 'Google Drive/Dropbox integration',
    exportAvailable: true,
  },
}

const DEPRECATION_STORAGE_KEY = 'foco_deprecation_dismissed'

export function DeprecationBanner({
  feature,
  deprecationDate,
  onDismiss,
  onExport,
  className,
}: DeprecationBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const info = FEATURE_INFO[feature]

  useEffect(() => {
    // Check if user has already dismissed this deprecation notice
    const dismissed = localStorage.getItem(`${DEPRECATION_STORAGE_KEY}_${feature}`)
    if (dismissed) {
      setIsDismissed(true)
    } else {
      setIsVisible(true)
    }
  }, [feature])

  const handleDismiss = () => {
    localStorage.setItem(`${DEPRECATION_STORAGE_KEY}_${feature}`, 'true')
    setIsVisible(false)
    onDismiss?.()
  }

  const handleExport = () => {
    onExport?.()
  }

  if (isDismissed || !isVisible) {
    return null
  }

  const daysUntilDeprecation = Math.ceil(
    (new Date(deprecationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn('mb-6', className)}
      >
        <Card className="border-0 shadow-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
          <div className="p-4">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center flex-shrink-0">
                <Info className="h-5 w-5 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                    {info.name} will be discontinued in {daysUntilDeprecation} days
                  </h3>
                  <button
                    onClick={handleDismiss}
                    className="text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 ml-4"
                    aria-label="Dismiss"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                  We&apos;re simplifying Foco to focus on what matters most. <strong>{info.name}</strong> will be removed on{' '}
                  <strong>{new Date(deprecationDate).toLocaleDateString()}</strong>.
                </p>

                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                    <ArrowRight className="h-4 w-4" />
                    <span>
                      Use instead: <strong>{info.alternative}</strong>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {info.exportAvailable && onExport && (
                    <Button
                      size="sm"
                      onClick={handleExport}
                      className="gap-2 bg-amber-700 hover:bg-amber-800"
                    >
                      <Download className="h-4 w-4" />
                      Export Your Data
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open('/help/migration-guide', '_blank')}
                    className="gap-2 border-amber-400 text-amber-800 hover:bg-amber-100"
                  >
                    Migration Guide
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDismiss}
                    className="text-amber-700 hover:text-amber-900"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Hook to check if a feature is deprecated
 */
export function useDeprecationStatus(feature: DeprecatedFeature): {
  isDeprecated: boolean
  daysRemaining: number
  deprecationDate: string
} {
  // TODO: Fetch from configuration or API
  const DEPRECATION_DATES: Record<DeprecatedFeature, string> = {
    gantt: '2026-02-15',
    custom_fields: '2026-02-15',
    advanced_table: '2026-02-15',
    time_tracking: '2026-02-20',
    goals: '2026-02-10', // Earlier - auto-migration to milestones
    advanced_filters: '2026-02-15',
    file_uploads: '2026-02-28', // Later - need integration setup time
  }

  const deprecationDate = DEPRECATION_DATES[feature]
  const daysRemaining = Math.ceil(
    (new Date(deprecationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  return {
    isDeprecated: daysRemaining <= 30, // Show notice 30 days before
    daysRemaining,
    deprecationDate,
  }
}
