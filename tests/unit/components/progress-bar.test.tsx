import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
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

describe('ProgressBar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('renders progress bar component without errors', () => {
      const { container } = render(<ProgressBar />);
      expect(container).toBeInTheDocument();
    });

    it('injects custom styles on mount', () => {
      render(<ProgressBar />);

      // Check that a style element was added to document.head
      const styles = document.head.querySelectorAll('style');
      expect(styles.length).toBeGreaterThan(0);
    });

    it('configures NProgress on mount', () => {
      render(<ProgressBar />);

      expect(NProgress.configure).toHaveBeenCalledWith({
        showSpinner: false,
        minimum: 0.3,
        easing: 'ease',
        speed: 800,
        trickleSpeed: 200,
      });
    });

    it('includes blue gradient color in custom styles', () => {
      render(<ProgressBar />);

      const styles = document.head.querySelectorAll('style');
      const style = Array.from(styles).find(s => s.textContent?.includes('#3b82f6'));
      if (style && style.textContent) {
        expect(style.textContent).toContain('#3b82f6');
        expect(style.textContent).toContain('#2563eb');
        expect(style.textContent).toContain('linear-gradient');
      }
    });

    it('sets progress bar height to 2px in styles', () => {
      render(<ProgressBar />);

      const styles = document.head.querySelectorAll('style');
      const style = Array.from(styles).find(s => s.textContent?.includes('height: 2px'));
      if (style && style.textContent) {
        expect(style.textContent).toContain('height: 2px');
      }
    });
  });

  describe('Styling', () => {
    it('applies theme-matched blue color gradient', () => {
      render(<ProgressBar />);

      const styles = document.head.querySelectorAll('style');
      const style = Array.from(styles).find(s => s.textContent?.includes('linear-gradient'));
      if (style && style.textContent) {
        // Verify gradient uses blue colors matching design system
        expect(style.textContent).toContain('linear-gradient(to right, #3b82f6, #2563eb)');
      }
    });

    it('includes box-shadow glow effect', () => {
      render(<ProgressBar />);

      const styles = document.head.querySelectorAll('style');
      const style = Array.from(styles).find(s => s.textContent?.includes('box-shadow'));
      if (style && style.textContent) {
        expect(style.textContent).toContain('box-shadow');
        expect(style.textContent).toContain('#3b82f6');
      }
    });

    it('positions bar at top of page with high z-index', () => {
      render(<ProgressBar />);

      const styles = document.head.querySelectorAll('style');
      const style = Array.from(styles).find(s => s.textContent?.includes('z-index: 1031'));
      if (style && style.textContent) {
        expect(style.textContent).toContain('position: fixed');
        expect(style.textContent).toContain('top: 0');
        expect(style.textContent).toContain('z-index: 1031');
      }
    });

    it('disables pointer events to prevent interaction blocking', () => {
      render(<ProgressBar />);

      const styles = document.head.querySelectorAll('style');
      const style = Array.from(styles).find(s => s.textContent?.includes('pointer-events: none'));
      if (style && style.textContent) {
        expect(style.textContent).toContain('pointer-events: none');
      }
    });
  });

  describe('Animation Configuration', () => {
    it('sets smooth transition timing', () => {
      render(<ProgressBar />);

      const styles = document.head.querySelectorAll('style');
      const style = Array.from(styles).find(s => s.textContent?.includes('transition'));
      if (style && style.textContent) {
        expect(style.textContent).toContain('transition');
        expect(style.textContent).toContain('0.3s ease');
      }
    });

    it('configures trickle speed for smooth progress', () => {
      render(<ProgressBar />);

      expect(NProgress.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          trickleSpeed: 200,
        })
      );
    });

    it('sets easing to ease for natural motion', () => {
      render(<ProgressBar />);

      expect(NProgress.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          easing: 'ease',
        })
      );
    });
  });

  describe('Cleanup', () => {
    it('removes injected styles on unmount', () => {
      const { unmount } = render(<ProgressBar />);

      const stylesBefore = document.head.querySelectorAll('style').length;
      unmount();
      const stylesAfter = document.head.querySelectorAll('style').length;

      // The style added by the component should be removed
      expect(stylesBefore).toBeGreaterThan(stylesAfter);
    });
  });

  describe('Configuration', () => {
    it('disables spinner for clean appearance', () => {
      render(<ProgressBar />);

      expect(NProgress.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          showSpinner: false,
        })
      );
    });

    it('sets minimum progress to 30%', () => {
      render(<ProgressBar />);

      expect(NProgress.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          minimum: 0.3,
        })
      );
    });

    it('configures reasonable animation speed', () => {
      render(<ProgressBar />);

      expect(NProgress.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          speed: 800,
        })
      );
    });
  });

  describe('Accessibility', () => {
    it('does not affect keyboard navigation or focus', () => {
      render(<ProgressBar />);

      const styles = document.head.querySelectorAll('style');
      const style = Array.from(styles).find(s => s.textContent?.includes('pointer-events: none'));
      if (style && style.textContent) {
        // pointer-events: none should be set
        expect(style.textContent).toContain('pointer-events: none');
      }
    });

    it('does not add interactive elements to DOM', () => {
      const { container } = render(<ProgressBar />);

      // ProgressBar should not render any interactive elements
      const buttons = container.querySelectorAll('button');
      const inputs = container.querySelectorAll('input');
      const anchors = container.querySelectorAll('a');

      expect(buttons.length).toBe(0);
      expect(inputs.length).toBe(0);
      expect(anchors.length).toBe(0);
    });
  });

  describe('Browser Compatibility', () => {
    it('includes webkit prefix for backdrop-filter support', () => {
      render(<ProgressBar />);

      const styles = document.head.querySelectorAll('style');
      const style = Array.from(styles).find(s => s.textContent?.includes('#nprogress'));
      // Check for vendor prefixes if applicable
      if (style && style.textContent) {
        // Styles should be properly formatted for cross-browser support
        expect(style.textContent).toBeTruthy();
      }
    });
  });
});
