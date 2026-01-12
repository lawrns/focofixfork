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

  describe('Click Navigation', () => {
    it('should navigate when clicking first command (Go to Home)', async () => {
      useCommandPaletteStore.getState().open('search');
      const { container } = render(<CommandPalette />);

      // Get all buttons in the command list
      const buttons = container.querySelectorAll('[role="option"]');
      const firstButton = buttons[0] as HTMLElement;

      // Click first button
      await userEvent.click(firstButton);

      // Should call router.push with dashboard path
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('should navigate to inbox when clicking second command', async () => {
      useCommandPaletteStore.getState().open('search');
      const { container } = render(<CommandPalette />);

      const buttons = container.querySelectorAll('[role="option"]');
      const secondButton = buttons[1] as HTMLElement;

      await userEvent.click(secondButton);

      expect(mockPush).toHaveBeenCalledWith('/inbox');
    });

    it('should navigate to projects when clicking projects button', async () => {
      useCommandPaletteStore.getState().open('search');
      const { container } = render(<CommandPalette />);

      const buttons = container.querySelectorAll('[role="option"]');
      // "Go to Projects" is the 4th button in Navigation group
      const projectsButton = buttons[3] as HTMLElement;

      await userEvent.click(projectsButton);

      expect(mockPush).toHaveBeenCalledWith('/projects');
    });
  });

  describe('Modal Closes After Navigation', () => {
    it('should close modal when clicking a command', async () => {
      const store = useCommandPaletteStore.getState();
      store.open('search');
      expect(store.isOpen).toBe(true);

      const { container } = render(<CommandPalette />);
      const buttons = container.querySelectorAll('[role="option"]');
      const firstButton = buttons[0] as HTMLElement;

      await userEvent.click(firstButton);

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

      await userEvent.click(firstButton);

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

      await userEvent.keyboard('{Escape}');

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
      await userEvent.keyboard('{Enter}');

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
        await userEvent.click(createProjectBtn);
        expect(mockPush).toHaveBeenCalledWith('/projects?create=true');
      }
    });
  });
});
