// Delegation engine — re-exports from active implementation
// delegation-engine.ts was removed (called non-existent /api/dispatch endpoint)
// The active engine is engine.ts (processDelegationTick)

export { processDelegationTick } from './engine'
export type { DelegationTickResult } from './engine'
