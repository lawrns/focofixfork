'use client'

interface AccessibilitySettings {
  reducedMotion: boolean
  highContrast: boolean
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  keyboardNavigation: boolean
  screenReader: boolean
  focusVisible: boolean
  colorBlindSupport: boolean
  dyslexiaSupport: boolean
}

interface AccessibilityMetric {
  type: 'keyboard_usage' | 'screen_reader' | 'focus_management' | 'color_contrast' | 'aria_usage'
  value: number
  timestamp: number
  metadata?: Record<string, any>
}

class AccessibilityManager {
  private settings: AccessibilitySettings
  private metrics: AccessibilityMetric[] = []
  private isTracking = false
  private keyboardUsage = 0
  private mouseUsage = 0
  private focusEvents = 0
  private ariaElements = 0
  private lowContrastElements = 0

  constructor() {
    this.settings = {
      reducedMotion: false,
      highContrast: false,
      fontSize: 'medium',
      keyboardNavigation: true,
      screenReader: false,
      focusVisible: true,
      colorBlindSupport: false,
      dyslexiaSupport: false
    }

    this.loadSettings()
    this.detectCapabilities()
    this.startTracking()
  }

  private loadSettings() {
    if (typeof window === 'undefined') return

    try {
      const saved = localStorage.getItem('foco-accessibility-settings')
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) }
      }
    } catch (error) {
      console.error('[AccessibilityManager] Failed to load settings:', error)
    }
  }

  private saveSettings() {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem('foco-accessibility-settings', JSON.stringify(this.settings))
    } catch (error) {
      console.error('[AccessibilityManager] Failed to save settings:', error)
    }
  }

  private detectCapabilities() {
    if (typeof window === 'undefined') return

    // Detect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.settings.reducedMotion = true
    }

    // Detect high contrast preference
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      this.settings.highContrast = true
    }

    // Detect screen reader
    this.settings.screenReader = this.detectScreenReader()

    // Apply initial settings
    this.applySettings()
  }

  private detectScreenReader(): boolean {
    if (typeof window === 'undefined') return false

    // Check for common screen reader indicators
    const indicators = [
      'speechSynthesis' in window,
      'speechRecognition' in window,
      navigator.userAgent.includes('NVDA'),
      navigator.userAgent.includes('JAWS'),
      navigator.userAgent.includes('VoiceOver'),
      document.documentElement.getAttribute('aria-hidden') !== null
    ]

    return indicators.some(indicator => indicator)
  }

  private applySettings() {
    if (typeof window === 'undefined') return

    const root = document.documentElement

    // Apply reduced motion
    if (this.settings.reducedMotion) {
      root.style.setProperty('--animation-duration', '0.01ms')
      root.style.setProperty('--animation-iteration-count', '1')
      root.classList.add('reduce-motion')
    } else {
      root.style.removeProperty('--animation-duration')
      root.style.removeProperty('--animation-iteration-count')
      root.classList.remove('reduce-motion')
    }

    // Apply high contrast
    if (this.settings.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Apply font size
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large')
    root.classList.add(`font-${this.settings.fontSize}`)

    // Apply focus visible
    if (this.settings.focusVisible) {
      root.classList.add('focus-visible')
    } else {
      root.classList.remove('focus-visible')
    }

    // Apply color blind support
    if (this.settings.colorBlindSupport) {
      root.classList.add('color-blind-support')
    } else {
      root.classList.remove('color-blind-support')
    }

    // Apply dyslexia support
    if (this.settings.dyslexiaSupport) {
      root.classList.add('dyslexia-support')
    } else {
      root.classList.remove('dyslexia-support')
    }
  }

  private startTracking() {
    if (typeof window === 'undefined' || this.isTracking) return

    this.isTracking = true

    // Track keyboard usage
    document.addEventListener('keydown', (e) => {
      this.keyboardUsage++
      this.trackMetric('keyboard_usage', 1, {
        key: e.key,
        code: e.code,
        target: (e.target as HTMLElement).tagName
      })
    })

    // Track mouse usage
    document.addEventListener('mousedown', () => {
      this.mouseUsage++
    })

    // Track focus events
    document.addEventListener('focusin', (e) => {
      this.focusEvents++
      this.trackMetric('focus_management', 1, {
        target: (e.target as HTMLElement).tagName,
        id: (e.target as HTMLElement).id,
        className: (e.target as HTMLElement).className
      })
    })

    // Track ARIA usage
    this.trackAriaUsage()

    // Track color contrast
    this.trackColorContrast()

    // Periodic tracking
    setInterval(() => {
      this.trackPeriodicMetrics()
    }, 30000) // Every 30 seconds
  }

  private trackAriaUsage() {
    const ariaElements = document.querySelectorAll('[aria-label], [aria-describedby], [aria-labelledby], [role]')
    this.ariaElements = ariaElements.length
    
    this.trackMetric('aria_usage', this.ariaElements, {
      url: window.location.pathname,
      elements: Array.from(ariaElements).map(el => ({
        tagName: el.tagName,
        ariaLabel: el.getAttribute('aria-label'),
        role: el.getAttribute('role')
      }))
    })
  }

  private trackColorContrast() {
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, button')
    let lowContrastCount = 0

    textElements.forEach((element) => {
      const styles = window.getComputedStyle(element)
      const color = styles.color
      const backgroundColor = styles.backgroundColor
      
      // Simplified contrast check (in production, use a proper contrast ratio calculator)
      if (color === backgroundColor || color === 'transparent') {
        lowContrastCount++
      }
    })

    this.lowContrastElements = lowContrastCount
    this.trackMetric('color_contrast', lowContrastCount, {
      url: window.location.pathname,
      totalElements: textElements.length
    })
  }

  private trackPeriodicMetrics() {
    // Track keyboard vs mouse usage ratio
    const totalUsage = this.keyboardUsage + this.mouseUsage
    if (totalUsage > 0) {
      const keyboardRatio = this.keyboardUsage / totalUsage
      this.trackMetric('keyboard_usage', keyboardRatio, {
        keyboardUsage: this.keyboardUsage,
        mouseUsage: this.mouseUsage,
        totalUsage
      })
    }

    // Track screen reader usage
    if (this.settings.screenReader) {
      this.trackMetric('screen_reader', 1, {
        detected: true,
        userAgent: navigator.userAgent
      })
    }
  }

  private trackMetric(type: AccessibilityMetric['type'], value: number, metadata?: Record<string, any>) {
    const metric: AccessibilityMetric = {
      type,
      value,
      timestamp: Date.now(),
      metadata
    }

    this.metrics.push(metric)
  }

  // Public methods
  public getSettings(): AccessibilitySettings {
    return { ...this.settings }
  }

  public updateSetting<K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) {
    this.settings[key] = value
    this.saveSettings()
    this.applySettings()
  }

  public updateSettings(settings: Partial<AccessibilitySettings>) {
    this.settings = { ...this.settings, ...settings }
    this.saveSettings()
    this.applySettings()
  }

  public getMetrics(): AccessibilityMetric[] {
    return [...this.metrics]
  }

  public getAccessibilityScore(): number {
    let score = 100

    // Deduct points for low contrast elements
    if (this.lowContrastElements > 0) {
      score -= Math.min(this.lowContrastElements * 2, 20)
    }

    // Deduct points for lack of ARIA usage
    if (this.ariaElements < 5) {
      score -= 10
    }

    // Deduct points for poor keyboard navigation
    const totalUsage = this.keyboardUsage + this.mouseUsage
    if (totalUsage > 0) {
      const keyboardRatio = this.keyboardUsage / totalUsage
      if (keyboardRatio < 0.1) {
        score -= 15
      }
    }

    // Deduct points for excessive focus events (poor focus management)
    if (this.focusEvents > 100) {
      score -= 10
    }

    return Math.max(score, 0)
  }

  public generateReport(): {
    score: number
    recommendations: string[]
    metrics: AccessibilityMetric[]
  } {
    const score = this.getAccessibilityScore()
    const recommendations: string[] = []

    if (this.lowContrastElements > 0) {
      recommendations.push(`Improve color contrast for ${this.lowContrastElements} elements`)
    }

    if (this.ariaElements < 5) {
      recommendations.push('Add more ARIA labels and roles to improve screen reader support')
    }

    const totalUsage = this.keyboardUsage + this.mouseUsage
    if (totalUsage > 0) {
      const keyboardRatio = this.keyboardUsage / totalUsage
      if (keyboardRatio < 0.1) {
        recommendations.push('Improve keyboard navigation support')
      }
    }

    if (this.focusEvents > 100) {
      recommendations.push('Optimize focus management to reduce excessive focus events')
    }

    return {
      score,
      recommendations,
      metrics: this.metrics
    }
  }

  public reset() {
    this.settings = {
      reducedMotion: false,
      highContrast: false,
      fontSize: 'medium',
      keyboardNavigation: true,
      screenReader: false,
      focusVisible: true,
      colorBlindSupport: false,
      dyslexiaSupport: false
    }
    this.metrics = []
    this.keyboardUsage = 0
    this.mouseUsage = 0
    this.focusEvents = 0
    this.ariaElements = 0
    this.lowContrastElements = 0
    this.saveSettings()
    this.applySettings()
  }
}

export const accessibilityManager = new AccessibilityManager()
