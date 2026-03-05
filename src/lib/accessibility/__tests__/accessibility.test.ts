import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessibilityService } from '../accessibility';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AccessibilityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.body.innerHTML = '';
    document.head.innerHTML = '';

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    (AccessibilityService as any).settings = {
      reducedMotion: false,
      highContrast: false,
      largeText: false,
      screenReader: false,
      keyboardNavigation: true,
      focusVisible: true,
      enableHapticFeedback: true,
      enableSoundNotifications: true,
    };

    const storage: Record<string, string> = {};
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => storage[key] ?? null);
    vi.mocked(localStorage.setItem).mockImplementation((key: string, value: string) => {
      storage[key] = value;
    });
    vi.mocked(localStorage.removeItem).mockImplementation((key: string) => {
      delete storage[key];
    });
    vi.mocked(localStorage.clear).mockImplementation(() => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    });
  });

  it('loads and merges settings from localStorage', () => {
    localStorage.setItem(
      'foco_accessibility',
      JSON.stringify({ reducedMotion: true, highContrast: true, largeText: true })
    );

    AccessibilityService.loadSettings();
    const settings = AccessibilityService.getSettings();

    expect(settings.reducedMotion).toBe(true);
    expect(settings.highContrast).toBe(true);
    expect(settings.largeText).toBe(true);
    expect(settings.keyboardNavigation).toBe(true);
  });

  it('updates settings and persists to localStorage', () => {
    AccessibilityService.updateSettings({ reducedMotion: true });

    const settings = AccessibilityService.getSettings();
    const saved = localStorage.getItem('foco_accessibility');

    expect(settings.reducedMotion).toBe(true);
    expect(saved).toContain('"reducedMotion":true');
  });

  it('calculates contrast and validates WCAG threshold', () => {
    const ratio = AccessibilityService.testColorContrast('#000000', '#FFFFFF');

    expect(ratio).toBeCloseTo(21, 1);
    expect(AccessibilityService.meetsContrastStandard(4.5)).toBe(true);
    expect(AccessibilityService.meetsContrastStandard(2.9, true)).toBe(false);
  });

  it('returns zero contrast ratio for invalid colors', () => {
    expect(AccessibilityService.testColorContrast('bad', '#FFFFFF')).toBe(0);
  });

  it('validates form accessibility and reports missing labels', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <input id="named" name="named" aria-label="Named input" />
      <input id="missing" name="missing" />
    `;

    const result = AccessibilityService.validateFormAccessibility(form);

    expect(result.isValid).toBe(false);
    expect(result.issues.some((i) => i.field === 'missing' && i.issue.includes('label'))).toBe(true);
  });

  it('creates and updates accessible error metadata on form fields', () => {
    const field = document.createElement('input');
    field.id = 'email';

    AccessibilityService.updateFieldAccessibility(field, false, 'Required field', true);
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.getAttribute('aria-describedby')).toContain('email-error');
    expect(field.getAttribute('aria-required')).toBe('true');

    AccessibilityService.updateFieldAccessibility(field, true);
    expect(field.getAttribute('aria-invalid')).toBe('false');
    expect(field.hasAttribute('aria-describedby')).toBe(false);
  });

  it('creates a live region and announces messages', () => {
    const region = document.createElement('div');
    region.id = 'accessibility-live-region';
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    document.body.appendChild(region);

    AccessibilityService.announce('System updated', 'assertive');

    expect(region.getAttribute('aria-live')).toBe('assertive');
    expect(region.textContent).toBe('System updated');
  });
});
