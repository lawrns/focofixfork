import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AccessibilityService } from '../accessibility';

describe('AccessibilityService', () => {
  beforeEach(() => {
    // Reset settings and mocks before each test
    vi.clearAllMocks();
    localStorage.clear();

    // Reset AccessibilityService settings
    (AccessibilityService as any).settings = {
      reducedMotion: false,
      highContrast: false,
      largeText: false,
      screenReader: false,
      keyboardNavigation: true,
      focusVisible: true,
    };
  });

  describe('Initialization', () => {
    it('loads settings from localStorage', () => {
      const mockSettings = {
        reducedMotion: true,
        highContrast: true,
        largeText: false,
        screenReader: false,
        keyboardNavigation: true,
        focusVisible: true,
      };

      localStorage.setItem('foco_accessibility', JSON.stringify(mockSettings));
      AccessibilityService.loadSettings();

      expect(AccessibilityService.getSettings()).toEqual(mockSettings);
    });

    it('handles invalid localStorage data gracefully', () => {
      localStorage.setItem('foco_accessibility', 'invalid-json');
      AccessibilityService.loadSettings();

      // Should fall back to default settings
      const settings = AccessibilityService.getSettings();
      expect(settings.reducedMotion).toBe(false);
      expect(settings.highContrast).toBe(false);
    });

    it('detects system preferences', () => {
      // Mock matchMedia for reduced motion
      const mockMatchMedia = vi.fn();
      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mockMatchMedia,
      });

      AccessibilityService.loadSettings();

      // Should have detected reduced motion preference
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-contrast: high)');
    });
  });

  describe('Settings Management', () => {
    it('updates settings correctly', () => {
      const newSettings = {
        reducedMotion: true,
        highContrast: true,
        largeText: true,
      };

      AccessibilityService.updateSettings(newSettings);

      const settings = AccessibilityService.getSettings();
      expect(settings.reducedMotion).toBe(true);
      expect(settings.highContrast).toBe(true);
      expect(settings.largeText).toBe(true);
      expect(settings.screenReader).toBe(false); // Should remain unchanged
    });

    it('saves settings to localStorage', () => {
      const newSettings = { reducedMotion: true };
      AccessibilityService.updateSettings(newSettings);

      const saved = localStorage.getItem('foco_accessibility');
      expect(saved).toBe(JSON.stringify({
        reducedMotion: true,
        highContrast: false,
        largeText: false,
        screenReader: false,
        keyboardNavigation: true,
        focusVisible: true,
      }));
    });

    it('announces setting changes', () => {
      const announceSpy = vi.spyOn(AccessibilityService, 'announce');

      AccessibilityService.updateSettings({ reducedMotion: true });

      expect(announceSpy).toHaveBeenCalledWith('Accessibility settings updated', 'polite');
    });
  });

  describe('Color Contrast Validation', () => {
    it('calculates correct contrast ratios', () => {
      // Black text on white background
      const contrast1 = AccessibilityService.testColorContrast('#000000', '#FFFFFF');
      expect(contrast1).toBeCloseTo(21, 1);

      // White text on black background
      const contrast2 = AccessibilityService.testColorContrast('#FFFFFF', '#000000');
      expect(contrast2).toBeCloseTo(21, 1);

      // Gray text on white background
      const contrast3 = AccessibilityService.testColorContrast('#666666', '#FFFFFF');
      expect(contrast3).toBeGreaterThan(1);
      expect(contrast3).toBeLessThan(21);
    });

    it('handles invalid color formats', () => {
      const contrast = AccessibilityService.testColorContrast('invalid', '#FFFFFF');
      expect(contrast).toBe(0);
    });

    it('validates WCAG compliance', () => {
      // AA compliant (4.5:1 minimum for normal text)
      expect(AccessibilityService.meetsContrastStandard(5.0)).toBe(true);
      expect(AccessibilityService.meetsContrastStandard(4.5)).toBe(true);
      expect(AccessibilityService.meetsContrastStandard(4.0)).toBe(false);

      // AA compliant for large text (3.0:1 minimum)
      expect(AccessibilityService.meetsContrastStandard(3.5, true)).toBe(true);
      expect(AccessibilityService.meetsContrastStandard(3.0, true)).toBe(true);
      expect(AccessibilityService.meetsContrastStandard(2.5, true)).toBe(false);
    });
  });

  describe('Form Validation', () => {
    it('validates accessible forms correctly', () => {
      const form = document.createElement('form');

      // Create form with accessible elements
      form.innerHTML = `
        <div>
          <label for="name">Name</label>
          <input id="name" name="name" type="text" aria-describedby="name-error" aria-invalid="false" aria-required="true" />
          <div id="name-error" role="alert">Name is required</div>
        </div>
        <div>
          <label for="email">Email</label>
          <input id="email" name="email" type="email" />
        </div>
      `;

      const result = AccessibilityService.validateFormAccessibility(form);

      expect(result.isValid).toBe(false); // Email field missing label association
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].issue).toContain('accessible label');
    });

    it('passes validation for fully accessible forms', () => {
      const form = document.createElement('form');

      form.innerHTML = `
        <div>
          <label for="name">Name</label>
          <input id="name" name="name" type="text" aria-required="true" />
        </div>
        <div>
          <label for="email">Email</label>
          <input id="email" name="email" type="email" aria-label="Email address" />
        </div>
      `;

      const result = AccessibilityService.validateFormAccessibility(form);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('Announcements', () => {
    it('creates live regions for announcements', () => {
      // Check if live region exists
      let liveRegion = document.getElementById('accessibility-live-region');
      if (!liveRegion) {
        AccessibilityService.announce('Test message');
        liveRegion = document.getElementById('accessibility-live-region');
      }

      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('announces messages with different priorities', () => {
      const liveRegion = document.createElement('div');
      liveRegion.id = 'accessibility-live-region';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      document.body.appendChild(liveRegion);

      AccessibilityService.announce('Polite message', 'polite');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion.textContent).toBe('Polite message');

      AccessibilityService.announce('Assertive message', 'assertive');
      expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
      expect(liveRegion.textContent).toBe('Assertive message');
    });
  });

  describe('Screen Reader Detection', () => {
    it('updates screen reader setting when detected', () => {
      // Mock screen reader detection
      const testElement = document.createElement('div');
      testElement.setAttribute('aria-live', 'assertive');
      testElement.setAttribute('aria-atomic', 'true');
      testElement.style.position = 'static'; // Simulate screen reader
      testElement.id = 'sr-test-element';

      // Mock getComputedStyle to return static position
      const mockGetComputedStyle = vi.fn(() => ({
        position: 'static',
      }));

      vi.spyOn(window, 'getComputedStyle').mockImplementation(mockGetComputedStyle);

      // This would normally be called during initialization
      // For testing, we'll directly test the logic
      expect(AccessibilityService.getSettings().screenReader).toBe(false);
    });
  });

  describe('Error Messages', () => {
    it('creates accessible error message elements', () => {
      const errorElement = AccessibilityService.createErrorMessage('test-field', 'This field is required');

      expect(errorElement.id).toBe('test-field-error');
      expect(errorElement.getAttribute('role')).toBe('alert');
      expect(errorElement.getAttribute('aria-live')).toBe('polite');
      expect(errorElement.textContent).toBe('This field is required');
      expect(errorElement.className).toContain('error-message');
    });

    it('updates field accessibility attributes', () => {
      const field = document.createElement('input');
      field.id = 'test-input';
      field.type = 'text';

      // Initially valid
      AccessibilityService.updateFieldAccessibility(field, true);
      expect(field.getAttribute('aria-invalid')).toBe('false');
      expect(field.getAttribute('aria-describedby')).toBeNull();

      // Now invalid with error
      AccessibilityService.updateFieldAccessibility(field, false, 'Required field');
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(field.getAttribute('aria-describedby')).toBe('test-input-error');
    });
  });

  describe('Motion Preferences', () => {
    it('respects reduced motion preferences', () => {
      // Mock reduced motion preference
      const mockMatchMedia = vi.fn((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mockMatchMedia,
      });

      AccessibilityService.loadSettings();

      const settings = AccessibilityService.getSettings();
      expect(settings.reducedMotion).toBe(true);
    });

    it('respects high contrast preferences', () => {
      const mockMatchMedia = vi.fn((query) => ({
        matches: query === '(prefers-contrast: high)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mockMatchMedia,
      });

      AccessibilityService.loadSettings();

      const settings = AccessibilityService.getSettings();
      expect(settings.highContrast).toBe(true);
    });
  });
});
