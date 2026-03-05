import type { CoFounderModeConfigV1 } from '@/lib/cofounder-mode/types'

export interface ScanCandidate {
  id: string
  title: string
  impact: number
  confidence: number
  effort: number
  urgency: number
}

export interface RankedScanCandidate extends ScanCandidate {
  score: number
}

export function rankScanCandidates(
  candidates: ScanCandidate[],
  config: CoFounderModeConfigV1
): RankedScanCandidate[] {
  const factors = config.proactiveScanning.rankingFactors

  return candidates
    .map((candidate) => {
      const normalizedEffort = 1 - Math.max(0, Math.min(1, candidate.effort))
      const score =
        (candidate.impact * factors.impactWeight) +
        (candidate.confidence * factors.confidenceWeight) +
        (normalizedEffort * factors.effortWeight) +
        (candidate.urgency * factors.urgencyWeight)

      return {
        ...candidate,
        score,
      }
    })
    .sort((a, b) => b.score - a.score)
}

export function describeScanningCadence(config: CoFounderModeConfigV1): string {
  const cadence = config.proactiveScanning.cadences
  return `trends:${cadence.trends};opportunities:${cadence.opportunities};experiments:${cadence.experiments}`
}
