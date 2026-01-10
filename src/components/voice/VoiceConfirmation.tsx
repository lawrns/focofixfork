/**
 * VoiceConfirmation Component
 *
 * Visual confirmation UI for voice-initiated actions
 * Shows what will be executed and allows user to approve/reject
 *
 * Features:
 * - Clear action summary
 * - Confidence indicator
 * - Quick approve/reject
 * - Supports multiple actions at once
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, AlertCircle, CheckCircle2, ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Action } from '@/lib/services/voice.service'

interface VoiceConfirmationProps {
  actions: Action[]
  confidence: number
  transcript?: string
  onConfirm: () => void
  onReject: () => void
  onEdit?: () => void
  isOpen: boolean
}

export function VoiceConfirmation({
  actions,
  confidence,
  transcript,
  onConfirm,
  onReject,
  onEdit,
  isOpen,
}: VoiceConfirmationProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-emerald-600 bg-emerald-100 border-emerald-200'
    if (confidence >= 0.6) return 'text-amber-600 bg-amber-100 border-amber-200'
    return 'text-rose-600 bg-rose-100 border-rose-200'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High confidence'
    if (confidence >= 0.6) return 'Medium confidence'
    return 'Low confidence - please review'
  }

  const getActionIcon = (type: Action['type']) => {
    switch (type) {
      case 'create':
        return <CheckCircle2 className="h-4 w-4" />
      case 'update':
        return <ListChecks className="h-4 w-4" />
      case 'delete':
        return <X className="h-4 w-4" />
      case 'query':
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getActionColor = (type: Action['type']) => {
    switch (type) {
      case 'create':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200'
      case 'update':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      case 'delete':
        return 'text-rose-700 bg-rose-50 border-rose-200'
      case 'query':
        return 'text-amber-700 bg-amber-50 border-amber-200'
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onReject}
      >
        <motion.div
          className="w-full max-w-2xl"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="border-0 shadow-2xl">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-1">
                    Confirm Voice Action
                  </h3>
                  <p className="text-sm text-slate-600">
                    Review and confirm what I understood
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-medium px-3 py-1 border',
                    getConfidenceColor(confidence)
                  )}
                >
                  {getConfidenceLabel(confidence)}
                </Badge>
              </div>

              {/* Transcript */}
              {transcript && (
                <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs font-medium text-slate-500 mb-2">
                    You said:
                  </div>
                  <div className="text-sm text-slate-700 italic">
                    &ldquo;{transcript}&rdquo;
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3 mb-6">
                <div className="text-sm font-medium text-slate-700 mb-3">
                  I will perform {actions.length} action{actions.length !== 1 ? 's' : ''}:
                </div>

                {actions.map((action, index) => (
                  <motion.div
                    key={action.id}
                    className={cn(
                      'p-4 rounded-lg border',
                      getActionColor(action.type)
                    )}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        'border',
                        action.type === 'create' && 'bg-emerald-100 border-emerald-300',
                        action.type === 'update' && 'bg-blue-100 border-blue-300',
                        action.type === 'delete' && 'bg-rose-100 border-rose-300',
                        action.type === 'query' && 'bg-amber-100 border-amber-300'
                      )}>
                        {getActionIcon(action.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs font-mono">
                            {action.type.toUpperCase()}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {action.entity}
                          </Badge>
                        </div>
                        <div className="text-sm font-medium text-slate-800">
                          {action.confirmation_message}
                        </div>

                        {/* Show data preview */}
                        {Object.keys(action.data).length > 0 && (
                          <div className="mt-2 text-xs text-slate-600 font-mono bg-white/50 p-2 rounded border border-slate-200">
                            {Object.entries(action.data).slice(0, 3).map(([key, value]) => (
                              <div key={key}>
                                <span className="text-slate-500">{key}:</span>{' '}
                                <span className="text-slate-700">
                                  {typeof value === 'string' ? value : JSON.stringify(value)}
                                </span>
                              </div>
                            ))}
                            {Object.keys(action.data).length > 3 && (
                              <div className="text-slate-400 mt-1">
                                +{Object.keys(action.data).length - 3} more fields...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Low confidence warning */}
              {confidence < 0.6 && (
                <motion.div
                  className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <div className="font-medium mb-1">Please review carefully</div>
                    <div className="text-amber-700">
                      I&apos;m not completely confident about what you said. Please verify the actions above are correct before proceeding.
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                {onEdit && (
                  <Button
                    variant="outline"
                    onClick={onEdit}
                    className="gap-2"
                  >
                    Edit
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={onReject}
                  className="gap-2 border-slate-300 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>

                <Button
                  onClick={onConfirm}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Check className="h-4 w-4" />
                  Confirm & Execute
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
