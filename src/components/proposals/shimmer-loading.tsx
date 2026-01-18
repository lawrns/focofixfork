'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { forwardRef, useMemo } from 'react'
import {
  shimmerVariants,
  skeletonShimmerVariants,
  shimmerGradientStyle,
  shimmerGradientStyleDark,
} from '@/lib/animations/proposal-animations'
import { cn } from '@/lib/utils'

export interface ShimmerLoadingProps {
  /** Width of the shimmer element */
  width?: string | number
  /** Height of the shimmer element */
  height?: string | number
  /** Border radius */
  borderRadius?: string | number
  /** Additional CSS classes */
  className?: string
  /** Whether this is an AI processing indicator */
  isAI?: boolean
  /** Custom shimmer color */
  shimmerColor?: string
}

/**
 * AI processing shimmer effect component
 * Respects prefers-reduced-motion
 */
export const ShimmerLoading = forwardRef<HTMLDivElement, ShimmerLoadingProps>(
  function ShimmerLoading(
    {
      width = '100%',
      height = 16,
      borderRadius = 4,
      className,
      isAI = false,
      shimmerColor,
    },
    ref
  ) {
    const prefersReducedMotion = useReducedMotion()

    const shimmerStyle = useMemo(() => {
      if (shimmerColor) {
        return {
          background: `linear-gradient(90deg, transparent 0%, ${shimmerColor} 50%, transparent 100%)`,
          backgroundSize: '200% 100%',
        }
      }
      return shimmerGradientStyle
    }, [shimmerColor])

    if (prefersReducedMotion) {
      return (
        <div
          ref={ref}
          className={cn('bg-muted animate-pulse', className)}
          style={{
            width: typeof width === 'number' ? `${width}px` : width,
            height: typeof height === 'number' ? `${height}px` : height,
            borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
          }}
          aria-busy="true"
          aria-label={isAI ? 'AI processing' : 'Loading'}
        />
      )
    }

    return (
      <div
        ref={ref}
        className={cn('relative overflow-hidden bg-muted', className)}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
        }}
        aria-busy="true"
        aria-label={isAI ? 'AI processing' : 'Loading'}
      >
        <motion.div
          className="absolute inset-0"
          style={shimmerStyle}
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
        />
        {isAI && (
          <div className="absolute inset-0 flex items-center justify-center">
            <AIIndicator />
          </div>
        )}
      </div>
    )
  }
)

/**
 * Pulsing skeleton loading effect
 */
export function SkeletonPulse({
  width = '100%',
  height = 16,
  borderRadius = 4,
  className,
}: ShimmerLoadingProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      className={cn('bg-muted', className)}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
      }}
      variants={skeletonShimmerVariants}
      initial="initial"
      animate={prefersReducedMotion ? undefined : 'animate'}
      aria-busy="true"
      aria-label="Loading"
    />
  )
}

/**
 * Small AI processing indicator with sparkle effect
 */
function AIIndicator() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      className="flex items-center gap-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary/60"
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 1, 0.4],
                }
          }
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </motion.div>
  )
}

/**
 * Text line skeleton with realistic proportions
 */
export function TextLineSkeleton({
  lines = 3,
  lastLineWidth = '60%',
  className,
  gap = 8,
}: {
  lines?: number
  lastLineWidth?: string | number
  className?: string
  gap?: number
}) {
  return (
    <div className={cn('flex flex-col', className)} style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <ShimmerLoading
          key={i}
          height={14}
          width={i === lines - 1 ? lastLineWidth : '100%'}
          borderRadius={2}
        />
      ))}
    </div>
  )
}

/**
 * Card skeleton for loading states
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 space-y-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <ShimmerLoading width={40} height={40} borderRadius="50%" />
        <div className="flex-1 space-y-2">
          <ShimmerLoading width="60%" height={16} borderRadius={4} />
          <ShimmerLoading width="40%" height={12} borderRadius={2} />
        </div>
      </div>
      <TextLineSkeleton lines={2} />
    </div>
  )
}

/**
 * List item skeleton
 */
export function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 py-2',
        className
      )}
    >
      <ShimmerLoading width={20} height={20} borderRadius={4} />
      <ShimmerLoading width="70%" height={16} borderRadius={4} />
    </div>
  )
}

/**
 * AI Processing overlay with shimmer
 */
export function AIProcessingOverlay({
  message = 'AI is thinking...',
  className,
}: {
  message?: string
  className?: string
}) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      className={cn(
        'absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10',
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {/* Outer glow ring */}
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20"
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 0, 0.3],
                  }
            }
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ width: 48, height: 48 }}
          />
          {/* Inner indicator */}
          <div className="relative w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <AISparkle />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </motion.div>
  )
}

/**
 * Sparkle icon for AI indicators
 */
function AISparkle() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-primary"
      animate={
        prefersReducedMotion
          ? undefined
          : {
              rotate: [0, 180],
              scale: [1, 1.1, 1],
            }
      }
      transition={{
        rotate: { duration: 4, repeat: Infinity, ease: 'linear' },
        scale: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
      }}
    >
      <path
        d="M12 2L13.09 8.26L19 7L14.74 10.91L18 16L12.26 13.09L10 19L9.91 12.74L4 14L8.26 10.09L2 7L8.91 7.91L12 2Z"
        fill="currentColor"
      />
    </motion.svg>
  )
}

/**
 * Inline shimmer for text placeholders
 */
export function InlineShimmer({
  width = 80,
  className,
}: {
  width?: number | string
  className?: string
}) {
  return (
    <ShimmerLoading
      width={width}
      height="1em"
      borderRadius={2}
      className={cn('inline-block align-middle', className)}
    />
  )
}

/**
 * Proposal-specific loading skeleton
 */
export function ProposalItemSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-start gap-4 p-4 rounded-lg border bg-card',
        className
      )}
    >
      <ShimmerLoading width={24} height={24} borderRadius={6} />
      <div className="flex-1 space-y-2">
        <ShimmerLoading width="80%" height={18} borderRadius={4} />
        <ShimmerLoading width="50%" height={14} borderRadius={2} />
      </div>
      <div className="flex items-center gap-2">
        <ShimmerLoading width={32} height={32} borderRadius={6} />
        <ShimmerLoading width={32} height={32} borderRadius={6} />
      </div>
    </div>
  )
}

/**
 * Proposal list loading skeleton
 */
export function ProposalListSkeleton({
  count = 5,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <ProposalItemSkeleton />
        </motion.div>
      ))}
    </div>
  )
}

export default ShimmerLoading
