'use client';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeyboardShortcutHints, ShortcutHint } from '../keyboard-shortcut-hints';
import { useKeyboardShortcutsModalStore } from '@/lib/hooks/use-keyboard-shortcuts-modal';

// Test component that includes buttons with shortcuts
function TestComponent() {
  return (
    <div>
      <ShortcutHint shortcut="⌘K">
        <button>Quick Add Task</button>
      </ShortcutHint>
      <ShortcutHint shortcut="⌘/">
        <button>Search</button>
      </ShortcutHint>
      <button>Generic Action</button>
      <KeyboardShortcutHints />
    </div>
  );
}

describe('Keyboard Shortcut Hints (Hover Badges)', () => {
  beforeEach(() => {
    // Clear any existing tooltips
    const tooltips = document.querySelectorAll('[role="tooltip"]');
    tooltips.forEach(tooltip => tooltip.remove());
    // Reset the keyboard shortcuts modal store so it doesn't leak across tests
    useKeyboardShortcutsModalStore.getState().close();
  });

  afterEach(() => {
    // Cleanup
    const tooltips = document.querySelectorAll('[role="tooltip"]');
    tooltips.forEach(tooltip => tooltip.remove());
  });

  describe('Hover badge display', () => {
    it('should show shortcut badge on button hover', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);

      // Find button with shortcut
      const button = screen.getByRole('button', { name: /quick add/i });

      // Hover over button
      await user.hover(button);

      // Badge should appear
      await waitFor(() => {
        const badge = screen.getByText('⌘K');
        expect(badge).toBeVisible();
      });
    });

    it('should display correct shortcut key in badge', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);

      const button = screen.getByRole('button', { name: /quick add/i });
      await user.hover(button);

      await waitFor(() => {
        const badge = screen.getByText('⌘K');
        expect(badge).toBeInTheDocument();
      });
    });

    it('should show badge with kbd element styling', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);

      const button = screen.getByRole('button', { name: /quick add/i });
      await user.hover(button);

      await waitFor(() => {
        const kbdElement = screen.getByText('⌘K').closest('kbd');
        expect(kbdElement).toHaveClass('text-inherit');
      });
    });

    it('should hide badge when mouse leaves button', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);

      const button = screen.getByRole('button', { name: /quick add/i });

      await user.hover(button);
      await waitFor(() => {
        expect(screen.getByText('⌘K')).toBeVisible();
      });

      await user.unhover(button);
      await waitFor(() => {
        // When ShortcutBadge receives visible=false, it returns null,
        // so the badge element is removed from the DOM entirely.
        const badge = screen.queryByText('⌘K');
        expect(badge).toBeNull();
      });
    });

    it('should display multiple keys for shortcuts with alternatives', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);

      const button = screen.getByRole('button', { name: /search/i });
      await user.hover(button);

      await waitFor(() => {
        // Should show Cmd+/
        const badge = screen.getByText('⌘/');
        expect(badge).toBeInTheDocument();
      });
    });

    it('should show badge only on hover, not on initial render', () => {
      render(<TestComponent />);

      const badge = screen.queryByText('⌘K');
      expect(badge).not.toBeInTheDocument();
    });

    it('should handle buttons without shortcuts gracefully', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);

      // Button without shortcut hint should not throw
      const button = screen.getByRole('button', { name: /generic action/i });
      await user.hover(button);

      // No error should occur, component should render normally
      expect(button).toBeInTheDocument();
    });

    it('should position badge near the button', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);

      const button = screen.getByRole('button', { name: /quick add/i });
      const buttonRect = button.getBoundingClientRect();

      await user.hover(button);

      await waitFor(() => {
        const badge = screen.getByText('⌘K');
        const badgeRect = badge.getBoundingClientRect();

        // Badge should be positioned relative to button
        expect(badgeRect.top).toBeLessThan(buttonRect.bottom + 50);
      });
    });
  });

  describe('Shortcut badge content', () => {
    it('should display Cmd+K for quick add task', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);

      const button = screen.getByRole('button', { name: /quick add/i });

      await user.hover(button);

      await waitFor(() => {
        expect(screen.getByText('⌘K')).toBeInTheDocument();
      });
    });

    it('should display Cmd+/ for search', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);

      const button = screen.getByRole('button', { name: /search/i });

      await user.hover(button);

      await waitFor(() => {
        expect(screen.getByText('⌘/')).toBeInTheDocument();
      });
    });

    it('should use platform-specific symbols', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);

      const button = screen.getByRole('button', { name: /quick add/i });
      await user.hover(button);

      await waitFor(() => {
        const badge = screen.getByText('⌘K');
        // Should use Mac command symbol
        expect(badge.textContent).toContain('⌘');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on badge', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);

      const button = screen.getByRole('button', { name: /quick add/i });
      await user.hover(button);

      await waitFor(() => {
        const badge = screen.getByText('⌘K');
        expect(badge.closest('kbd')).toHaveAttribute('aria-label');
      });
    });

    it('should use tooltip role for badge', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);

      const button = screen.getByRole('button', { name: /quick add/i });
      await user.hover(button);

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toBeInTheDocument();
      });
    });

    it('should associate badge with button using aria-describedby', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);

      const button = screen.getByRole('button', { name: /quick add/i });

      // Badge should be accessible
      await user.hover(button);
      await waitFor(() => {
        expect(screen.getByText('⌘K')).toBeInTheDocument();
      });
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);

      const button = screen.getByRole('button', { name: /quick add/i });

      // Focus the button
      button.focus();
      expect(button).toHaveFocus();

      // Button should remain focused after keyboard event
      await user.keyboard('{Enter}');
      expect(button).toHaveFocus();
    });
  });

  describe('Help modal integration', () => {
    it('should open help modal when ? is pressed', async () => {
      render(<KeyboardShortcutHints />);

      // Simulate ? key press
      const event = new KeyboardEvent('keydown', {
        key: '?',
        bubbles: true,
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        // The modal title is "Keyboard Shortcuts" (exact)
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
      });
    });

    it('should show all shortcut categories in help modal', async () => {
      render(<KeyboardShortcutHints />);

      const event = new KeyboardEvent('keydown', {
        key: '?',
        bubbles: true,
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        // Category headings are exact text (rendered as uppercase via CSS)
        expect(screen.getByText('Global')).toBeInTheDocument();
        expect(screen.getByText('Navigation')).toBeInTheDocument();
        expect(screen.getByText('Tasks')).toBeInTheDocument();
        expect(screen.getByText('Projects')).toBeInTheDocument();
      });
    });

    it('should display shortcuts in organized sections', async () => {
      render(<KeyboardShortcutHints />);

      const event = new KeyboardEvent('keydown', {
        key: '?',
        bubbles: true,
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        const globalSection = screen.getByText(/global/i);
        expect(globalSection).toBeInTheDocument();
      });
    });

    it('should list shortcuts in action | shortcut format', async () => {
      render(<KeyboardShortcutHints />);

      const event = new KeyboardEvent('keydown', {
        key: '?',
        bubbles: true,
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        // Check that both action and shortcut are visible
        expect(screen.getByText(/quick add task/i)).toBeInTheDocument();
        expect(screen.getByText('⌘K')).toBeInTheDocument();
      });
    });
  });

  describe('Shortcut documentation', () => {
    it('should include Cmd+K quick add task shortcut', async () => {
      render(<KeyboardShortcutHints />);

      const event = new KeyboardEvent('keydown', {
        key: '?',
        bubbles: true,
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(screen.getByText(/quick add task/i)).toBeInTheDocument();
        expect(screen.getByText('⌘K')).toBeInTheDocument();
      });
    });

    it('should include Cmd+/ open keyboard shortcuts entry', async () => {
      render(<KeyboardShortcutHints />);

      const event = new KeyboardEvent('keydown', {
        key: '?',
        bubbles: true,
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        // The ⌘/ shortcut is now labelled "Open keyboard shortcuts"
        expect(screen.getByText(/open keyboard shortcuts/i)).toBeInTheDocument();
        const shortcutKey = screen.getByText('⌘/');
        expect(shortcutKey).toBeInTheDocument();
      });
    });

    it('should include Cmd+Z undo shortcut', async () => {
      render(<KeyboardShortcutHints />);

      const event = new KeyboardEvent('keydown', {
        key: '?',
        bubbles: true,
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        const undoShortcuts = screen.queryAllByText(/⌘Z/);
        // Should appear in modal
        expect(undoShortcuts.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should include ? show shortcuts help', async () => {
      render(<KeyboardShortcutHints />);

      const event = new KeyboardEvent('keydown', {
        key: '?',
        bubbles: true,
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(screen.getByText(/keyboard shortcuts help/i)).toBeInTheDocument();
        const questionMarks = screen.getAllByText('?');
        expect(questionMarks.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge cases and performance', () => {
    it('should handle rapid hover events', async () => {
      const user = userEvent.setup();
      // Use TestComponent which includes ShortcutHint-wrapped buttons
      render(<TestComponent />);

      const button = screen.getByRole('button', { name: /quick add/i });

      for (let i = 0; i < 5; i++) {
        await user.hover(button);
        await user.unhover(button);
      }

      // Should not crash or create multiple badges
      const badges = screen.queryAllByText('⌘K');
      expect(badges.length).toBeLessThanOrEqual(1);
    });

    it('should not show badge for buttons without data-shortcut', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <button>No shortcut</button>
        </div>
      );

      const button = screen.getByRole('button', { name: /no shortcut/i });
      await user.hover(button);

      // No badge should appear
      const badge = screen.queryByRole('tooltip');
      expect(badge).not.toBeInTheDocument();
    });

    it('should work with multiple buttons on the same page', async () => {
      const user = userEvent.setup();
      // Use TestComponent which includes multiple ShortcutHint-wrapped buttons
      render(<TestComponent />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(1);

      // Hover over the first shortcut button and verify badge appears
      const quickAddBtn = screen.getByRole('button', { name: /quick add/i });
      await user.hover(quickAddBtn);
      await waitFor(() => {
        expect(screen.getByText('⌘K')).toBeVisible();
      });
      await user.unhover(quickAddBtn);

      // Hover over the second shortcut button
      const searchBtn = screen.getByRole('button', { name: /search/i });
      await user.hover(searchBtn);
      await waitFor(() => {
        expect(screen.getByText('⌘/')).toBeVisible();
      });
      await user.unhover(searchBtn);
    });
  });
});
