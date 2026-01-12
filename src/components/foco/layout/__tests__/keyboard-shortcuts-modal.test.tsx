'use client';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeyboardShortcutsModal } from '../keyboard-shortcuts-modal';

describe('KeyboardShortcutsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Opening the modal', () => {
    it('should open modal when ? key is pressed', async () => {
      render(<KeyboardShortcutsModal />);

      fireEvent.keyDown(window, { key: '?' });

      await waitFor(() => {
        expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
      });
    });

    it('should open modal when Cmd+/ is pressed on Mac', async () => {
      render(<KeyboardShortcutsModal />);

      fireEvent.keyDown(window, {
        key: '/',
        metaKey: true
      });

      await waitFor(() => {
        expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
      });
    });

    it('should open modal when Ctrl+/ is pressed on Windows/Linux', async () => {
      render(<KeyboardShortcutsModal />);

      fireEvent.keyDown(window, {
        key: '/',
        ctrlKey: true
      });

      await waitFor(() => {
        expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
      });
    });
  });

  describe('Modal display', () => {
    it('should display all shortcut categories', async () => {
      render(<KeyboardShortcutsModal />);

      fireEvent.keyDown(window, { key: '?' });

      await waitFor(() => {
        expect(screen.getByText(/navigation/i)).toBeInTheDocument();
        expect(screen.getByText(/tasks/i)).toBeInTheDocument();
        expect(screen.getByText(/global/i)).toBeInTheDocument();
      });
    });

    it('should show shortcut key combinations', async () => {
      render(<KeyboardShortcutsModal />);

      fireEvent.keyDown(window, { key: '?' });

      await waitFor(() => {
        expect(screen.getByText('⌘K', { selector: 'kbd' })).toBeInTheDocument();
      });
    });

    it('should show shortcut descriptions', async () => {
      render(<KeyboardShortcutsModal />);

      fireEvent.keyDown(window, { key: '?' });

      await waitFor(() => {
        expect(screen.getByText(/quick add task/i)).toBeInTheDocument();
        expect(screen.getByText(/keyboard shortcuts help/i)).toBeInTheDocument();
      });
    });

    it('should display shortcuts organized by category', async () => {
      render(<KeyboardShortcutsModal />);

      fireEvent.keyDown(window, { key: '?' });

      await waitFor(() => {
        const navigationSection = screen.getByText(/navigation/i);
        expect(navigationSection).toBeInTheDocument();

        // Check that sections exist and are organized
        expect(screen.getByText(/global/i)).toBeInTheDocument();
      });
    });
  });

  describe('Modal closing', () => {
    it('should close modal when Esc key is pressed', async () => {
      render(<KeyboardShortcutsModal />);

      // Open modal
      fireEvent.keyDown(window, { key: '?' });

      await waitFor(() => {
        expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
      });

      // Close modal
      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText(/keyboard shortcuts/i)).not.toBeInTheDocument();
      });
    });

    it('should close modal when clicking backdrop', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcutsModal />);

      // Open modal
      fireEvent.keyDown(window, { key: '?' });

      await waitFor(() => {
        expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
      });

      // Click on the dialog overlay (backdrop)
      const overlay = document.querySelector('[data-aria-hidden="true"]');
      if (overlay && overlay.parentElement) {
        const backdrop = overlay.parentElement.querySelector('[style*="pointer-events: auto"]');
        if (backdrop) {
          await user.click(backdrop as HTMLElement);
        }
      }

      await waitFor(() => {
        expect(screen.queryByText(/keyboard shortcuts/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should close modal when clicking close button', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcutsModal />);

      // Open modal
      fireEvent.keyDown(window, { key: '?' });

      await waitFor(() => {
        expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
      });

      // Look for close button in dialog header
      const buttons = screen.getAllByRole('button');
      const closeButton = buttons[0]; // First button should be close in DialogContent

      if (closeButton) {
        await user.click(closeButton);
      }

      await waitFor(() => {
        expect(screen.queryByText(/keyboard shortcuts/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Search functionality', () => {
    it('should be searchable by shortcut key', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcutsModal />);

      fireEvent.keyDown(window, { key: '?' });

      await waitFor(() => {
        expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search shortcuts/i);
      await user.type(searchInput, 'cmd');

      await waitFor(() => {
        // Should show shortcuts containing cmd
        expect(screen.getByText(/quick add task/i)).toBeInTheDocument();
      });
    });

    it('should be searchable by shortcut description', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcutsModal />);

      fireEvent.keyDown(window, { key: '?' });

      await waitFor(() => {
        expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search shortcuts/i);
      await user.type(searchInput, 'go to');

      await waitFor(() => {
        expect(screen.getByText(/go to home/i)).toBeInTheDocument();
      });
    });

    it('should show no results when no shortcuts match search', async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcutsModal />);

      fireEvent.keyDown(window, { key: '?' });

      await waitFor(() => {
        expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search shortcuts/i);
      await user.type(searchInput, 'xyznotfound');

      await waitFor(() => {
        expect(screen.getByText(/no shortcuts found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Shortcuts content', () => {
    it('should include Cmd/Ctrl+K for quick add task', async () => {
      render(<KeyboardShortcutsModal />);

      fireEvent.keyDown(window, { key: '?' });

      await waitFor(() => {
        expect(screen.getByText(/quick add task/i)).toBeInTheDocument();
        const kbds = screen.getAllByText('⌘K', { selector: 'kbd' });
        expect(kbds.length).toBeGreaterThan(0);
      });
    });

    it('should include ? key for help modal', async () => {
      render(<KeyboardShortcutsModal />);

      fireEvent.keyDown(window, { key: '?' });

      await waitFor(() => {
        expect(screen.getByText(/keyboard shortcuts help/i)).toBeInTheDocument();
        const kbds = screen.getAllByText('?', { selector: 'kbd' });
        expect(kbds.length).toBeGreaterThan(0);
      });
    });

    it('should include Esc key for closing dialogs', async () => {
      render(<KeyboardShortcutsModal />);

      fireEvent.keyDown(window, { key: '?' });

      await waitFor(() => {
        expect(screen.getByText(/close dialogs/i)).toBeInTheDocument();
        const kbds = screen.getAllByText('Esc', { selector: 'kbd' });
        expect(kbds.length).toBeGreaterThan(0);
      });
    });

    it('should include navigation shortcuts', async () => {
      render(<KeyboardShortcutsModal />);

      fireEvent.keyDown(window, { key: '?' });

      await waitFor(() => {
        expect(screen.getByText(/go to home/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive design', () => {
    it('should have dialog role for accessibility', async () => {
      render(<KeyboardShortcutsModal />);

      fireEvent.keyDown(window, { key: '?' });

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
      });
    });

    it('should show search input with correct placeholder', async () => {
      render(<KeyboardShortcutsModal />);

      fireEvent.keyDown(window, { key: '?' });

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search shortcuts/i);
        expect(searchInput).toBeInTheDocument();
      });
    });
  });

  describe('Edge cases', () => {
    it('should open modal when ? is pressed', async () => {
      render(<KeyboardShortcutsModal />);

      fireEvent.keyDown(window, { key: '?' });

      await waitFor(() => {
        expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
      });
    });

    it('should handle rapid open/close', async () => {
      render(<KeyboardShortcutsModal />);

      // Open
      fireEvent.keyDown(window, { key: '?' });

      await waitFor(() => {
        expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
      });

      // Close
      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText(/keyboard shortcuts/i)).not.toBeInTheDocument();
      });

      // Open again
      fireEvent.keyDown(window, { key: '?' });

      await waitFor(() => {
        expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
      });
    });
  });
});
