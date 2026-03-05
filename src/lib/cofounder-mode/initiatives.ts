import type { CoFounderInitiativeRecord, CoFounderModeConfigV1 } from '@/lib/cofounder-mode/types'

export interface InitiativeHealth {
  id: string
  title: string
  lane: string
  status: CoFounderInitiativeRecord['status']
  stale: boolean
  idleHours: number
}

export interface InitiativeStartDecision {
  allowed: boolean
  reasons: string[]
}

export function evaluateInitiativeHealth(
  initiatives: CoFounderInitiativeRecord[],
  config: CoFounderModeConfigV1,
  now: Date = new Date()
): InitiativeHealth[] {
  return initiatives.map((initiative) => {
    const updatedAt = new Date(initiative.updatedAt)
    const idleHours = Number.isNaN(updatedAt.getTime())
      ? Number.POSITIVE_INFINITY
      : (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60)

    const stale =
      initiative.status === 'active' &&
      Number.isFinite(idleHours) &&
      idleHours >= config.initiatives.staleThresholdHours

    return {
      id: initiative.id,
      title: initiative.title,
      lane: initiative.lane,
      status: initiative.status,
      stale,
      idleHours,
    }
  })
}

export function canStartInitiative(
  initiatives: CoFounderInitiativeRecord[],
  config: CoFounderModeConfigV1,
  lane: string
): InitiativeStartDecision {
  const reasons: string[] = []
  const active = initiatives.filter((initiative) => initiative.status === 'active')

  if (active.length >= config.initiatives.maxActive) {
    reasons.push('max_active_exceeded')
  }

  const laneLimit = config.initiatives.wipLimits[lane]
  if (typeof laneLimit === 'number') {
    const activeInLane = active.filter((initiative) => initiative.lane === lane).length
    if (activeInLane >= laneLimit) {
      reasons.push('lane_wip_limit_exceeded')
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  }
}
