/**
 * AIInsights Component
 *
 * Displays contextual AI-powered insights instead of raw analytics
 * Replaces traditional dashboards with actionable intelligence
 *
 * Features:
 * - Primary insight with prominent display
 * - Secondary insights carousel
 * - Severity-based styling (success/warning/critical)
 * - Action buttons for quick response
 * - Real-time updates
 *
 * Part of Foco's Phase 2: Simplified Mode - Replace Analytics with AI
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Zap,
  Users,
  Calendar,
  ArrowRight,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { insightsService, type Insight, type InsightsResponse } from '@/lib/services/insights.service'

interface AIInsightsProps {
  userId: string
  organizationId?: string
  className?: string
}

export function AIInsights({ userId, organizationId, className }: AIInsightsProps) {
  const [insights, setInsights] = useState<InsightsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadInsights()
    // Refresh insights every 5 minutes
    const interval = setInterval(loadInsights, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [userId, organizationId])

  const loadInsights = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await insightsService.getInsights(userId, organizationId)
      setInsights(data)
    } catch (err: any) {
      console.error('Failed to load insights:', err)
      setError(err.message || 'Failed to load insights')
    } finally {
      setIsLoading(false)
    }
  }

  const getInsightIcon = (insight: Insight) => {
    switch (insight.type) {
      case 'velocity':
        return insight.data?.trend === 'up' ? TrendingUp : TrendingDown
      case 'forecast':
        return Calendar
      case 'blocker':
        return AlertCircle
      case 'workload':
        return Users
      default:
        return Zap
    }
  }

  const getSeverityColors = (severity: Insight['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'from-rose-50 to-red-50 dark:from-rose-950 dark:to-red-950',
          border: 'border-rose-200 dark:border-rose-800',
          icon: 'bg-rose-600',
          text: 'text-rose-900 dark:text-rose-100',
          subtext: 'text-rose-800 dark:text-rose-200',
        }
      case 'warning':
        return {
          bg: 'from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950',
          border: 'border-amber-200 dark:border-amber-800',
          icon: 'bg-amber-600',
          text: 'text-amber-900 dark:text-amber-100',
          subtext: 'text-amber-800 dark:text-amber-200',
        }
      case 'success':
        return {
          bg: 'from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950',
          border: 'border-emerald-200 dark:border-emerald-800',
          icon: 'bg-emerald-600',
          text: 'text-emerald-900 dark:text-emerald-100',
          subtext: 'text-emerald-800 dark:text-emerald-200',
        }
      default:
        return {
          bg: 'from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950',
          border: 'border-blue-200 dark:border-blue-800',
          icon: 'bg-blue-600',
          text: 'text-blue-900 dark:text-blue-100',
          subtext: 'text-blue-800 dark:text-blue-200',
        }
    }
  }

  const renderInsight = (insight: Insight, isPrimary = false) => {
    const Icon = getInsightIcon(insight)
    const colors = getSeverityColors(insight.severity)

    return (
      <Card
        className={cn(
          'border-0 shadow-lg overflow-hidden',
          isPrimary ? 'shadow-xl' : ''
        )}
      >
        <CardContent className={cn('p-6', isPrimary ? 'pb-8' : '')}>
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                colors.icon
              )}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h3
                  className={cn(
                    'font-semibold mb-1',
                    isPrimary ? 'text-lg' : 'text-base',
                    colors.text
                  )}
                >
                  {insight.title}
                </h3>

                {/* Trend indicator */}
                {insight.data?.trend && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs gap-1',
                      insight.data.trend === 'up' && 'border-emerald-400 text-emerald-700',
                      insight.data.trend === 'down' && 'border-rose-400 text-rose-700'
                    )}
                  >
                    {insight.data.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : insight.data.trend === 'down' ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : null}
                    {insight.data.change && `${insight.data.change > 0 ? '+' : ''}${insight.data.change}`}
                  </Badge>
                )}
              </div>

              <p className={cn('text-sm', colors.subtext)}>
                {insight.description}
              </p>

              {/* Prediction */}
              {insight.data?.prediction && (
                <p className={cn('text-sm font-medium mt-2', colors.text)}>
                  {insight.data.prediction}
                </p>
              )}

              {/* Actions */}
              {insight.actions && insight.actions.length > 0 && (
                <div className="flex items-center gap-2 mt-4">
                  {insight.actions.map((action) => (
                    <Button
                      key={action.action}
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (action.href) {
                          window.location.href = action.href
                        }
                      }}
                      className="gap-2"
                    >
                      {action.label}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  ))}
                </div>
              )}

              {/* Confidence indicator (subtle) */}
              {!isPrimary && insight.confidence < 0.8 && (
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  AI confidence: {Math.round(insight.confidence * 100)}%
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className={cn('border-0 shadow-lg', className)}>
        <CardContent className="p-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Analyzing your workspace...
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('border-0 shadow-lg', className)}>
        <CardContent className="p-6">
          <div className="flex items-start gap-3 text-amber-600">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium mb-1">Could not load insights</h4>
              <p className="text-sm text-amber-600/80">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadInsights}
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!insights || !insights.primary_insight) {
    return null
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Primary Insight */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'relative overflow-hidden rounded-lg bg-gradient-to-r',
          getSeverityColors(insights.primary_insight.severity).bg
        )}
      >
        {/* Sparkles decoration for primary insight */}
        <div className="absolute top-4 right-4">
          <Sparkles className="h-5 w-5 text-slate-400/30" />
        </div>

        {renderInsight(insights.primary_insight, true)}
      </motion.div>

      {/* Secondary Insights */}
      {insights.secondary_insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {insights.secondary_insights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
              >
                {renderInsight(insight, false)}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Footer note */}
      <div className="text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Insights powered by AI • Updated {new Date(insights.generated_at).toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
}
