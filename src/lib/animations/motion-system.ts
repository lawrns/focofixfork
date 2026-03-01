/**
 * Motion System - Unified Animation Rules
 * 
 * Design Principles:
 * 1. MOTION COMMUNICATES STATE - Every animation has a purpose
 * 2. SUBTLE IS BETTER - Animations should feel natural, not distracting
 * 3. CONSISTENT TIMING - Use the timing scale for all transitions
 * 4. RESPECT REDUCED MOTION - Always check prefers-reduced-motion
 */

import { Variants, Transition } from 'framer-motion'

// ============================================================================
// TIMING SCALE - Use these durations consistently
// ============================================================================

export const TIMING = {
  instant: 0,
  fastest: 0.05,
  fast: 0.15,
  normal: 0.2,
  medium: 0.3,
  slow: 0.4,
  slowest: 0.6,
} as const

// ============================================================================
// EASING CURVES - Consistent easing for all animations
// ============================================================================

export const EASING = {
  standard: [0.4, 0, 0.2, 1],
  decelerate: [0, 0, 0.2, 1],
  accelerate: [0.4, 0, 1, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
  smooth: [0.16, 1, 0.3, 1],
} as const

// ============================================================================
// STAGGER PATTERNS - For lists and groups
// ============================================================================

export const STAGGER = {
  fast: 0.03,
  normal: 0.05,
  slow: 0.08,
} as const

// ============================================================================
// CARD ENTRANCE - Subtle card appearance
// ============================================================================

export const cardEntrance: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: TIMING.normal,
      ease: EASING.smooth,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.98,
    transition: {
      duration: TIMING.fast,
      ease: EASING.accelerate,
    },
  },
}

export const cardContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER.normal,
      delayChildren: 0.05,
    },
  },
}

// ============================================================================
// SWARM DIAGRAM - For agent/delegation visualizations
// ============================================================================

export const swarmNode: Variants = {
  spawn: {
    opacity: 0,
    scale: 0,
    y: 20,
  },
  active: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: TIMING.medium,
      ease: EASING.bounce,
    },
  },
  processing: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  complete: {
    scale: 1,
    transition: {
      duration: TIMING.fast,
      ease: EASING.standard,
    },
  },
  merge: {
    opacity: 0,
    scale: 0.8,
    x: 0,
    y: -10,
    transition: {
      duration: TIMING.normal,
      ease: EASING.accelerate,
    },
  },
}

export const swarmConnector: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        duration: TIMING.medium,
        ease: EASING.smooth,
      },
      opacity: {
        duration: TIMING.fast,
      },
    },
  },
  pulse: {
    opacity: [0.4, 1, 0.4],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// ============================================================================
// PROGRESS VISUALIZATION - Step-by-step progress
// ============================================================================

export const progressStep: Variants = {
  pending: {
    opacity: 0.5,
    scale: 0.95,
  },
  current: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: TIMING.fast,
      ease: EASING.standard,
    },
  },
  completed: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: TIMING.fast,
      ease: EASING.standard,
    },
  },
  error: {
    opacity: 1,
    x: [0, -4, 4, -4, 4, 0],
    transition: {
      duration: TIMING.medium,
      ease: EASING.standard,
    },
  },
}

export const progressBar: Variants = {
  initial: {
    scaleX: 0,
    originX: 0,
  },
  animate: (progress: number) => ({
    scaleX: progress / 100,
    transition: {
      duration: TIMING.normal,
      ease: EASING.smooth,
    },
  }),
}

// ============================================================================
// PAGE TRANSITIONS - Smooth page changes
// ============================================================================

export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: TIMING.slow,
      ease: EASING.smooth,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: {
      duration: TIMING.fast,
      ease: EASING.accelerate,
    },
  },
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function getTransition(
  transition: Transition,
  fallbackDuration: number = 0
): Transition {
  if (prefersReducedMotion()) {
    return { duration: fallbackDuration }
  }
  return transition
}

export function getStaggerDelay(
  index: number,
  baseDelay: number = 0,
  staggerAmount: number = STAGGER.normal
): number {
  return baseDelay + index * staggerAmount
}
