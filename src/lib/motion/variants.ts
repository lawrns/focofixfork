import type { Variants } from 'framer-motion'
import { MOTION_DURATIONS, MOTION_EASINGS, MOTION_SPRINGS } from './tokens'

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATIONS.normal,
      ease: MOTION_EASINGS.enter,
    },
  },
  exit: {
    opacity: 0,
    y: 8,
    transition: {
      duration: MOTION_DURATIONS.fast,
      ease: MOTION_EASINGS.exit,
    },
  },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: MOTION_DURATIONS.fast,
      ease: MOTION_EASINGS.enter,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: MOTION_DURATIONS.fast,
      ease: MOTION_EASINGS.exit,
    },
  },
}

export const listItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: MOTION_SPRINGS.listReorder,
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: {
      duration: MOTION_DURATIONS.fast,
      ease: MOTION_EASINGS.exit,
    },
  },
}
