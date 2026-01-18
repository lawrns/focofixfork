'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { forwardRef, useMemo } from 'react'
import { xMarkDrawVariants, getReducedMotionVariants } from '@/lib/animations/proposal-animations'
import { cn } from '@/lib/utils'

export interface AnimatedXProps {
  /** Whether the X mark is visible/animated */
  isVisible?: boolean
  /** Size of the X mark in pixels */
  size?: number
  /** Color of the X mark stroke */
  color?: string
  /** Stroke width */
  strokeWidth?: number
  /** Additional CSS classes */
  className?: string
  /** Whether to show the circle background */
  showCircle?: boolean
  /** Circle background color (when showCircle is true) */
  circleColor?: string
  /** Animation delay in seconds */
  delay?: number
  /** Callback when animation completes */
  onAnimationComplete?: () => void
}

/**
 * Animated SVG X mark with draw animation
 * Respects prefers-reduced-motion
 */
export const AnimatedX = forwardRef<SVGSVGElement, AnimatedXProps>(
  function AnimatedX(
    {
      isVisible = true,
      size = 24,
      color = 'currentColor',
      strokeWidth = 2,
      className,
      showCircle = false,
      circleColor = 'rgba(239, 68, 68, 0.1)',
      delay = 0,
      onAnimationComplete,
    },
    ref
  ) {
    const prefersReducedMotion = useReducedMotion()

    const variants = useMemo(
      () => getReducedMotionVariants(xMarkDrawVariants, prefersReducedMotion ?? false),
      [prefersReducedMotion]
    )

    // Calculate viewBox for the X mark
    const viewBoxSize = 24
    // X mark paths (two diagonal lines)
    const line1Path = 'M6 6L18 18'
    const line2Path = 'M18 6L6 18'

    return (
      <motion.svg
        ref={ref}
        width={size}
        height={size}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('flex-shrink-0', className)}
        initial="hidden"
        animate={isVisible ? 'visible' : 'hidden'}
        aria-hidden="true"
        role="img"
        aria-label="X mark"
      >
        {/* Optional circle background */}
        {showCircle && (
          <motion.circle
            cx={viewBoxSize / 2}
            cy={viewBoxSize / 2}
            r={viewBoxSize / 2 - 1}
            fill={circleColor}
            initial={{ scale: 0, opacity: 0 }}
            animate={
              isVisible
                ? {
                    scale: 1,
                    opacity: 1,
                    transition: {
                      duration: prefersReducedMotion ? 0 : 0.2,
                      delay: prefersReducedMotion ? 0 : delay,
                    },
                  }
                : { scale: 0, opacity: 0 }
            }
          />
        )}

        {/* First line of X with draw animation */}
        <motion.path
          d={line1Path}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={variants}
          transition={{
            ...(variants.visible as Record<string, unknown>)?.transition as object,
            delay: prefersReducedMotion ? 0 : delay,
          }}
        />

        {/* Second line of X with slightly delayed draw animation */}
        <motion.path
          d={line2Path}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={variants}
          transition={{
            ...(variants.visible as Record<string, unknown>)?.transition as object,
            delay: prefersReducedMotion ? 0 : delay + 0.1,
          }}
          onAnimationComplete={() => {
            if (isVisible && onAnimationComplete) {
              onAnimationComplete()
            }
          }}
        />
      </motion.svg>
    )
  }
)

/**
 * Pre-configured rejection/error X mark with red styling
 */
export function RejectX({
  size = 20,
  className,
  ...props
}: Omit<AnimatedXProps, 'color' | 'showCircle' | 'circleColor'>) {
  return (
    <AnimatedX
      size={size}
      color="rgb(239, 68, 68)"
      showCircle
      circleColor="rgba(239, 68, 68, 0.15)"
      className={className}
      {...props}
    />
  )
}

/**
 * Small X mark for dismissing items / clearing inputs
 */
export function DismissX({
  size = 14,
  className,
  ...props
}: Omit<AnimatedXProps, 'showCircle'>) {
  return (
    <AnimatedX
      size={size}
      color="currentColor"
      strokeWidth={2.5}
      showCircle={false}
      className={cn('text-muted-foreground hover:text-foreground transition-colors', className)}
      {...props}
    />
  )
}

/**
 * Warning X mark with amber styling
 */
export function WarningX({
  size = 20,
  className,
  ...props
}: Omit<AnimatedXProps, 'color' | 'showCircle' | 'circleColor'>) {
  return (
    <AnimatedX
      size={size}
      color="rgb(245, 158, 11)"
      showCircle
      circleColor="rgba(245, 158, 11, 0.15)"
      className={className}
      {...props}
    />
  )
}

export default AnimatedX
