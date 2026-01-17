'use client';

/**
 * HapticService for Foco.mx
 * Provides tactile feedback for mobile users using the Web Vibration API.
 * Enhances the "World Class" feel of micro-interactions.
 */

class HapticService {
  private static instance: HapticService;
  private enabled: boolean = true;

  private constructor() {
    if (typeof window !== 'undefined') {
      // Check user preferences (could be tied to accessibility settings)
      const stored = localStorage.getItem('foco_accessibility');
      if (stored) {
        try {
          const settings = JSON.parse(stored);
          this.enabled = settings.enableHapticFeedback ?? true;
        } catch (e) {
          console.error('Failed to parse accessibility settings for haptics:', e);
        }
      }
    }
  }

  static getInstance(): HapticService {
    if (!HapticService.instance) {
      HapticService.instance = new HapticService();
    }
    return HapticService.instance;
  }

  /**
   * Trigger a vibration pattern
   */
  vibrate(pattern: number | number[]) {
    if (!this.enabled || typeof window === 'undefined' || !navigator.vibrate) {
      return;
    }

    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn('Haptic feedback failed:', e);
    }
  }

  /**
   * Light impact - for basic interactions like button clicks
   */
  light() {
    this.vibrate(10);
  }

  /**
   * Medium impact - for successful primary actions
   */
  medium() {
    this.vibrate(20);
  }

  /**
   * Heavy impact - for critical or high-weight actions
   */
  heavy() {
    this.vibrate(40);
  }

  /**
   * Success pattern - for completing tasks or flows
   */
  success() {
    this.vibrate([10, 30, 10]);
  }

  /**
   * Error pattern - for validation failures or errors
   */
  error() {
    this.vibrate([50, 100, 50, 100, 50]);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}

export const hapticService = HapticService.getInstance();
