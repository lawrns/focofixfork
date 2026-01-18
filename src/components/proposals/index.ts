export { ProposalList, ProposalCardSkeleton, ProposalListSkeleton, ProposalEmptyState } from './proposal-list'
export { ProposalCard } from './proposal-card'
export { ProposalStatusBadge } from './proposal-status-badge'
export { ProposalItemRow, type ProposalItem } from './proposal-item-row'
export { AIReasoningPanel } from './ai-reasoning-panel'
export { ApprovalButtons, type ApprovalAction } from './approval-buttons'
export { ImpactDashboard, type ImpactDashboardData, type DeadlineImpact } from './impact-dashboard'
export { WorkloadBar, type WorkloadShift } from './workload-bar'
export { ConflictBadge, type ResourceConflict, type ConflictType } from './conflict-badge'
export { RiskIndicator, type RiskLevel } from './risk-indicator'

// Animation components
export {
  AnimatedCheckmark,
  SuccessCheckmark,
  TaskCheckmark,
  type AnimatedCheckmarkProps,
} from './animated-checkmark'

export {
  AnimatedX,
  RejectX,
  DismissX,
  WarningX,
  type AnimatedXProps,
} from './animated-x'

export {
  AnimatedCounter,
  AnimatedDigitCounter,
  CounterBadge,
  PercentageCounter,
  type AnimatedCounterProps,
} from './animated-counter'

export {
  ShimmerLoading,
  SkeletonPulse,
  TextLineSkeleton,
  CardSkeleton,
  ListItemSkeleton,
  AIProcessingOverlay,
  InlineShimmer,
  ProposalItemSkeleton,
  type ShimmerLoadingProps,
} from './shimmer-loading'

// Discussion components
export {
  DiscussionThread,
} from './discussion-thread'

export {
  DiscussionComment,
  type DiscussionCommentData,
  type DiscussionUser,
} from './discussion-comment'

export {
  ResolutionBadge,
  ResolutionIndicator,
} from './resolution-badge'
