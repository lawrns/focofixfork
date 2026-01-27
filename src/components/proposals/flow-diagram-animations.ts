/**
 * Flow Diagram Animation System
 * World-class animations with Linear-like snappy feel
 */

import type { Transition, Variant, Variants } from 'framer-motion'

// ============================================================================
// SPRING PHYSICS CONFIGURATION
// ============================================================================

export const springs = {
  /** Snappy feel for most transitions - Linear-like (critically damped, no overshoot) */
  snappy: { type: 'spring' as const, stiffness: 400, damping: 45, bounce: 0 },
  /** Quick removal animations (critically damped) */
  removal: { type: 'spring' as const, stiffness: 500, damping: 50, bounce: 0 },
  /** Smooth addition animations (minimal overshoot) */
  addition: { type: 'spring' as const, stiffness: 300, damping: 38, bounce: 0 },
  /** Gentle settle for final state */
  settle: { type: 'spring' as const, stiffness: 200, damping: 28, bounce: 0 },
  /** Very fast micro-interactions */
  micro: { type: 'spring' as const, stiffness: 600, damping: 50, bounce: 0 },
}

// ============================================================================
// TIMING CONSTANTS
// ============================================================================

export const timing = {
  /** Prepare phase duration (extended for better anticipation) */
  prepare: 80,
  /** Removal phase duration */
  removal: 100,
  /** Movement phase duration (starts slightly earlier, overlaps with removal end) */
  movement: 200,
  /** Addition phase duration (extended to handle more items with stagger) */
  addition: 250,
  /** Settle phase duration (can overlap with additions) */
  settle: 100,
  /** Stagger between card animations (reduced for tighter grouping) */
  stagger: 35,
  /** Total animation duration */
  total: 700,
}

// ============================================================================
// ANIMATION PHASES
// ============================================================================

export type AnimationPhase =
  | 'idle'
  | 'preparing'
  | 'removing'
  | 'moving'
  | 'adding'
  | 'settling'
  | 'complete'

export const phaseTimings: Record<AnimationPhase, { start: number; end: number }> = {
  idle: { start: 0, end: 0 },
  preparing: { start: 0, end: 80 },
  removing: { start: 80, end: 180 },
  moving: { start: 150, end: 350 }, // Slight overlap with removal for smoother flow
  adding: { start: 320, end: 570 }, // Extended window, slight overlap with movement
  settling: { start: 550, end: 700 }, // Can overlap with additions
  complete: { start: 700, end: 700 },
}

// ============================================================================
// TASK CARD VARIANTS
// ============================================================================

export const taskCardVariants: Variants = {
  // Initial state
  initial: {
    scale: 1,
    opacity: 1,
    x: 0,
    y: 0,
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  },

  // Prepare phase - subtle anticipation
  preparing: {
    scale: 0.98,
    transition: springs.micro,
  },

  // Removal animation
  removing: {
    scale: 0.9,
    opacity: 0,
    filter: 'blur(4px)',
    transition: springs.removal,
  },

  // Adding animation - materialize with glow
  adding: {
    scale: [0.8, 1.02, 1],
    opacity: [0, 1, 1],
    transition: {
      ...springs.addition,
      times: [0, 0.6, 1],
    },
  },

  // Hover state
  hover: {
    y: -2,
    boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1)',
    transition: springs.micro,
  },

  // Selected state
  selected: {
    scale: 1.02,
    boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.15)',
    transition: springs.snappy,
  },

  // Settled state
  settled: {
    scale: 1,
    opacity: 1,
    x: 0,
    y: 0,
    transition: springs.settle,
  },
}

// ============================================================================
// MOVEMENT ANIMATION HELPERS
// ============================================================================

/**
 * Creates a movement animation with arc path
 * Tasks slide horizontally with a slight vertical arc for visual interest
 */
export function createMovementVariant(
  targetX: number,
  _targetY: number = 0
): Variant {
  return {
    x: targetX,
    y: [0, -8, 0], // Arc path: up at midpoint, back to level
    transition: {
      ...springs.snappy,
      y: {
        type: 'tween',
        duration: 0.35,
        ease: [0.34, 1.56, 0.64, 1], // Custom bounce ease
      },
    },
  }
}

// ============================================================================
// GLOW ANIMATIONS
// ============================================================================

export const glowVariants: Variants = {
  add: {
    boxShadow: [
      '0 0 0 0 rgba(16, 185, 129, 0)',
      '0 0 20px 4px rgba(16, 185, 129, 0.4)',
      '0 0 0 0 rgba(16, 185, 129, 0)',
    ],
    transition: {
      duration: 0.6,
      times: [0, 0.3, 1],
    },
  },
  modify: {
    boxShadow: [
      '0 0 0 0 rgba(245, 158, 11, 0)',
      '0 0 20px 4px rgba(245, 158, 11, 0.4)',
      '0 0 0 0 rgba(245, 158, 11, 0)',
    ],
    transition: {
      duration: 0.6,
      times: [0, 0.3, 1],
    },
  },
  remove: {
    boxShadow: [
      '0 0 0 0 rgba(239, 68, 68, 0)',
      '0 0 16px 4px rgba(239, 68, 68, 0.4)',
      '0 0 0 0 rgba(239, 68, 68, 0)',
    ],
    transition: {
      duration: 0.4,
      times: [0, 0.3, 1],
    },
  },
}

// ============================================================================
// STAGGER CONTAINER VARIANTS
// ============================================================================

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: timing.stagger / 1000,
      delayChildren: 0.1,
    },
  },
}

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springs.snappy,
  },
}

// ============================================================================
// SHIMMER EFFECT
// ============================================================================

export const shimmerVariants: Variants = {
  initial: {
    backgroundPosition: '-200% 0',
  },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      duration: 1.5,
      ease: 'linear',
      repeat: 0,
    },
  },
}

// ============================================================================
// BUTTON ANIMATIONS
// ============================================================================

export const buttonVariants: Variants = {
  idle: {
    scale: 1,
  },
  loading: {
    scale: [1, 0.98, 1],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  success: {
    scale: [1, 1.05, 1],
    transition: springs.snappy,
  },
}

// ============================================================================
// SCRUBBER ANIMATIONS
// ============================================================================

export const scrubberHandleVariants: Variants = {
  idle: {
    scale: 1,
  },
  dragging: {
    scale: 1.2,
    transition: springs.micro,
  },
  hover: {
    scale: 1.1,
    transition: springs.micro,
  },
}

// ============================================================================
// INTERPOLATION HELPERS
// ============================================================================

/**
 * Linear interpolation between two values
 */
export function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Get animation progress for a specific phase based on overall progress
 */
export function getPhaseProgress(
  overallProgress: number,
  phase: AnimationPhase
): number {
  const { start, end } = phaseTimings[phase]
  const phaseStart = start / timing.total
  const phaseEnd = end / timing.total

  if (overallProgress < phaseStart) return 0
  if (overallProgress > phaseEnd) return 1

  return (overallProgress - phaseStart) / (phaseEnd - phaseStart)
}

/**
 * Ease function: ease-out-cubic
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Ease function: ease-in-out-cubic
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// ============================================================================
// REDUCED MOTION SUPPORT
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Get transition with reduced motion fallback
 */
export function getTransition(transition: Transition): Transition {
  if (prefersReducedMotion()) {
    return { duration: 0 }
  }
  return transition
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

export const actionColors = {
  add: {
    border: 'rgb(16, 185, 129)', // emerald-500
    bg: 'rgba(16, 185, 129, 0.1)',
    bgDark: 'rgba(16, 185, 129, 0.2)',
  },
  modify: {
    border: 'rgb(245, 158, 11)', // amber-500
    bg: 'rgba(245, 158, 11, 0.1)',
    bgDark: 'rgba(245, 158, 11, 0.2)',
  },
  remove: {
    border: 'rgb(239, 68, 68)', // red-500
    bg: 'rgba(239, 68, 68, 0.1)',
    bgDark: 'rgba(239, 68, 68, 0.2)',
  },
  existing: {
    border: 'rgb(228, 228, 231)', // zinc-200
    bg: 'rgba(255, 255, 255, 1)',
    bgDark: 'rgba(39, 39, 42, 1)', // zinc-800
  },
}

export type ActionType = keyof typeof actionColors
