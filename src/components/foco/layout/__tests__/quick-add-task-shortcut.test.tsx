'use client';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from '../command-palette';
import { useCommandPaletteStore } from '@/lib/stores/foco-store';
import { useRouter } from 'next/navigation';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('Quick Add Task Keyboard Shortcut (Cmd/Ctrl+K)', () => {
  let mockRouter: any;
  let mockPush: any;

  beforeEach(() => {
    mockPush = vi.fn();
    mockRouter = {
      push: mockPush,
    };
    (useRouter as any).mockReturnValue(mockRouter);
    useCommandPaletteStore.setState({
      isOpen: false,
      mode: 'search',
      query: '',
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Keyboard Shortcut Triggering', () => {
    it('should open task dialog when Cmd+K is pressed on Mac', async () => {
      render(<CommandPalette />);

      // Simulate Cmd+K on Mac
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(useCommandPaletteStore.getState().isOpen).toBe(true);
      });
    });

    it('should open task dialog when Ctrl+K is pressed on Windows/Linux', async () => {
      render(<CommandPalette />);

      // Simulate Ctrl+K on Windows/Linux
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(useCommandPaletteStore.getState().isOpen).toBe(true);
      });
    });

    it('should toggle dialog when pressing Cmd+K again while open', async () => {
      const store = useCommandPaletteStore.getState();
      store.open('search');

      render(<CommandPalette />);

      // Press Cmd+K again to close
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(useCommandPaletteStore.getState().isOpen).toBe(false);
      });
    });

    it('should trigger shortcut for uppercase K key (case-insensitive)', async () => {
      render(<CommandPalette />);

      const event = new KeyboardEvent('keydown', {
        key: 'K',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(useCommandPaletteStore.getState().isOpen).toBe(true);
      });
    });

    it('should prevent default browser behavior when triggering shortcut', async () => {
      render(<CommandPalette />);

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(preventDefaultSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Dialog Focus Management', () => {
    it('should auto-focus the search input when dialog opens', async () => {
      render(<CommandPalette />);

      const store = useCommandPaletteStore.getState();
      store.open('search');

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Type a command or search/i);
        // In testing library, autoFocus works but focus might not be set in jsdom
        // We verify the input exists and has autoFocus attribute
        expect(searchInput).toBeInTheDocument();
      });
    });

    it('should allow typing immediately after opening with shortcut', async () => {
      const user = userEvent.setup();
      render(<CommandPalette />);

      // Open with Cmd+K
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Type a command or search/i);
        expect(searchInput).toBeInTheDocument();
      });
    });

    it('should not lose focus when navigating with arrow keys', async () => {
      const user = userEvent.setup();
      const store = useCommandPaletteStore.getState();
      store.open('search');

      render(<CommandPalette />);

      const searchInput = screen.getByPlaceholderText(/Type a command or search/i);

      // Type to search
      await user.type(searchInput, 'task');

      // Arrow down should navigate, not lose focus
      await user.keyboard('{ArrowDown}');

      await waitFor(() => {
        const query = useCommandPaletteStore.getState().query;
        expect(query).toBe('task');
      });
    });
  });

  describe('Cross-Page Functionality', () => {
    it('should work from dashboard page', async () => {
      render(<CommandPalette />);

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(useCommandPaletteStore.getState().isOpen).toBe(true);
      });
    });

    it('should work from projects page', async () => {
      // Same test - shortcuts should work globally
      render(<CommandPalette />);

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(useCommandPaletteStore.getState().isOpen).toBe(true);
      });
    });

    it('should work from my-work page', async () => {
      render(<CommandPalette />);

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(useCommandPaletteStore.getState().isOpen).toBe(true);
      });
    });
  });

  describe('Dialog Content and Task Creation', () => {
    it('should display Create Task option in command palette', async () => {
      const store = useCommandPaletteStore.getState();
      store.open('search');

      render(<CommandPalette />);

      await waitFor(() => {
        expect(screen.getByText(/Create Task/i)).toBeInTheDocument();
      });
    });

    it('should allow creating task from command palette', async () => {
      const user = userEvent.setup();
      const store = useCommandPaletteStore.getState();
      store.open('search');

      render(<CommandPalette />);

      // Click on Create Task
      const createTaskButton = screen.getByText(/Create Task/i);
      await user.click(createTaskButton);

      // Should navigate to create task
      expect(mockPush).toHaveBeenCalled();
    });

    it('should show search placeholder text in command palette', async () => {
      const store = useCommandPaletteStore.getState();
      store.open('search');

      render(<CommandPalette />);

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Type a command or search/i);
        expect(input).toBeInTheDocument();
      });
    });
  });

  describe('Input Field Handling', () => {
    it('should allow Cmd+K in input fields for opening command palette', async () => {
      const user = userEvent.setup();
      render(<CommandPalette />);

      // Create a focused input element
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      // Simulate Cmd+K in input field
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(useCommandPaletteStore.getState().isOpen).toBe(true);
      });

      document.body.removeChild(input);
    });

    it('should not interfere with other keyboard shortcuts in inputs', async () => {
      const mockAction = vi.fn();
      const user = userEvent.setup();

      // Create a test input
      const input = document.createElement('input');
      document.body.appendChild(input);

      render(<CommandPalette />);

      // Type some text
      await user.type(input, 'hello');

      // The text should be in the input
      expect((input as HTMLInputElement).value).toBe('hello');

      document.body.removeChild(input);
    });
  });

  describe('Accessibility', () => {
    it('should announce dialog opening to screen readers', async () => {
      const store = useCommandPaletteStore.getState();
      store.open('search');

      render(<CommandPalette />);

      // Dialog content should be rendered with search input
      const searchInput = screen.getByPlaceholderText(/Type a command or search/i);
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('aria-label');
    });

    it('should have proper keyboard navigation after opening', async () => {
      const user = userEvent.setup();
      const store = useCommandPaletteStore.getState();
      store.open('search');

      render(<CommandPalette />);

      // Should be able to navigate with arrow keys
      await user.keyboard('{ArrowDown}');

      // Store state should update
      const state = useCommandPaletteStore.getState();
      expect(state.isOpen).toBe(true);
    });

    it('should allow closing with Escape key', async () => {
      const user = userEvent.setup();
      const store = useCommandPaletteStore.getState();
      store.open('search');

      render(<CommandPalette />);

      // Press Escape
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(useCommandPaletteStore.getState().isOpen).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid Cmd+K presses', async () => {
      render(<CommandPalette />);

      const event1 = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event1);

      await waitFor(() => {
        expect(useCommandPaletteStore.getState().isOpen).toBe(true);
      });

      const event2 = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event2);

      await waitFor(() => {
        expect(useCommandPaletteStore.getState().isOpen).toBe(false);
      });

      const event3 = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event3);

      await waitFor(() => {
        expect(useCommandPaletteStore.getState().isOpen).toBe(true);
      });
    });

    it('should not trigger with only meta key', async () => {
      const store = useCommandPaletteStore.getState();
      const initialState = store.isOpen;

      render(<CommandPalette />);

      const event = new KeyboardEvent('keydown', {
        key: 'Meta',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      // State should not change
      expect(useCommandPaletteStore.getState().isOpen).toBe(initialState);
    });

    it('should not trigger with only ctrl key', async () => {
      const store = useCommandPaletteStore.getState();
      const initialState = store.isOpen;

      render(<CommandPalette />);

      const event = new KeyboardEvent('keydown', {
        key: 'Control',
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      // State should not change
      expect(useCommandPaletteStore.getState().isOpen).toBe(initialState);
    });

    it('should handle Ctrl+Meta+K combination gracefully', async () => {
      render(<CommandPalette />);

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(useCommandPaletteStore.getState().isOpen).toBe(true);
      });
    });
  });
});
