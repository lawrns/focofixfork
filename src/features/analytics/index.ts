// Analytics Feature Module Public API
// This file exports all public interfaces for the analytics feature

// Components
export { AnalyticsDashboard } from './components/analytics-dashboard'

// Hooks
export { useAnalytics } from './hooks/useAnalytics'

// Services
export { analyticsService } from './services/analyticsService'

// Types
export type {
  AnalyticsData,
  ProjectAnalytics,
  TaskAnalytics,
  TeamAnalytics,
  TimeTrackingAnalytics,
  AnalyticsFilters,
  DateRange
} from './types'
