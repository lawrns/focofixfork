'use client'

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useEffect, useState, useRef, useMemo } from 'react'
import { counterUpVariants, counterDownVariants, springConfig } from '@/lib/animations/proposal-animations'
import { cn } from '@/lib/utils'

export interface AnimatedCounterProps {
  /** The value to display */
  value: number
  /** Duration in milliseconds for the count animation (when animating to a new value) */
  duration?: number
  /** Format function for the displayed number */
  format?: (value: number) => string
  /** Additional CSS classes */
  className?: string
  /** Text color class */
  colorClass?: string
  /** Whether to show + prefix for positive changes */
  showPlusSign?: boolean
  /** Whether to animate the number counting up/down smoothly */
  smoothCount?: boolean
  /** Callback when animation completes */
  onAnimationComplete?: () => void
}

/**
 * Animated counter that smoothly transitions between values
 * Respects prefers-reduced-motion
 */
export function AnimatedCounter({
  value,
  duration = 300,
  format = (v) => v.toLocaleString(),
  className,
  colorClass,
  showPlusSign = false,
  smoothCount = false,
  onAnimationComplete,
}: AnimatedCounterProps) {
  const prefersReducedMotion = useReducedMotion()
  const [displayValue, setDisplayValue] = useState(value)
  const [direction, setDirection] = useState<'up' | 'down'>('up')
  const previousValue = useRef(value)
  const animationRef = useRef<number>()

  // Determine animation direction
  useEffect(() => {
    if (value !== previousValue.current) {
      setDirection(value > previousValue.current ? 'up' : 'down')
      previousValue.current = value
    }
  }, [value])

  // Track display value in a ref for animation calculations
  const displayValueRef = useRef(displayValue)
  displayValueRef.current = displayValue

  // Smooth counting animation
  useEffect(() => {
    if (prefersReducedMotion || !smoothCount) {
      setDisplayValue(value)
      return
    }

    const startValue = displayValueRef.current
    const endValue = value
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const currentValue = Math.round(startValue + (endValue - startValue) * easeProgress)

      setDisplayValue(currentValue)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(endValue)
        onAnimationComplete?.()
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [value, duration, prefersReducedMotion, smoothCount, onAnimationComplete])

  const variants = useMemo(
    () => (direction === 'up' ? counterUpVariants : counterDownVariants),
    [direction]
  )

  const formattedValue = format(smoothCount ? displayValue : value)
  const displayString = showPlusSign && value > 0 ? `+${formattedValue}` : formattedValue

  if (prefersReducedMotion) {
    return (
      <span className={cn('tabular-nums', colorClass, className)}>
        {displayString}
      </span>
    )
  }

  return (
    <span className={cn('relative inline-flex overflow-hidden tabular-nums', colorClass, className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          variants={variants}
          initial="enter"
          animate="animate"
          exit="exit"
          onAnimationComplete={onAnimationComplete}
        >
          {displayString}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/**
 * Counter that displays each digit separately with staggered animations
 */
export function AnimatedDigitCounter({
  value,
  className,
  colorClass,
}: Pick<AnimatedCounterProps, 'value' | 'className' | 'colorClass'>) {
  const prefersReducedMotion = useReducedMotion()
  const [digits, setDigits] = useState<string[]>([])
  const prevDigits = useRef<string[]>([])

  useEffect(() => {
    const newDigits = Math.abs(value).toString().split('')
    setDigits(newDigits)
    prevDigits.current = newDigits
  }, [value])

  if (prefersReducedMotion) {
    return (
      <span className={cn('tabular-nums', colorClass, className)}>
        {value < 0 ? '-' : ''}{digits.join('')}
      </span>
    )
  }

  return (
    <span className={cn('inline-flex tabular-nums', colorClass, className)}>
      {value < 0 && <span>-</span>}
      {digits.map((digit, index) => (
        <span key={`${index}-${digit}`} className="relative inline-block overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={`${index}-${digit}-value`}
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { ...springConfig.snappy, delay: index * 0.03 } }}
              exit={{ y: -15, opacity: 0, transition: { duration: 0.15 } }}
              className="inline-block"
            >
              {digit}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  )
}

/**
 * Badge-style counter for notification counts, task counts, etc.
 */
export function CounterBadge({
  value,
  max = 99,
  className,
  variant = 'default',
}: {
  value: number
  max?: number
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'error'
}) {
  const prefersReducedMotion = useReducedMotion()

  const variantClasses = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-500/10 text-green-600',
    warning: 'bg-amber-500/10 text-amber-600',
    error: 'bg-red-500/10 text-red-600',
  }

  const displayValue = value > max ? `${max}+` : value.toString()

  return (
    <motion.span
      className={cn(
        'inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 text-xs font-medium rounded-full',
        variantClasses[variant],
        className
      )}
      initial={prefersReducedMotion ? false : { scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={springConfig.snappy}
    >
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={prefersReducedMotion ? false : { y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {displayValue}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  )
}

/**
 * Percentage counter with optional progress ring
 */
export function PercentageCounter({
  value,
  className,
  showRing = false,
  size = 'default',
}: {
  value: number
  className?: string
  showRing?: boolean
  size?: 'sm' | 'default' | 'lg'
}) {
  const prefersReducedMotion = useReducedMotion()
  const clampedValue = Math.max(0, Math.min(100, value))

  const sizeClasses = {
    sm: 'text-sm',
    default: 'text-base',
    lg: 'text-lg',
  }

  const ringSize = {
    sm: 24,
    default: 32,
    lg: 40,
  }

  const ringStroke = {
    sm: 2,
    default: 3,
    lg: 4,
  }

  const radius = (ringSize[size] - ringStroke[size]) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference

  return (
    <span className={cn('inline-flex items-center gap-2', sizeClasses[size], className)}>
      {showRing && (
        <svg
          width={ringSize[size]}
          height={ringSize[size]}
          className="transform -rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={ringSize[size] / 2}
            cy={ringSize[size] / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={ringStroke[size]}
            className="opacity-10"
          />
          {/* Progress ring */}
          <motion.circle
            cx={ringSize[size] / 2}
            cy={ringSize[size] / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={ringStroke[size]}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.5, ease: 'easeOut' }
            }
            className="text-primary"
          />
        </svg>
      )}
      <AnimatedCounter
        value={clampedValue}
        format={(v) => `${v}%`}
        smoothCount
        duration={prefersReducedMotion ? 0 : 500}
      />
    </span>
  )
}

export default AnimatedCounter
