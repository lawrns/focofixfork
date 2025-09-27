import { toast } from 'sonner';

// Accessibility configuration and utilities
export interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  focusVisible: boolean;
}

export class AccessibilityService {
  private static settings: AccessibilitySettings = {
    reducedMotion: false,
    highContrast: false,
    largeText: false,
    screenReader: false,
    keyboardNavigation: true,
    focusVisible: true,
  };

  // Initialize accessibility features
  static initialize(): void {
    this.loadSettings();
    this.applySettings();
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
    this.setupScreenReaderDetection();
    this.setupMotionPreferences();
  }

  // Load accessibility settings from localStorage or system preferences
  static loadSettings(): void {
    try {
      const stored = localStorage.getItem('foco_accessibility');
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }

      // Check system preferences
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;

      if (prefersReducedMotion && !this.settings.reducedMotion) {
        this.settings.reducedMotion = true;
      }

      if (prefersHighContrast && !this.settings.highContrast) {
        this.settings.highContrast = true;
      }

      this.saveSettings();
    } catch (error) {
      console.error('Failed to load accessibility settings:', error);
    }
  }

  // Save accessibility settings
  static saveSettings(): void {
    try {
      localStorage.setItem('foco_accessibility', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save accessibility settings:', error);
    }
  }

  // Update settings and apply changes
  static updateSettings(newSettings: Partial<AccessibilitySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.applySettings();

    toast.success('Accessibility settings updated');
  }

  // Get current settings
  static getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  // Apply accessibility settings to the document
  private static applySettings(): void {
    const { reducedMotion, highContrast, largeText, focusVisible } = this.settings;

    // Apply reduced motion
    document.documentElement.style.setProperty('--animation-duration', reducedMotion ? '0.01ms' : '200ms');
    document.documentElement.style.setProperty('--transition-duration', reducedMotion ? '0.01ms' : '150ms');

    // Apply high contrast
    document.documentElement.classList.toggle('high-contrast', highContrast);

    // Apply large text
    document.documentElement.classList.toggle('large-text', largeText);

    // Apply focus visible
    document.documentElement.classList.toggle('focus-visible', focusVisible);
  }

  // Setup keyboard navigation
  private static setupKeyboardNavigation(): void {
    // Skip links
    this.createSkipLinks();

    // Enhanced keyboard navigation
    document.addEventListener('keydown', (event) => {
      // Skip to main content (Ctrl/Cmd + Home)
      if ((event.ctrlKey || event.metaKey) && event.key === 'Home') {
        event.preventDefault();
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.focus();
          mainContent.scrollIntoView({ behavior: 'smooth' });
        }
      }

      // Skip to navigation (Ctrl/Cmd + End)
      if ((event.ctrlKey || event.metaKey) && event.key === 'End') {
        event.preventDefault();
        const nav = document.querySelector('nav, [role="navigation"]');
        if (nav) {
          (nav as HTMLElement).focus();
          nav.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  }

  // Create skip links for keyboard navigation
  private static createSkipLinks(): void {
    const skipLinks = document.createElement('div');
    skipLinks.className = 'skip-links';
    skipLinks.innerHTML = `
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#navigation" class="skip-link">Skip to navigation</a>
      <a href="#search" class="skip-link">Skip to search</a>
    `;

    // Add styles for skip links
    const style = document.createElement('style');
    style.textContent = `
      .skip-links {
        position: absolute;
        top: -40px;
        left: 6px;
        z-index: 1000;
      }
      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #0052CC;
        color: white;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        z-index: 1000;
        transition: top 0.2s;
      }
      .skip-link:focus {
        top: 6px;
      }
      .skip-link:not(:focus) {
        clip: rect(1px, 1px, 1px, 1px);
        position: absolute;
      }
    `;

    document.head.appendChild(style);
    document.body.insertBefore(skipLinks, document.body.firstChild);
  }

  // Setup focus management
  private static setupFocusManagement(): void {
    // Focus trap for modals and dialogs
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        const activeElement = document.activeElement;
        const modal = activeElement?.closest('[role="dialog"], .modal, [aria-modal="true"]');

        if (modal) {
          const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );

          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (event.shiftKey) {
            // Shift + Tab
            if (activeElement === firstElement) {
              event.preventDefault();
              lastElement.focus();
            }
          } else {
            // Tab
            if (activeElement === lastElement) {
              event.preventDefault();
              firstElement.focus();
            }
          }
        }
      }
    });

    // Announce dynamic content changes
    this.setupLiveRegions();
  }

  // Setup live regions for screen readers
  private static setupLiveRegions(): void {
    // Create a live region for announcements
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only live-region';
    liveRegion.id = 'accessibility-live-region';

    document.body.appendChild(liveRegion);
  }

  // Announce content changes to screen readers
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const liveRegion = document.getElementById('accessibility-live-region');
    if (liveRegion) {
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.textContent = message;

      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }

  // Setup screen reader detection
  private static setupScreenReaderDetection(): void {
    // Detect if screen reader is active
    const testElement = document.createElement('div');
    testElement.setAttribute('aria-live', 'assertive');
    testElement.setAttribute('aria-atomic', 'true');
    testElement.style.position = 'absolute';
    testElement.style.left = '-10000px';
    testElement.style.width = '1px';
    testElement.style.height = '1px';
    testElement.style.overflow = 'hidden';

    document.body.appendChild(testElement);

    let isScreenReaderActive = false;

    // Check for screen reader activity
    const checkScreenReader = () => {
      const computedStyle = window.getComputedStyle(testElement);
      isScreenReaderActive = computedStyle.position === 'static' ||
                            testElement.offsetWidth > 0 ||
                            testElement.offsetHeight > 0;
    };

    // Check periodically
    setInterval(checkScreenReader, 1000);

    // Update settings based on screen reader detection
    const updateScreenReaderSetting = () => {
      if (isScreenReaderActive !== this.settings.screenReader) {
        this.settings.screenReader = isScreenReaderActive;
        this.saveSettings();
        this.applySettings();
      }
    };

    setInterval(updateScreenReaderSetting, 5000);
  }

  // Setup motion preferences
  private static setupMotionPreferences(): void {
    // Listen for changes in motion preferences
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', (event) => {
      this.settings.reducedMotion = event.matches;
      this.saveSettings();
      this.applySettings();
    });

    // Listen for changes in contrast preferences
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    contrastQuery.addEventListener('change', (event) => {
      this.settings.highContrast = event.matches;
      this.saveSettings();
      this.applySettings();
    });
  }

  // Test color contrast
  static testColorContrast(foreground: string, background: string): number {
    // Convert colors to RGB
    const fgRGB = this.hexToRgb(foreground);
    const bgRGB = this.hexToRgb(background);

    if (!fgRGB || !bgRGB) return 0;

    // Calculate relative luminance
    const fgLuminance = this.getRelativeLuminance(fgRGB);
    const bgLuminance = this.getRelativeLuminance(bgRGB);

    // Calculate contrast ratio
    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);

    return (lighter + 0.05) / (darker + 0.05);
  }

  // Check if contrast meets WCAG standards
  static meetsContrastStandard(contrast: number, isLargeText: boolean = false): boolean {
    // WCAG AA standards
    const aaNormal = 4.5;
    const aaLarge = 3.0;

    return contrast >= (isLargeText ? aaLarge : aaNormal);
  }

  // Convert hex to RGB
  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Calculate relative luminance
  private static getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
    const { r, g, b } = rgb;

    const toLinear = (value: number) => {
      value = value / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    };

    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }

  // Validate form accessibility
  static validateFormAccessibility(form: HTMLFormElement): {
    isValid: boolean;
    issues: Array<{ field: string; issue: string; severity: 'error' | 'warning' }>;
  } {
    const issues: Array<{ field: string; issue: string; severity: 'error' | 'warning' }> = [];

    // Check all form controls
    const controls = form.querySelectorAll('input, select, textarea, [role="textbox"], [role="combobox"]');

    controls.forEach((control) => {
      const element = control as HTMLElement;
      const fieldName = element.getAttribute('name') || element.getAttribute('id') || 'unnamed field';

      // Check for label
      const hasLabel = this.hasAccessibleLabel(element);
      if (!hasLabel) {
        issues.push({
          field: fieldName,
          issue: 'Missing accessible label',
          severity: 'error'
        });
      }

      // Check for error messages
      const hasError = this.hasErrorMessage(element);
      if (!hasError && element.hasAttribute('aria-invalid')) {
        issues.push({
          field: fieldName,
          issue: 'Missing error message for invalid field',
          severity: 'error'
        });
      }

      // Check required fields
      if (element.hasAttribute('required') || element.getAttribute('aria-required') === 'true') {
        const hasRequiredIndicator = this.hasRequiredIndicator(element);
        if (!hasRequiredIndicator) {
          issues.push({
            field: fieldName,
            issue: 'Required field missing required indicator',
            severity: 'warning'
          });
        }
      }
    });

    return {
      isValid: issues.filter(issue => issue.severity === 'error').length === 0,
      issues
    };
  }

  // Check if element has accessible label
  private static hasAccessibleLabel(element: HTMLElement): boolean {
    // Check for aria-label
    if (element.getAttribute('aria-label')) return true;

    // Check for aria-labelledby
    if (element.getAttribute('aria-labelledby')) return true;

    // Check for associated label
    const id = element.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label && label.textContent?.trim()) return true;
    }

    // Check for wrapping label
    const parentLabel = element.closest('label');
    if (parentLabel && parentLabel.textContent?.trim()) return true;

    return false;
  }

  // Check if element has error message
  private static hasErrorMessage(element: HTMLElement): boolean {
    const describedBy = element.getAttribute('aria-describedby');
    if (describedBy) {
      const errorElement = document.getElementById(describedBy);
      if (errorElement && errorElement.textContent?.trim()) return true;
    }

    // Check for nearby error elements
    const container = element.closest('.form-field, .input-group, [role="group"]');
    if (container) {
      const errorElement = container.querySelector('.error, [role="alert"], .field-error');
      if (errorElement && errorElement.textContent?.trim()) return true;
    }

    return false;
  }

  // Check if element has required indicator
  private static hasRequiredIndicator(element: HTMLElement): boolean {
    // Check for aria-required
    if (element.getAttribute('aria-required') === 'true') return true;

    // Check for visual indicators
    const container = element.closest('.form-field, .input-group, [role="group"]');
    if (container) {
      const indicators = container.querySelector('.required, .asterisk, [aria-label*="required"]');
      if (indicators) return true;

      // Check text content for asterisk or "required"
      const textContent = container.textContent || '';
      if (textContent.includes('*') || textContent.toLowerCase().includes('required')) return true;
    }

    return false;
  }

  // Generate accessible error message
  static createErrorMessage(fieldId: string, message: string): HTMLElement {
    const errorElement = document.createElement('div');
    errorElement.id = `${fieldId}-error`;
    errorElement.setAttribute('role', 'alert');
    errorElement.setAttribute('aria-live', 'polite');
    errorElement.className = 'error-message text-red-600 text-sm mt-1';
    errorElement.textContent = message;

    return errorElement;
  }

  // Update form field accessibility
  static updateFieldAccessibility(
    field: HTMLElement,
    isValid: boolean,
    errorMessage?: string,
    isRequired?: boolean
  ): void {
    // Update aria-invalid
    field.setAttribute('aria-invalid', (!isValid).toString());

    // Update aria-required
    if (isRequired !== undefined) {
      field.setAttribute('aria-required', isRequired.toString());
    }

    // Update aria-describedby for error message
    const errorId = `${field.id || (field as HTMLInputElement).name || 'field'}-error`;
    const describedBy = field.getAttribute('aria-describedby') || '';

    if (errorMessage) {
      // Add error ID to aria-describedby
      const ids = describedBy.split(' ').filter(id => id && id !== errorId);
      ids.push(errorId);
      field.setAttribute('aria-describedby', ids.join(' '));
    } else {
      // Remove error ID from aria-describedby
      const ids = describedBy.split(' ').filter(id => id !== errorId);
      if (ids.length > 0) {
        field.setAttribute('aria-describedby', ids.join(' '));
      } else {
        field.removeAttribute('aria-describedby');
      }
    }
  }
}

// React hook for accessibility
export function useAccessibility() {
  return {
    settings: AccessibilityService.getSettings(),
    updateSettings: AccessibilityService.updateSettings,
    announce: AccessibilityService.announce,
    testColorContrast: AccessibilityService.testColorContrast,
    meetsContrastStandard: AccessibilityService.meetsContrastStandard,
    validateFormAccessibility: AccessibilityService.validateFormAccessibility,
    createErrorMessage: AccessibilityService.createErrorMessage,
    updateFieldAccessibility: AccessibilityService.updateFieldAccessibility,
  };
}

// Initialize accessibility on module load
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AccessibilityService.initialize());
  } else {
    AccessibilityService.initialize();
  }
}
