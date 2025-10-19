export interface AccessibilityIssue {
  id: string
  type: 'error' | 'warning' | 'info'
  severity: 'critical' | 'high' | 'medium' | 'low'
  element: string
  message: string
  suggestion: string
  wcagLevel: 'A' | 'AA' | 'AAA'
  category: 'keyboard' | 'screen-reader' | 'color-contrast' | 'focus' | 'semantics' | 'aria'
}

export interface AccessibilityAuditResult {
  score: number
  totalIssues: number
  criticalIssues: number
  highIssues: number
  mediumIssues: number
  lowIssues: number
  issues: AccessibilityIssue[]
  recommendations: string[]
  lastAudited: Date
}

export interface AccessibilityAuditOptions {
  includeKeyboardNavigation?: boolean
  includeScreenReader?: boolean
  includeColorContrast?: boolean
  includeFocusManagement?: boolean
  includeSemantics?: boolean
  includeARIA?: boolean
  wcagLevel?: 'A' | 'AA' | 'AAA'
}

class AccessibilityAuditor {
  private issues: AccessibilityIssue[] = []
  private options: AccessibilityAuditOptions

  constructor(options: AccessibilityAuditOptions = {}) {
    this.options = {
      includeKeyboardNavigation: true,
      includeScreenReader: true,
      includeColorContrast: true,
      includeFocusManagement: true,
      includeSemantics: true,
      includeARIA: true,
      wcagLevel: 'AA',
      ...options
    }
  }

  // Run comprehensive accessibility audit
  async runAudit(): Promise<AccessibilityAuditResult> {
    this.issues = []
    
    try {
      // Run different types of audits
      if (this.options.includeKeyboardNavigation) {
        await this.auditKeyboardNavigation()
      }
      
      if (this.options.includeScreenReader) {
        await this.auditScreenReaderSupport()
      }
      
      if (this.options.includeColorContrast) {
        await this.auditColorContrast()
      }
      
      if (this.options.includeFocusManagement) {
        await this.auditFocusManagement()
      }
      
      if (this.options.includeSemantics) {
        await this.auditSemantics()
      }
      
      if (this.options.includeARIA) {
        await this.auditARIA()
      }

      return this.generateReport()
    } catch (error) {
      console.error('Accessibility audit failed:', error)
      return this.generateReport()
    }
  }

  // Audit keyboard navigation
  private async auditKeyboardNavigation(): Promise<void> {
    const elements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]')
    
    elements.forEach((element, index) => {
      const htmlElement = element as HTMLElement
      
      // Check for missing tabindex
      if (!htmlElement.hasAttribute('tabindex') && 
          !['button', 'a', 'input', 'select', 'textarea'].includes(element.tagName.toLowerCase())) {
        this.addIssue({
          id: `keyboard-${index}`,
          type: 'warning',
          severity: 'medium',
          element: element.tagName.toLowerCase(),
          message: 'Element may not be keyboard accessible',
          suggestion: 'Add tabindex="0" or use semantic HTML elements',
          wcagLevel: 'A',
          category: 'keyboard'
        })
      }
      
      // Check for negative tabindex
      const tabIndex = htmlElement.getAttribute('tabindex')
      if (tabIndex && parseInt(tabIndex) < 0) {
        this.addIssue({
          id: `keyboard-negative-${index}`,
          type: 'error',
          severity: 'high',
          element: element.tagName.toLowerCase(),
          message: 'Element has negative tabindex, making it inaccessible',
          suggestion: 'Remove negative tabindex or change to positive value',
          wcagLevel: 'A',
          category: 'keyboard'
        })
      }
      
      // Check for keyboard event handlers
      if (htmlElement.onclick && !htmlElement.onkeydown && !htmlElement.onkeyup) {
        this.addIssue({
          id: `keyboard-handlers-${index}`,
          type: 'warning',
          severity: 'medium',
          element: element.tagName.toLowerCase(),
          message: 'Element has click handler but no keyboard handler',
          suggestion: 'Add onKeyDown handler for Enter and Space keys',
          wcagLevel: 'A',
          category: 'keyboard'
        })
      }
    })
  }

  // Audit screen reader support
  private async auditScreenReaderSupport(): Promise<void> {
    const elements = document.querySelectorAll('img, button, a, input, select, textarea')
    
    elements.forEach((element, index) => {
      const htmlElement = element as HTMLElement
      
      // Check for missing alt text on images
      if (element.tagName.toLowerCase() === 'img') {
        const img = element as HTMLImageElement
        if (!img.alt && !img.getAttribute('aria-label')) {
          this.addIssue({
            id: `screen-reader-img-${index}`,
            type: 'error',
            severity: 'critical',
            element: 'img',
            message: 'Image missing alt text',
            suggestion: 'Add alt attribute or aria-label',
            wcagLevel: 'A',
            category: 'screen-reader'
          })
        }
      }
      
      // Check for missing labels on form elements
      if (['input', 'select', 'textarea'].includes(element.tagName.toLowerCase())) {
        const formElement = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        const id = formElement.id
        const ariaLabel = formElement.getAttribute('aria-label')
        const ariaLabelledBy = formElement.getAttribute('aria-labelledby')
        
        if (!id && !ariaLabel && !ariaLabelledBy) {
          this.addIssue({
            id: `screen-reader-form-${index}`,
            type: 'error',
            severity: 'high',
            element: element.tagName.toLowerCase(),
            message: 'Form element missing label',
            suggestion: 'Add id and associated label, or aria-label',
            wcagLevel: 'A',
            category: 'screen-reader'
          })
        }
      }
      
      // Check for missing accessible names on interactive elements
      if (['button', 'a'].includes(element.tagName.toLowerCase())) {
        const textContent = htmlElement.textContent?.trim()
        const ariaLabel = htmlElement.getAttribute('aria-label')
        const ariaLabelledBy = htmlElement.getAttribute('aria-labelledby')
        
        if (!textContent && !ariaLabel && !ariaLabelledBy) {
          this.addIssue({
            id: `screen-reader-interactive-${index}`,
            type: 'error',
            severity: 'high',
            element: element.tagName.toLowerCase(),
            message: 'Interactive element missing accessible name',
            suggestion: 'Add text content, aria-label, or aria-labelledby',
            wcagLevel: 'A',
            category: 'screen-reader'
          })
        }
      }
    })
  }

  // Audit color contrast
  private async auditColorContrast(): Promise<void> {
    const elements = document.querySelectorAll('*')
    
    elements.forEach((element, index) => {
      const htmlElement = element as HTMLElement
      const computedStyle = window.getComputedStyle(htmlElement)
      
      // Check text elements
      if (htmlElement.textContent && htmlElement.textContent.trim().length > 0) {
        const color = computedStyle.color
        const backgroundColor = computedStyle.backgroundColor
        
        // Basic contrast check (simplified)
        if (color && backgroundColor && color !== backgroundColor) {
          // This is a simplified check - in a real implementation,
          // you'd use a proper contrast ratio calculation
          this.addIssue({
            id: `contrast-${index}`,
            type: 'info',
            severity: 'low',
            element: element.tagName.toLowerCase(),
            message: 'Color contrast should be verified',
            suggestion: 'Ensure contrast ratio meets WCAG AA standards (4.5:1 for normal text)',
            wcagLevel: 'AA',
            category: 'color-contrast'
          })
        }
      }
    })
  }

  // Audit focus management
  private async auditFocusManagement(): Promise<void> {
    const focusableElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]')
    
    focusableElements.forEach((element, index) => {
      const htmlElement = element as HTMLElement
      
      // Check for focus indicators
      const computedStyle = window.getComputedStyle(htmlElement, ':focus')
      const outline = computedStyle.outline
      const outlineWidth = computedStyle.outlineWidth
      
      if (outline === 'none' && outlineWidth === '0px') {
        this.addIssue({
          id: `focus-${index}`,
          type: 'warning',
          severity: 'medium',
          element: element.tagName.toLowerCase(),
          message: 'Element missing visible focus indicator',
          suggestion: 'Add CSS focus styles (outline, box-shadow, etc.)',
          wcagLevel: 'AA',
          category: 'focus'
        })
      }
      
      // Check for focus traps in modals
      if (htmlElement.getAttribute('role') === 'dialog' || 
          htmlElement.classList.contains('modal')) {
        const focusableChildren = htmlElement.querySelectorAll('button, a, input, select, textarea, [tabindex]')
        if (focusableChildren.length === 0) {
          this.addIssue({
            id: `focus-trap-${index}`,
            type: 'error',
            severity: 'high',
            element: 'dialog',
            message: 'Modal dialog missing focusable elements',
            suggestion: 'Add focusable elements and implement focus trap',
            wcagLevel: 'A',
            category: 'focus'
          })
        }
      }
    })
  }

  // Audit semantic HTML
  private async auditSemantics(): Promise<void> {
    const elements = document.querySelectorAll('*')
    
    elements.forEach((element, index) => {
      const htmlElement = element as HTMLElement
      
      // Check for proper heading hierarchy
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(element.tagName.toLowerCase())) {
        const level = parseInt(element.tagName.charAt(1))
        const previousHeading = htmlElement.previousElementSibling?.closest('h1, h2, h3, h4, h5, h6')
        
        if (previousHeading) {
          const prevLevel = parseInt(previousHeading.tagName.charAt(1))
          if (level > prevLevel + 1) {
            this.addIssue({
              id: `semantics-heading-${index}`,
              type: 'warning',
              severity: 'medium',
              element: element.tagName.toLowerCase(),
              message: 'Heading hierarchy skipped levels',
              suggestion: 'Use proper heading hierarchy (h1 -> h2 -> h3, etc.)',
              wcagLevel: 'AA',
              category: 'semantics'
            })
          }
        }
      }
      
      // Check for proper list structure
      if (element.tagName.toLowerCase() === 'li' && !element.closest('ul, ol')) {
        this.addIssue({
          id: `semantics-list-${index}`,
          type: 'error',
          severity: 'high',
          element: 'li',
          message: 'List item not inside proper list container',
          suggestion: 'Wrap list items in ul or ol elements',
          wcagLevel: 'A',
          category: 'semantics'
        })
      }
      
      // Check for proper table structure
      if (element.tagName.toLowerCase() === 'td' && !element.closest('table')) {
        this.addIssue({
          id: `semantics-table-${index}`,
          type: 'error',
          severity: 'high',
          element: 'td',
          message: 'Table cell not inside proper table structure',
          suggestion: 'Use proper table structure with table, thead, tbody, tr elements',
          wcagLevel: 'A',
          category: 'semantics'
        })
      }
    })
  }

  // Audit ARIA attributes
  private async auditARIA(): Promise<void> {
    const elements = document.querySelectorAll('[aria-*]')
    
    elements.forEach((element, index) => {
      const htmlElement = element as HTMLElement
      
      // Check for invalid ARIA attributes
      const ariaAttributes = Array.from(htmlElement.attributes)
        .filter(attr => attr.name.startsWith('aria-'))
      
      ariaAttributes.forEach(attr => {
        // Check for common ARIA mistakes
        if (attr.name === 'aria-label' && !attr.value.trim()) {
          this.addIssue({
            id: `aria-empty-${index}`,
            type: 'error',
            severity: 'high',
            element: element.tagName.toLowerCase(),
            message: 'Empty aria-label attribute',
            suggestion: 'Remove empty aria-label or provide meaningful text',
            wcagLevel: 'A',
            category: 'aria'
          })
        }
        
        if (attr.name === 'aria-labelledby' && !document.getElementById(attr.value)) {
          this.addIssue({
            id: `aria-labelledby-${index}`,
            type: 'error',
            severity: 'high',
            element: element.tagName.toLowerCase(),
            message: 'aria-labelledby references non-existent element',
            suggestion: 'Ensure referenced element exists or use aria-label instead',
            wcagLevel: 'A',
            category: 'aria'
          })
        }
        
        if (attr.name === 'aria-describedby' && !document.getElementById(attr.value)) {
          this.addIssue({
            id: `aria-describedby-${index}`,
            type: 'error',
            severity: 'high',
            element: element.tagName.toLowerCase(),
            message: 'aria-describedby references non-existent element',
            suggestion: 'Ensure referenced element exists or remove attribute',
            wcagLevel: 'A',
            category: 'aria'
          })
        }
      })
      
      // Check for missing ARIA roles on custom elements
      if (['button', 'link', 'menu', 'dialog'].some(role => 
          htmlElement.classList.contains(role) || 
          htmlElement.getAttribute('data-role') === role)) {
        if (!htmlElement.getAttribute('role')) {
          this.addIssue({
            id: `aria-role-${index}`,
            type: 'warning',
            severity: 'medium',
            element: element.tagName.toLowerCase(),
            message: 'Custom element missing ARIA role',
            suggestion: 'Add appropriate role attribute',
            wcagLevel: 'A',
            category: 'aria'
          })
        }
      }
    })
  }

  // Add issue to the list
  private addIssue(issue: AccessibilityIssue): void {
    this.issues.push(issue)
  }

  // Generate audit report
  private generateReport(): AccessibilityAuditResult {
    const criticalIssues = this.issues.filter(issue => issue.severity === 'critical').length
    const highIssues = this.issues.filter(issue => issue.severity === 'high').length
    const mediumIssues = this.issues.filter(issue => issue.severity === 'medium').length
    const lowIssues = this.issues.filter(issue => issue.severity === 'low').length
    
    // Calculate score (100 - penalty points)
    let score = 100
    score -= criticalIssues * 20
    score -= highIssues * 10
    score -= mediumIssues * 5
    score -= lowIssues * 2
    score = Math.max(0, score)
    
    // Generate recommendations
    const recommendations = this.generateRecommendations()
    
    return {
      score,
      totalIssues: this.issues.length,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      issues: this.issues,
      recommendations,
      lastAudited: new Date()
    }
  }

  // Generate recommendations based on issues
  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    
    const criticalIssues = this.issues.filter(issue => issue.severity === 'critical')
    const highIssues = this.issues.filter(issue => issue.severity === 'high')
    
    if (criticalIssues.length > 0) {
      recommendations.push('Fix critical accessibility issues immediately - these prevent users from accessing content')
    }
    
    if (highIssues.length > 0) {
      recommendations.push('Address high-priority accessibility issues to improve user experience')
    }
    
    const keyboardIssues = this.issues.filter(issue => issue.category === 'keyboard')
    if (keyboardIssues.length > 0) {
      recommendations.push('Improve keyboard navigation by adding proper tabindex and keyboard event handlers')
    }
    
    const screenReaderIssues = this.issues.filter(issue => issue.category === 'screen-reader')
    if (screenReaderIssues.length > 0) {
      recommendations.push('Enhance screen reader support with proper labels and alt text')
    }
    
    const focusIssues = this.issues.filter(issue => issue.category === 'focus')
    if (focusIssues.length > 0) {
      recommendations.push('Add visible focus indicators for better keyboard navigation')
    }
    
    const ariaIssues = this.issues.filter(issue => issue.category === 'aria')
    if (ariaIssues.length > 0) {
      recommendations.push('Review and fix ARIA attributes for better assistive technology support')
    }
    
    if (this.issues.length === 0) {
      recommendations.push('Great job! No accessibility issues found. Continue monitoring for new issues.')
    }
    
    return recommendations
  }
}

// Export singleton instance
export const accessibilityAuditor = new AccessibilityAuditor()

// Export helper functions
export function runAccessibilityAudit(options?: AccessibilityAuditOptions): Promise<AccessibilityAuditResult> {
  const auditor = new AccessibilityAuditor(options)
  return auditor.runAudit()
}

export function getAccessibilityScore(): Promise<number> {
  return accessibilityAuditor.runAudit().then(result => result.score)
}

export function getCriticalAccessibilityIssues(): Promise<AccessibilityIssue[]> {
  return accessibilityAuditor.runAudit().then(result => 
    result.issues.filter(issue => issue.severity === 'critical')
  )
}
