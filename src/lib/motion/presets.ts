import type { Transition } from 'framer-motion'
import { MOTION_DURATIONS, MOTION_EASINGS, MOTION_SPRINGS } from './tokens'

export const motionPresets = {
  panel: MOTION_SPRINGS.panel,
  chip: MOTION_SPRINGS.chip,
  listReorder: MOTION_SPRINGS.listReorder,
  fadeFast: {
    duration: MOTION_DURATIONS.fast,
    ease: MOTION_EASINGS.standard,
  } as Transition,
  fadeNormal: {
    duration: MOTION_DURATIONS.normal,
    ease: MOTION_EASINGS.standard,
  } as Transition,
}
