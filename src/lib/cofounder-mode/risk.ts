import type {
  CoFounderModeConfigV1,
  CoFounderRiskSnapshot,
  CoFounderRiskSnapshotInput,
} from '@/lib/cofounder-mode/types'

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function synthesizeRiskSnapshot(
  config: CoFounderModeConfigV1,
  input: CoFounderRiskSnapshotInput
): CoFounderRiskSnapshot {
  const technical = clamp01(input.technical)
  const market = clamp01(input.market)
  const financial = clamp01(input.financial)
  const legal = clamp01(input.legal)

  const domainAverage = (technical + market + financial + legal) / 4

  const mean = domainAverage
  const variance =
    ((technical - mean) ** 2 + (market - mean) ** 2 + (financial - mean) ** 2 + (legal - mean) ** 2) / 4

  const correlationPenalty = Math.sqrt(variance) * config.riskSynthesis.correlationWeight
  const unifiedScore = clamp01(domainAverage + correlationPenalty)

  const thresholds = config.riskSynthesis.thresholds
  let level: CoFounderRiskSnapshot['level'] = 'low'
  if (unifiedScore >= thresholds.critical) {
    level = 'critical'
  } else if (unifiedScore >= thresholds.high) {
    level = 'high'
  } else if (unifiedScore >= thresholds.medium) {
    level = 'medium'
  }

  return {
    domainScores: { technical, market, financial, legal },
    unifiedScore,
    level,
  }
}
