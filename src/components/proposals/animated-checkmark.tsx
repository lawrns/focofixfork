'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { forwardRef, useMemo } from 'react'
import { checkmarkDrawVariants, getReducedMotionVariants } from '@/lib/animations/proposal-animations'
import { cn } from '@/lib/utils'

export interface AnimatedCheckmarkProps {
  /** Whether the checkmark is visible/animated */
  isVisible?: boolean
  /** Size of the checkmark in pixels */
  size?: number
  /** Color of the checkmark stroke */
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
 * Animated SVG checkmark with draw animation
 * Respects prefers-reduced-motion
 */
export const AnimatedCheckmark = forwardRef<SVGSVGElement, AnimatedCheckmarkProps>(
  function AnimatedCheckmark(
    {
      isVisible = true,
      size = 24,
      color = 'currentColor',
      strokeWidth = 2,
      className,
      showCircle = false,
      circleColor = 'rgba(34, 197, 94, 0.1)',
      delay = 0,
      onAnimationComplete,
    },
    ref
  ) {
    const prefersReducedMotion = useReducedMotion()

    const variants = useMemo(
      () => getReducedMotionVariants(checkmarkDrawVariants, prefersReducedMotion ?? false),
      [prefersReducedMotion]
    )

    // Calculate viewBox and path for the checkmark
    const viewBoxSize = 24
    const checkmarkPath = 'M4 12.5L9.5 18L20 6'

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
        aria-label="Checkmark"
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

        {/* Checkmark path with draw animation */}
        <motion.path
          d={checkmarkPath}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={variants}
          custom={delay}
          transition={{
            ...(variants.visible as Record<string, unknown>)?.transition as object,
            delay: prefersReducedMotion ? 0 : delay,
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
 * Pre-configured success checkmark with green styling
 */
export function SuccessCheckmark({
  size = 20,
  className,
  ...props
}: Omit<AnimatedCheckmarkProps, 'color' | 'showCircle' | 'circleColor'>) {
  return (
    <AnimatedCheckmark
      size={size}
      color="rgb(34, 197, 94)"
      showCircle
      circleColor="rgba(34, 197, 94, 0.15)"
      className={className}
      {...props}
    />
  )
}

/**
 * Checkmark for list items / tasks
 */
export function TaskCheckmark({
  size = 16,
  checked = false,
  className,
  ...props
}: Omit<AnimatedCheckmarkProps, 'isVisible'> & { checked?: boolean }) {
  return (
    <AnimatedCheckmark
      isVisible={checked}
      size={size}
      color="rgb(34, 197, 94)"
      strokeWidth={2.5}
      className={className}
      {...props}
    />
  )
}

export default AnimatedCheckmark
