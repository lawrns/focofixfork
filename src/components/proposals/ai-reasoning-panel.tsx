'use client'

import { useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Sparkles, Brain, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface AIReasoningPanelProps {
  reasoning: string
  confidence?: number
  factors?: string[]
  isExpanded?: boolean
  onToggle?: () => void
  className?: string
}

function AIReasoningPanelComponent({
  reasoning,
  confidence,
  factors,
  isExpanded: controlledExpanded,
  onToggle,
  className,
}: AIReasoningPanelProps) {
  const [internalExpanded, setInternalExpanded] = useState(false)

  const isExpanded = controlledExpanded ?? internalExpanded
  const handleToggle = onToggle ?? (() => setInternalExpanded(!internalExpanded))

  return (
    <div className={cn('rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden', className)}>
      {/* Trigger */}
      <Button
        variant="ghost"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 h-auto hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
        aria-expanded={isExpanded}
        aria-controls="ai-reasoning-content"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            AI Reasoning
          </span>
          {confidence !== undefined && (
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              confidence >= 0.8
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : confidence >= 0.5
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
            )}>
              {Math.round(confidence * 100)}% confidence
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        </motion.div>
      </Button>

      {/* Expandable content with smooth height transition */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id="ai-reasoning-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.2 },
            }}
          >
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-zinc-100 dark:border-zinc-800">
              {/* Main reasoning */}
              <div className="flex gap-3">
                <Brain className="h-4 w-4 text-violet-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {reasoning}
                </p>
              </div>

              {/* Contributing factors */}
              {factors && factors.length > 0 && (
                <div className="flex gap-3">
                  <Lightbulb className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
                      Contributing Factors
                    </p>
                    <ul className="space-y-1">
                      {factors.map((factor, index) => (
                        <motion.li
                          key={index}
                          initial={{ x: -8, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2"
                        >
                          <span className="text-violet-400 mt-1.5">-</span>
                          {factor}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const AIReasoningPanel = memo(AIReasoningPanelComponent)
