export interface PerformanceBudget {
  name: string
  description: string
  threshold: number // in milliseconds
  severity: 'warning' | 'error'
  category: 'core-web-vitals' | 'component' | 'api' | 'bundle' | 'custom'
}

export const PERFORMANCE_BUDGETS: PerformanceBudget[] = [
  // Core Web Vitals
  {
    name: 'Largest Contentful Paint (LCP)',
    description: 'Time for the largest content element to render',
    threshold: 2500, // 2.5 seconds
    severity: 'error',
    category: 'core-web-vitals'
  },
  {
    name: 'First Input Delay (FID)',
    description: 'Time from first user interaction to browser response',
    threshold: 100, // 100ms
    severity: 'error',
    category: 'core-web-vitals'
  },
  {
    name: 'Cumulative Layout Shift (CLS)',
    description: 'Visual stability measure',
    threshold: 0.1, // 0.1
    severity: 'error',
    category: 'core-web-vitals'
  },
  {
    name: 'First Contentful Paint (FCP)',
    description: 'Time for first content to render',
    threshold: 1800, // 1.8 seconds
    severity: 'warning',
    category: 'core-web-vitals'
  },
  {
    name: 'Time to Interactive (TTI)',
    description: 'Time until page is fully interactive',
    threshold: 3800, // 3.8 seconds
    severity: 'warning',
    category: 'core-web-vitals'
  },

  // Component Performance
  {
    name: 'Component Render Time',
    description: 'Maximum acceptable component render time',
    threshold: 16, // 16ms (60fps)
    severity: 'warning',
    category: 'component'
  },
  {
    name: 'Heavy Component Render',
    description: 'Maximum acceptable render time for heavy components',
    threshold: 50, // 50ms
    severity: 'error',
    category: 'component'
  },
  {
    name: 'List Virtualization Threshold',
    description: 'Maximum render time before virtualizing lists',
    threshold: 100, // 100ms
    severity: 'warning',
    category: 'component'
  },

  // API Performance
  {
    name: 'API Response Time',
    description: 'Maximum acceptable API response time',
    threshold: 500, // 500ms
    severity: 'warning',
    category: 'api'
  },
  {
    name: 'Critical API Response',
    description: 'Maximum acceptable response time for critical APIs',
    threshold: 200, // 200ms
    severity: 'error',
    category: 'api'
  },
  {
    name: 'Database Query Time',
    description: 'Maximum acceptable database query execution time',
    threshold: 1000, // 1 second
    severity: 'warning',
    category: 'api'
  },

  // Bundle Performance
  {
    name: 'Initial Bundle Size',
    description: 'Maximum acceptable initial bundle size',
    threshold: 500000, // 500KB
    severity: 'warning',
    category: 'bundle'
  },
  {
    name: 'Critical Bundle Size',
    description: 'Maximum acceptable size for critical bundles',
    threshold: 200000, // 200KB
    severity: 'error',
    category: 'bundle'
  },
  {
    name: 'Bundle Load Time',
    description: 'Maximum acceptable bundle load time',
    threshold: 1000, // 1 second
    severity: 'warning',
    category: 'bundle'
  },

  // Custom Performance Metrics
  {
    name: 'Page Load Time',
    description: 'Maximum acceptable page load time',
    threshold: 3000, // 3 seconds
    severity: 'warning',
    category: 'custom'
  },
  {
    name: 'Dashboard Load Time',
    description: 'Maximum acceptable dashboard load time',
    threshold: 2000, // 2 seconds
    severity: 'error',
    category: 'custom'
  },
  {
    name: 'Search Response Time',
    description: 'Maximum acceptable search response time',
    threshold: 300, // 300ms
    severity: 'warning',
    category: 'custom'
  },
  {
    name: 'File Upload Time',
    description: 'Maximum acceptable file upload processing time',
    threshold: 5000, // 5 seconds
    severity: 'warning',
    category: 'custom'
  }
]

// Budget categories for easier filtering
export const BUDGET_CATEGORIES = {
  'core-web-vitals': 'Core Web Vitals',
  'component': 'Component Performance',
  'api': 'API Performance',
  'bundle': 'Bundle Performance',
  'custom': 'Custom Metrics'
} as const

// Severity levels
export const SEVERITY_LEVELS = {
  'warning': 'Warning',
  'error': 'Error'
} as const

// Helper function to get budgets by category
export function getBudgetsByCategory(category: PerformanceBudget['category']): PerformanceBudget[] {
  return PERFORMANCE_BUDGETS.filter(budget => budget.category === category)
}

// Helper function to get budgets by severity
export function getBudgetsBySeverity(severity: PerformanceBudget['severity']): PerformanceBudget[] {
  return PERFORMANCE_BUDGETS.filter(budget => budget.severity === severity)
}

// Helper function to get critical budgets (errors)
export function getCriticalBudgets(): PerformanceBudget[] {
  return getBudgetsBySeverity('error')
}

// Helper function to get warning budgets
export function getWarningBudgets(): PerformanceBudget[] {
  return getBudgetsBySeverity('warning')
}
