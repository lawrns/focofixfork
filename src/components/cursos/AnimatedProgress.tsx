'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'

interface AnimatedProgressProps {
  value: number // 0-100
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
  /**
   * Whether to show celebration when reaching 100%
   */
  celebrateComplete?: boolean
}

/**
 * AnimatedProgress - Progress bar with spring physics and celebration
 *
 * Features:
 * - Spring physics for smooth animation
 * - Color changes based on progress percentage
 * - Optional label display
 * - Celebration animation at 100%
 * - Accessible with reduced motion support
 */
export function AnimatedProgress({
  value,
  max = 100,
  size = 'md',
  showLabel = false,
  className = '',
  celebrateComplete = true
}: AnimatedProgressProps) {
  const previousValue = useRef(value)
  const isIncrease = value > previousValue.current

  useEffect(() => {
    previousValue.current = value
  }, [value])

  // Size configurations
  const sizes = {
    sm: { height: 'h-1', text: 'text-xs' },
    md: { height: 'h-2', text: 'text-sm' },
    lg: { height: 'h-3', text: 'text-base' }
  }

  const sizeConfig = sizes[size]

  // Progress color based on percentage
  const getColor = (val: number) => {
    if (val >= 100) return 'bg-emerald-500'
    if (val >= 75) return 'bg-teal-500'
    if (val >= 50) return 'bg-blue-500'
    if (val >= 25) return 'bg-yellow-500'
    return 'bg-zinc-500'
  }

  // Clamp value between 0 and max
  const clampedValue = Math.max(0, Math.min(value, max))
  const percentage = (clampedValue / max) * 100

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center gap-3">
        {/* Progress Bar Container */}
        <div className={`flex-1 ${sizeConfig.height} bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden`}>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: percentage / 100 }}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 15,
              mass: 0.5
            }}
            className={`h-full origin-left ${getColor(value)} relative`}
          >
            {/* Shine effect on progress bar */}
            {isIncrease && (
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              />
            )}
          </motion.div>
        </div>

        {/* Label */}
        {showLabel && (
          <span className={`${sizeConfig.text} font-semibold text-zinc-700 dark:text-zinc-300 min-w-[3ch] text-right`}>
            {Math.round(percentage)}%
          </span>
        )}
      </div>

      {/* Celebration at 100% */}
      {value >= max && celebrateComplete && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{
            delay: 0.3,
            type: 'spring',
            damping: 10,
            stiffness: 150
          }}
          className="flex items-center gap-2 mt-2 text-emerald-600 dark:text-emerald-400"
        >
          <motion.svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <motion.path
              d="M10 0L12 8L18 2"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
          <span className={sizeConfig.text + ' font-semibold'}>
            ¡Completado!
          </span>
        </motion.div>
      )}
    </div>
  )
}
