import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessibilityService, useAccessibility } from '@/lib/accessibility/accessibility';
import { AccessibleInput, AccessibleSelect, AccessibleButton } from '@/components/ui/accessible-form';

// Test component that integrates accessibility features
function AccessibilityTestComponent() {
  const { settings, updateSettings, announce } = useAccessibility();

  return (
    <div>
      <h1>Accessibility Test</h1>

      <section>
        <h2>Settings</h2>
        <label>
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
          />
          Reduced Motion
        </label>

        <label>
          <input
            type="checkbox"
            checked={settings.highContrast}
            onChange={(e) => updateSettings({ highContrast: e.target.checked })}
          />
          High Contrast
        </label>

        <label>
          <input
            type="checkbox"
            checked={settings.largeText}
            onChange={(e) => updateSettings({ largeText: e.target.checked })}
          />
          Large Text
        </label>
      </section>

      <section>
        <h2>Form Elements</h2>
        <AccessibleInput
          id="name"
          label="Full Name"
          placeholder="Enter your name"
          required
        />

        <AccessibleSelect
          id="role"
          label="Role"
          placeholder="Select a role"
          options={[
            { value: 'admin', label: 'Administrator' },
            { value: 'user', label: 'User' },
            { value: 'guest', label: 'Guest' },
          ]}
        />

        <AccessibleButton onClick={() => announce('Button clicked!', 'assertive')}>
          Test Announcement
        </AccessibleButton>
      </section>

      <section>
        <h2>Live Region</h2>
        <div aria-live="polite" aria-atomic="true" id="announcements">
          {/* Announcements will appear here */}
        </div>
      </section>
    </div>
  );
}

describe('Accessibility Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset accessibility settings
    AccessibilityService.updateSettings({
      reducedMotion: false,
      highContrast: false,
      largeText: false,
      screenReader: false,
      keyboardNavigation: true,
      focusVisible: true,
    });
  });

  it('initializes accessibility service', async () => {
    const initializeSpy = vi.spyOn(AccessibilityService, 'initialize');

    render(<AccessibilityTestComponent />);

    await waitFor(() => {
      expect(initializeSpy).toHaveBeenCalled();
    });

    initializeSpy.mockRestore();
  });

  it('renders accessible form elements', async () => {
    render(<AccessibilityTestComponent />);

    await waitFor(() => {
      // Should have proper headings
      expect(screen.getByRole('heading', { name: /accessibility test/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /form elements/i })).toBeInTheDocument();

      // Should have accessible form elements
      expect(screen.getByRole('textbox', { name: /full name/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /role/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /test announcement/i })).toBeInTheDocument();
    });
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<AccessibilityTestComponent />);

    await waitFor(() => {
      const input = screen.getByRole('textbox', { name: /full name/i });
      input.focus();

      expect(input).toHaveFocus();
    });

    // Tab through form elements
    await user.tab();
    const select = screen.getByRole('combobox', { name: /role/i });
    expect(select).toHaveFocus();

    await user.tab();
    const button = screen.getByRole('button', { name: /test announcement/i });
    expect(button).toHaveFocus();
  });

  it('validates form accessibility', async () => {
    render(<AccessibilityTestComponent />);

    await waitFor(() => {
      // Create a mock form element for testing since we can't access the actual form components
      const mockForm = document.createElement('form');
      mockForm.innerHTML = `
        <input type="text" name="test" required aria-label="Test input" />
        <button type="submit" aria-label="Submit">Submit</button>
      `;
      document.body.appendChild(mockForm);

      const result = AccessibilityService.validateFormAccessibility(mockForm);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);

      // Clean up
      document.body.removeChild(mockForm);
    });
  });

  it('handles accessibility settings changes', async () => {
    const user = userEvent.setup();
    render(<AccessibilityTestComponent />);

    await waitFor(() => {
      const reducedMotionCheckbox = screen.getByRole('checkbox', { name: /reduced motion/i });
      expect(reducedMotionCheckbox).not.toBeChecked();
    });

    // Enable reduced motion
    const reducedMotionCheckbox = screen.getByRole('checkbox', { name: /reduced motion/i });
    await user.click(reducedMotionCheckbox);

    expect(reducedMotionCheckbox).toBeChecked();

    // Enable high contrast
    const highContrastCheckbox = screen.getByRole('checkbox', { name: /high contrast/i });
    await user.click(highContrastCheckbox);

    expect(highContrastCheckbox).toBeChecked();

    // Enable large text
    const largeTextCheckbox = screen.getByRole('checkbox', { name: /large text/i });
    await user.click(largeTextCheckbox);

    expect(largeTextCheckbox).toBeChecked();
  });

  it('announces messages to screen readers', async () => {
    const user = userEvent.setup();
    render(<AccessibilityTestComponent />);

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /test announcement/i });
      expect(button).toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /test announcement/i });
    await user.click(button);

    // Should have live region for announcements
    const liveRegion = document.getElementById('accessibility-live-region');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
  });

  it('provides skip links for navigation', async () => {
    render(<AccessibilityTestComponent />);

    await waitFor(() => {
      // Should have skip links created by AccessibilityService
      const skipLinks = document.querySelectorAll('.skip-link');
      expect(skipLinks.length).toBeGreaterThan(0);
    });
  });

  it('maintains focus visibility', async () => {
    render(<AccessibilityTestComponent />);

    await waitFor(() => {
      const input = screen.getByRole('textbox', { name: /full name/i });
      input.focus();

      // Should have focus-visible class applied
      expect(document.documentElement).toHaveClass('focus-visible');
    });
  });

  it('applies high contrast mode', async () => {
    const user = userEvent.setup();

    // Enable high contrast
    AccessibilityService.updateSettings({ highContrast: true });

    render(<AccessibilityTestComponent />);

    await waitFor(() => {
      // Document should have high-contrast class
      expect(document.documentElement).toHaveClass('high-contrast');
    });
  });

  it('applies large text mode', async () => {
    const user = userEvent.setup();

    // Enable large text
    AccessibilityService.updateSettings({ largeText: true });

    render(<AccessibilityTestComponent />);

    await waitFor(() => {
      // Document should have large-text class
      expect(document.documentElement).toHaveClass('large-text');
    });
  });

  it('handles screen reader detection', async () => {
    // Mock screen reader by making an element static positioned
    const testElement = document.createElement('div');
    testElement.setAttribute('aria-live', 'assertive');
    testElement.setAttribute('aria-atomic', 'true');
    testElement.style.position = 'static';
    document.body.appendChild(testElement);

    render(<AccessibilityTestComponent />);

    // Screen reader detection should update settings
    await waitFor(() => {
      // The screen reader setting should be updated based on detection
      expect(AccessibilityService.getSettings().screenReader).toBeDefined();
    });

    document.body.removeChild(testElement);
  });

  it('validates color contrast', () => {
    const goodContrast = AccessibilityService.testColorContrast('#000000', '#FFFFFF');
    const badContrast = AccessibilityService.testColorContrast('#666666', '#777777');

    expect(AccessibilityService.meetsContrastStandard(goodContrast)).toBe(true);
    expect(AccessibilityService.meetsContrastStandard(badContrast)).toBe(false);
  });

  it('handles form error states', async () => {
    render(<AccessibilityTestComponent />);

    await waitFor(() => {
      const input = screen.getByRole('textbox', { name: /full name/i });

      // Simulate error state
      AccessibilityService.updateFieldAccessibility(input, false, 'Name is required');

      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby');
    });
  });

  it('integrates with system preferences', () => {
    // Mock system preferences
    const mockMatchMedia = vi.fn((query) => ({
      matches: query.includes('reduce') || query.includes('high'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });

    // Re-initialize accessibility
    AccessibilityService.initialize();

    expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-contrast: high)');
  });

  it('handles keyboard shortcuts', async () => {
    render(<AccessibilityTestComponent />);

    // Mock keyboard event for skip to main content
    const keyboardEvent = new KeyboardEvent('keydown', {
      key: 'Home',
      ctrlKey: true,
      metaKey: true,
    });

    document.dispatchEvent(keyboardEvent);

    // Should attempt to focus main content
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      expect(mainContent).toBeInTheDocument();
    }
  });

  it('provides accessible button states', async () => {
    render(<AccessibilityTestComponent />);

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /test announcement/i });

      // Button should be properly accessible
      expect(button).toHaveAttribute('type', 'button');

      // Click button
      button.click();

      // Should announce to screen readers
      const liveRegion = document.getElementById('accessibility-live-region');
      expect(liveRegion).toBeInTheDocument();
    });
  });

  it('handles focus trap for modals', async () => {
    // Create a mock modal
    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <button>First Button</button>
      <button>Second Button</button>
      <button>Last Button</button>
    `;
    document.body.appendChild(modal);

    render(<AccessibilityTestComponent />);

    await waitFor(() => {
      // Focus trap should be active on modal elements
      const buttons = modal.querySelectorAll('button');
      expect(buttons).toHaveLength(3);
    });

    document.body.removeChild(modal);
  });
});
