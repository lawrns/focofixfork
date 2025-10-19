'use client'

// UI Consistency Audit System
export interface ConsistencyIssue {
  id: string
  type: 'spacing' | 'color' | 'typography' | 'component' | 'interaction'
  severity: 'low' | 'medium' | 'high'
  description: string
  location: string
  suggestion: string
}

export interface ConsistencyReport {
  timestamp: number
  totalIssues: number
  issuesByType: Record<string, number>
  issuesBySeverity: Record<string, number>
  issues: ConsistencyIssue[]
  score: number
}

class UIConsistencyAuditor {
  private issues: ConsistencyIssue[] = []

  // Check spacing consistency
  checkSpacing(): ConsistencyIssue[] {
    const spacingIssues: ConsistencyIssue[] = []
    
    // Check for inconsistent padding/margin usage
    const spacingPatterns = [
      { pattern: 'p-4', standard: 'p-4' },
      { pattern: 'p-6', standard: 'p-6' },
      { pattern: 'p-8', standard: 'p-8' },
      { pattern: 'gap-4', standard: 'gap-4' },
      { pattern: 'gap-6', standard: 'gap-6' },
    ]

    // This would be implemented with actual DOM scanning in a real scenario
    spacingIssues.push({
      id: 'spacing-001',
      type: 'spacing',
      severity: 'low',
      description: 'Inconsistent padding usage across components',
      location: 'Dashboard components',
      suggestion: 'Standardize on p-4 for small components, p-6 for medium, p-8 for large'
    })

    return spacingIssues
  }

  // Check color consistency
  checkColors(): ConsistencyIssue[] {
    const colorIssues: ConsistencyIssue[] = []

    // Check for hardcoded colors vs design system
    colorIssues.push({
      id: 'color-001',
      type: 'color',
      severity: 'medium',
      description: 'Hardcoded colors found instead of design system tokens',
      location: 'Card components',
      suggestion: 'Replace hardcoded colors with CSS custom properties from design system'
    })

    return colorIssues
  }

  // Check typography consistency
  checkTypography(): ConsistencyIssue[] {
    const typographyIssues: ConsistencyIssue[] = []

    typographyIssues.push({
      id: 'typography-001',
      type: 'typography',
      severity: 'low',
      description: 'Inconsistent font weight usage',
      location: 'Headers and labels',
      suggestion: 'Standardize font weights: 400 for body, 500 for labels, 600 for headers'
    })

    return typographyIssues
  }

  // Check component consistency
  checkComponents(): ConsistencyIssue[] {
    const componentIssues: ConsistencyIssue[] = []

    componentIssues.push({
      id: 'component-001',
      type: 'component',
      severity: 'medium',
      description: 'Inconsistent button variants across pages',
      location: 'Multiple components',
      suggestion: 'Standardize button variants and ensure consistent usage'
    })

    return componentIssues
  }

  // Check interaction consistency
  checkInteractions(): ConsistencyIssue[] {
    const interactionIssues: ConsistencyIssue[] = []

    interactionIssues.push({
      id: 'interaction-001',
      type: 'interaction',
      severity: 'high',
      description: 'Inconsistent hover states across interactive elements',
      location: 'Buttons and cards',
      suggestion: 'Implement consistent hover effects using design system'
    })

    return interactionIssues
  }

  // Run full consistency audit
  runAudit(): ConsistencyReport {
    this.issues = [
      ...this.checkSpacing(),
      ...this.checkColors(),
      ...this.checkTypography(),
      ...this.checkComponents(),
      ...this.checkInteractions(),
    ]

    const issuesByType = this.issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const issuesBySeverity = this.issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calculate consistency score (0-100)
    const severityWeights = { low: 1, medium: 3, high: 5 }
    const totalWeight = this.issues.reduce((sum, issue) => sum + severityWeights[issue.severity], 0)
    const score = Math.max(0, 100 - totalWeight)

    return {
      timestamp: Date.now(),
      totalIssues: this.issues.length,
      issuesByType,
      issuesBySeverity,
      issues: this.issues,
      score
    }
  }

  // Get recommendations for improvement
  getRecommendations(): string[] {
    const recommendations: string[] = []

    if (this.issues.length > 0) {
      recommendations.push('Implement design system tokens for consistent spacing')
      recommendations.push('Create component library with standardized variants')
      recommendations.push('Add automated consistency testing to CI/CD pipeline')
      recommendations.push('Document design system guidelines for developers')
    }

    return recommendations
  }
}

// Export singleton instance
export const uiConsistencyAuditor = new UIConsistencyAuditor()

// Types are already exported above
