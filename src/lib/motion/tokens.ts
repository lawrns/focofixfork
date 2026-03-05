export const MOTION_DURATIONS = {
  instant: 0,
  fast: 0.16,
  normal: 0.24,
  slow: 0.36,
  emphasis: 0.5,
} as const

export const MOTION_EASINGS = {
  standard: [0.2, 0.8, 0.2, 1],
  enter: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
} as const

export const MOTION_SPRINGS = {
  panel: { type: 'spring', stiffness: 260, damping: 26, mass: 0.9 },
  chip: { type: 'spring', stiffness: 340, damping: 24, mass: 0.7 },
  listReorder: { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 },
} as const

export type MotionDurationKey = keyof typeof MOTION_DURATIONS
