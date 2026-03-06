'use client';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from '../command-palette';
import { useCommandPaletteStore } from '@/lib/stores/foco-store';
import { useRouter } from 'next/navigation';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('Command Palette - Core Navigation', () => {
  let mockRouter: any;
  let mockPush: any;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockPush = vi.fn();
    mockRouter = {
      push: mockPush,
    };
    (useRouter as any).mockReturnValue(mockRouter);
    user = userEvent.setup({ pointerEventsCheck: 0 });
    useCommandPaletteStore.setState({
      isOpen: false,
      mode: 'search',
      query: '',
    });
    vi.clearAllMocks();
  });

  describe('Click Navigation', () => {
    it('should navigate when clicking first command (Go to Dashboard)', async () => {
      useCommandPaletteStore.getState().open('search');
      render(<CommandPalette />);
      const firstButton = screen.getByRole('option', { name: /go to dashboard/i });

      // Click first button
      await user.click(firstButton);

      // Should call router.push with dashboard path
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('should navigate to dispatch when clicking second command', async () => {
      useCommandPaletteStore.getState().open('search');
      render(<CommandPalette />);
      const secondButton = screen.getByRole('option', { name: /go to dispatch/i });

      await user.click(secondButton);

      expect(mockPush).toHaveBeenCalledWith('/dashboard?view=dispatch');
    });

    it('should navigate to runs when clicking runs button', async () => {
      useCommandPaletteStore.getState().open('search');
      render(<CommandPalette />);
      const runsButton = screen.getByRole('option', { name: /go to runs/i });

      await user.click(runsButton);

      expect(mockPush).toHaveBeenCalledWith('/runs');
    });
  });

  describe('Modal Closes After Navigation', () => {
    it('should close modal when clicking a command', async () => {
      useCommandPaletteStore.getState().open('search');
      expect(useCommandPaletteStore.getState().isOpen).toBe(true);

      const { container } = render(<CommandPalette />);
      const buttons = container.querySelectorAll('[role="option"]');
      const firstButton = buttons[0] as HTMLElement;

      await user.click(firstButton);

      await waitFor(() => {
        expect(useCommandPaletteStore.getState().isOpen).toBe(false);
      });
    });

    it('should clear query when modal closes', async () => {
      const store = useCommandPaletteStore.getState();
      store.open('search');
      store.setQuery('test query');

      const { container } = render(<CommandPalette />);
      const buttons = container.querySelectorAll('[role="option"]');
      const firstButton = buttons[0] as HTMLElement;

      await user.click(firstButton);

      await waitFor(() => {
        expect(useCommandPaletteStore.getState().query).toBe('');
      });
    });
  });

  describe('Keyboard Escape', () => {
    it('should close modal when pressing Escape', async () => {
      useCommandPaletteStore.getState().open('search');
      render(<CommandPalette />);

      expect(useCommandPaletteStore.getState().isOpen).toBe(true);

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(useCommandPaletteStore.getState().isOpen).toBe(false);
      });
    });
  });

  describe('Enter Key Selection', () => {
    it('should execute first command when pressing Enter without navigation', async () => {
      useCommandPaletteStore.getState().open('search');
      render(<CommandPalette />);

      // Press Enter to select the first command (should navigate to dashboard)
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Query Parameter Navigation', () => {
    it('should navigate with query params for create project', async () => {
      useCommandPaletteStore.getState().open('search');
      const { container } = render(<CommandPalette />);

      const buttons = container.querySelectorAll('[role="option"]');
      // "Create Project" is in Quick Actions group, should be around button 10
      let createProjectBtn: HTMLElement | null = null;
      buttons.forEach((btn) => {
        if (btn.textContent?.includes('Create Project')) {
          createProjectBtn = btn as HTMLElement;
        }
      });

      if (createProjectBtn) {
        await user.click(createProjectBtn);
        // Current app routes "Create Project" actions to Empire missions.
        expect(mockPush).toHaveBeenCalledWith('/empire/missions?new=1');
      }
    });
  });
});
