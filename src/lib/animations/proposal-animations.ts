'use client'

/**
 * Intercom/Miro-level micro-animations for proposals
 * Production-quality Framer Motion variants with:
 * - prefers-reduced-motion support
 * - Spring physics where appropriate
 * - Snappy 150-300ms durations
 */

import { Variants, Transition } from 'framer-motion'

// Utility: Check for reduced motion preference (use in components)
export const reducedMotionConfig = {
  transition: { duration: 0 },
  initial: false,
}

// Spring configurations for different interaction types
export const springConfig = {
  snappy: { type: 'spring', stiffness: 400, damping: 25 } as const,
  gentle: { type: 'spring', stiffness: 300, damping: 24 } as const,
  bouncy: { type: 'spring', stiffness: 500, damping: 20 } as const,
} satisfies Record<string, Transition>

// Proposal item state variants
export const proposalItemVariants: Variants = {
  pending: {
    x: 0,
    opacity: 1,
    backgroundColor: 'transparent',
    transition: springConfig.snappy,
  },
  approved: {
    x: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    transition: springConfig.snappy,
  },
  rejected: {
    opacity: 0.4,
    x: 0,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  needsDiscussion: {
    x: 0,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    transition: springConfig.snappy,
  },
}

// List stagger variants for animating lists of items
export const listStaggerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
}

// Individual item enter/exit variants
export const itemEnterVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springConfig.gentle,
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
}

// SVG path draw animation variants (for checkmarks, X marks, etc.)
export const checkmarkDrawVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.3, ease: 'easeOut' },
      opacity: { duration: 0.1 },
    },
  },
}

export const xMarkDrawVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.25, ease: 'easeOut' },
      opacity: { duration: 0.1 },
    },
  },
}

// Animated counter variants
export const counterVariants: Variants = {
  initial: {
    y: 0,
    opacity: 1,
  },
  exit: {
    y: -20,
    opacity: 0,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
  enter: {
    y: 20,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
}

// Counter change direction variants
export const counterUpVariants: Variants = {
  initial: { y: 0, opacity: 1 },
  exit: { y: -15, opacity: 0, transition: { duration: 0.15 } },
  enter: { y: 15, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: springConfig.snappy },
}

export const counterDownVariants: Variants = {
  initial: { y: 0, opacity: 1 },
  exit: { y: 15, opacity: 0, transition: { duration: 0.15 } },
  enter: { y: -15, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: springConfig.snappy },
}

// Subtle attention-grabbing pulse variants
export const pulseVariants: Variants = {
  idle: {
    scale: 1,
    opacity: 1,
  },
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.85, 1],
    transition: {
      duration: 0.6,
      ease: 'easeInOut',
      repeat: 2,
    },
  },
  attention: {
    scale: [1, 1.02, 1],
    boxShadow: [
      '0 0 0 0 rgba(59, 130, 246, 0)',
      '0 0 0 4px rgba(59, 130, 246, 0.3)',
      '0 0 0 0 rgba(59, 130, 246, 0)',
    ],
    transition: {
      duration: 1,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
}

// AI processing shimmer effect variants
export const shimmerVariants: Variants = {
  initial: {
    backgroundPosition: '-200% 0',
  },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      duration: 1.5,
      ease: 'linear',
      repeat: Infinity,
    },
  },
}

// Skeleton loading shimmer (for loading states)
export const skeletonShimmerVariants: Variants = {
  initial: {
    opacity: 0.5,
  },
  animate: {
    opacity: [0.5, 0.8, 0.5],
    transition: {
      duration: 1.5,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
}

// Progress bar variants
export const progressVariants: Variants = {
  initial: {
    scaleX: 0,
    originX: 0,
  },
  animate: (progress: number) => ({
    scaleX: progress / 100,
    transition: springConfig.gentle,
  }),
}

// Modal/overlay backdrop variants
export const backdropVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, delay: 0.1 },
  },
}

// Tooltip variants
export const tooltipVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 4,
    scale: 0.96,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.15, ease: 'easeOut' },
  },
}

// Success celebration variants (subtle confetti-like effect)
export const celebrationVariants: Variants = {
  initial: {
    scale: 0,
    rotate: 0,
    opacity: 0,
  },
  animate: {
    scale: [0, 1.2, 1],
    rotate: [0, 10, 0],
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.34, 1.56, 0.64, 1], // Custom bezier for bounce
    },
  },
}

// Hover lift effect for interactive cards
export const hoverLiftVariants: Variants = {
  rest: {
    y: 0,
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    transition: { duration: 0.2 },
  },
  hover: {
    y: -2,
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    transition: springConfig.snappy,
  },
  tap: {
    y: 0,
    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    transition: { duration: 0.1 },
  },
}

// Utility function to get reduced motion safe variants
export function getReducedMotionVariants(
  variants: Variants,
  prefersReducedMotion: boolean
): Variants {
  if (!prefersReducedMotion) return variants

  // Return instant transitions for reduced motion
  const reducedVariants: Variants = {}
  for (const key in variants) {
    const variant = variants[key]
    if (typeof variant === 'object' && variant !== null) {
      reducedVariants[key] = {
        ...variant,
        transition: { duration: 0 },
      }
    }
  }
  return reducedVariants
}

// CSS styles for shimmer gradient (use with shimmerVariants)
export const shimmerGradientStyle = {
  background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
  backgroundSize: '200% 100%',
}

// Dark mode shimmer gradient
export const shimmerGradientStyleDark = {
  background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
  backgroundSize: '200% 100%',
}
