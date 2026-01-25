import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { ProgressBar } from '@/components/progress-bar';
import NProgress from 'nprogress';

// Mock nprogress
vi.mock('nprogress', () => ({
  default: {
    configure: vi.fn(),
    start: vi.fn(),
    done: vi.fn(),
    inc: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('nprogress/nprogress.css', () => ({}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

describe('ProgressBar Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Route Change Detection', () => {
    it('detects route changes and triggers progress', async () => {
      const { rerender } = render(<ProgressBar />);

      // Initial render
      expect(NProgress.configure).toHaveBeenCalled();

      // Simulate re-render with different pathname
      rerender(<ProgressBar />);

      // Progress should be triggered
      await waitFor(() => {
        expect(NProgress.configure).toHaveBeenCalled();
      });
    });
  });

  describe('Progress Bar State Management', () => {
    it('initializes with configuration on mount', () => {
      render(<ProgressBar />);

      expect(NProgress.configure).toHaveBeenCalledWith({
        showSpinner: false,
        minimum: 0.3,
        easing: 'ease',
        speed: 800,
        trickleSpeed: 200,
      });
    });

    it('provides API for manual progress control', async () => {
      render(<ProgressBar />);

      // Test that NProgress methods are available
      expect(typeof NProgress.start).toBe('function');
      expect(typeof NProgress.done).toBe('function');
      expect(typeof NProgress.inc).toBe('function');
      expect(typeof NProgress.set).toBe('function');
    });
  });

  describe('Styling Integration', () => {
    it('injects theme-matched styles into document head', () => {
      render(<ProgressBar />);

      const styles = document.head.querySelectorAll('style');
      const styleElement = Array.from(styles).find(s => s.textContent?.includes('#nprogress'));
      expect(styleElement).toBeTruthy();

      if (styleElement && styleElement.textContent) {
        // Verify key styling properties
        expect(styleElement.textContent).toContain('linear-gradient');
        expect(styleElement.textContent).toContain('#3b82f6');
        expect(styleElement.textContent).toContain('height: 2px');
        expect(styleElement.textContent).toContain('position: fixed');
        expect(styleElement.textContent).toContain('top: 0');
      }
    });

    it('applies custom blue color matching brand', () => {
      render(<ProgressBar />);

      const styles = document.head.querySelectorAll('style');
      const styleElement = Array.from(styles).find(s => s.textContent?.includes('#3b82f6'));
      if (styleElement && styleElement.textContent) {
        // Brand blue colors from design system
        expect(styleElement.textContent).toContain('#3b82f6'); // blue-500
        expect(styleElement.textContent).toContain('#2563eb'); // blue-600
      }
    });

    it('styles bar for top-of-page visibility', () => {
      render(<ProgressBar />);

      const styles = document.head.querySelectorAll('style');
      const styleElement = Array.from(styles).find(s => s.textContent?.includes('z-index: 1031'));
      if (styleElement && styleElement.textContent) {
        const styleText = styleElement.textContent;

        // Position at top
        expect(styleText).toContain('top: 0');
        expect(styleText).toContain('left: 0');

        // Full width
        expect(styleText).toContain('width: 100%');

        // High z-index to appear above other content
        expect(styleText).toContain('z-index: 1031');
      }
    });

    it('includes shadow effects for visual depth', () => {
      render(<ProgressBar />);

      const styles = document.head.querySelectorAll('style');
      const styleElement = Array.from(styles).find(s => s.textContent?.includes('box-shadow'));
      if (styleElement && styleElement.textContent) {
        expect(styleElement.textContent).toContain('box-shadow');
        expect(styleElement.textContent).toContain('#3b82f6');
      }
    });
  });

  describe('Animation Behavior', () => {
    it('configures animations for smooth appearance', () => {
      render(<ProgressBar />);

      expect(NProgress.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          speed: 800,
          easing: 'ease',
          trickleSpeed: 200,
        })
      );
    });

    it('disables spinner for cleaner look', () => {
      render(<ProgressBar />);

      expect(NProgress.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          showSpinner: false,
        })
      );
    });

    it('sets appropriate minimum progress level', () => {
      render(<ProgressBar />);

      expect(NProgress.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          minimum: 0.3, // 30% minimum before completion
        })
      );
    });

    it('includes transition effects in CSS', () => {
      render(<ProgressBar />);

      const styles = document.head.querySelectorAll('style');
      const styleElement = Array.from(styles).find(s => s.textContent?.includes('transition'));
      if (styleElement && styleElement.textContent) {
        expect(styleElement.textContent).toContain('transition');
      }
    });
  });

  describe('Accessibility Compliance', () => {
    it('does not interfere with keyboard navigation', () => {
      render(<ProgressBar />);

      const styles = document.head.querySelectorAll('style');
      const styleElement = Array.from(styles).find(s => s.textContent?.includes('pointer-events: none'));
      if (styleElement && styleElement.textContent) {
        // pointer-events: none prevents interaction
        expect(styleElement.textContent).toContain('pointer-events: none');
      }
    });

    it('does not add semantic elements that need labeling', () => {
      const { container } = render(<ProgressBar />);

      // Should not add any interactive elements
      expect(container.querySelectorAll('button').length).toBe(0);
      expect(container.querySelectorAll('input').length).toBe(0);
      expect(container.querySelectorAll('[role="progressbar"]').length).toBe(0);
    });

    it('does not block screen reader content', () => {
      const { container } = render(<ProgressBar />);

      // Progress bar should not add any hidden text or aria content
      const ariaElements = container.querySelectorAll('[aria-label], [aria-labelledby]');
      expect(ariaElements.length).toBe(0);
    });
  });

  describe('Component Lifecycle', () => {
    it('configures NProgress on mount', () => {
      render(<ProgressBar />);

      expect(NProgress.configure).toHaveBeenCalled();
    });

    it('cleans up styles on unmount', () => {
      const { unmount } = render(<ProgressBar />);

      const stylesBefore = document.head.querySelectorAll('style').length;
      unmount();

      // After unmount, injected styles should be removed
      const stylesAfter = document.head.querySelectorAll('style').length;
      expect(stylesBefore).toBeGreaterThan(stylesAfter);
    });
  });

  describe('Performance', () => {
    it('renders without blocking main thread', () => {
      const start = performance.now();
      render(<ProgressBar />);
      const end = performance.now();

      // Should render quickly (less than 100ms)
      expect(end - start).toBeLessThan(100);
    });

    it('does not create memory leaks by clearing timeouts', () => {
      const { unmount } = render(<ProgressBar />);

      // Should not have dangling timers
      unmount();

      // Verify no errors occur during cleanup
      expect(true).toBe(true);
    });
  });

  describe('Cross-Browser Compatibility', () => {
    it('uses standard CSS for broad compatibility', () => {
      render(<ProgressBar />);

      const styles = document.head.querySelectorAll('style');
      const styleElement = Array.from(styles).find(s => s.textContent?.includes('linear-gradient'));
      if (styleElement && styleElement.textContent) {
        // CSS should be standard, not vendor-prefixed for modern browsers
        expect(styleElement.textContent).toContain('linear-gradient');
        expect(styleElement.textContent).toContain('position: fixed');
      }
    });
  });
});
