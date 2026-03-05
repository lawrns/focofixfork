import type { CoFounderLearningEvent, CoFounderLearningRollup } from '@/lib/cofounder-mode/types'

export function aggregateLearningMetrics(events: CoFounderLearningEvent[]): CoFounderLearningRollup {
  if (events.length === 0) {
    return {
      acceptanceRate: 0,
      predictionAccuracy: 0,
      averageMinutesSaved: 0,
      decisionVelocityHours: 0,
      totalDecisions: 0,
    }
  }

  const accepted = events.filter((event) => event.accepted).length
  const predictedCorrect = events.filter((event) => event.predictedCorrect).length

  const totalMinutesSaved = events.reduce((sum, event) => sum + Math.max(0, event.estimatedMinutesSaved), 0)
  const totalCycleHours = events.reduce((sum, event) => sum + Math.max(0, event.cycleHours), 0)

  return {
    acceptanceRate: accepted / events.length,
    predictionAccuracy: predictedCorrect / events.length,
    averageMinutesSaved: totalMinutesSaved / events.length,
    decisionVelocityHours: totalCycleHours / events.length,
    totalDecisions: events.length,
  }
}
