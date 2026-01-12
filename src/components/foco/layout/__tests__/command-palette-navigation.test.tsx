'use client';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from '../command-palette';
import { useCommandPaletteStore } from '@/lib/stores/foco-store';
import { useRouter } from 'next/navigation';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('Command Palette Navigation', () => {
  let mockRouter: any;
  let mockPush: any;
  let mockClose: any;

  beforeEach(() => {
    mockPush = vi.fn();
    mockRouter = {
      push: mockPush,
    };
    (useRouter as any).mockReturnValue(mockRouter);

    // Reset store
    useCommandPaletteStore.setState({
      isOpen: false,
      mode: 'search',
      query: '',
    });

    vi.clearAllMocks();
  });

  describe('Click Navigation', () => {
    it('should navigate to dashboard when clicking "Go to Home" command', async () => {
      useCommandPaletteStore.getState().open('search');

      render(<CommandPalette />);

      const homeButton = screen.getByRole('button', { name: /go to home/i });
      await userEvent.click(homeButton);

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('should navigate to inbox when clicking "Go to Inbox" command', async () => {
      useCommandPaletteStore.getState().open('search');

      render(<CommandPalette />);

      const inboxButton = screen.getByRole('button', { name: /go to inbox/i });
      await userEvent.click(inboxButton);

      expect(mockPush).toHaveBeenCalledWith('/inbox');
    });

    it('should navigate to projects when clicking "Go to Projects" command', async () => {
      useCommandPaletteStore.getState().open('search');

      render(<CommandPalette />);

      const projectsButton = screen.getByRole('button', { name: /go to projects/i });
      await userEvent.click(projectsButton);

      expect(mockPush).toHaveBeenCalledWith('/projects');
    });

    it('should navigate to settings when clicking "Go to Settings" command', async () => {
      useCommandPaletteStore.getState().open('search');

      render(<CommandPalette />);

      const settingsButton = screen.getByRole('button', { name: /go to settings/i });
      await userEvent.click(settingsButton);

      expect(mockPush).toHaveBeenCalledWith('/settings');
    });

    it('should navigate with correct query params for create project', async () => {
      useCommandPaletteStore.getState().open('search');

      render(<CommandPalette />);

      const createProjectButton = screen.getByRole('button', { name: /create project/i });
      await userEvent.click(createProjectButton);

      expect(mockPush).toHaveBeenCalledWith('/projects?create=true');
    });

    it('should navigate to project detail page', async () => {
      useCommandPaletteStore.getState().open('search');

      render(<CommandPalette />);

      const projectButton = screen.getByRole('button', { name: /website redesign/i });
      await userEvent.click(projectButton);

      expect(mockPush).toHaveBeenCalledWith('/projects/website-redesign');
    });
  });

  describe('Modal Closure', () => {
    it('should close the modal after navigating', async () => {
      useCommandPaletteStore.getState().open('search');

      render(<CommandPalette />);

      expect(useCommandPaletteStore.getState().isOpen).toBe(true);

      const homeButton = screen.getByRole('button', { name: /go to home/i });
      await userEvent.click(homeButton);

      expect(useCommandPaletteStore.getState().isOpen).toBe(false);
    });

    it('should clear query when closing modal', async () => {
      const store = useCommandPaletteStore.getState();
      store.open('search');
      store.setQuery('dashboard');

      render(<CommandPalette />);

      const homeButton = screen.getByRole('button', { name: /go to home/i });
      await userEvent.click(homeButton);

      expect(useCommandPaletteStore.getState().query).toBe('');
    });

    it('should close when pressing Escape key', async () => {
      useCommandPaletteStore.getState().open('search');

      render(<CommandPalette />);

      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(useCommandPaletteStore.getState().isOpen).toBe(false);
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should execute command when pressing Enter on selected item', async () => {
      useCommandPaletteStore.getState().open('search');

      render(<CommandPalette />);

      fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
    });

    it('should navigate down with ArrowDown key', async () => {
      useCommandPaletteStore.getState().open('search');

      const { container } = render(<CommandPalette />);

      const buttons = container.querySelectorAll('button[class*="flex"]');
      const firstButton = buttons[0] as HTMLElement;
      const secondButton = buttons[1] as HTMLElement;

      // First button should have highlight
      expect(firstButton.className).toContain('bg-zinc-100');

      fireEvent.keyDown(window, { key: 'ArrowDown', code: 'ArrowDown' });

      await waitFor(() => {
        expect(secondButton.className).toContain('bg-zinc-100');
      });
    });

    it('should navigate up with ArrowUp key', async () => {
      useCommandPaletteStore.getState().open('search');

      const { container } = render(<CommandPalette />);

      // Navigate down once
      fireEvent.keyDown(window, { key: 'ArrowDown', code: 'ArrowDown' });

      // Navigate up
      fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp' });

      await waitFor(() => {
        const buttons = container.querySelectorAll('button[class*="flex"]');
        const firstButton = buttons[0] as HTMLElement;
        expect(firstButton.className).toContain('bg-zinc-100');
      });
    });

    it('should not go above first item when pressing ArrowUp', async () => {
      useCommandPaletteStore.getState().open('search');

      render(<CommandPalette />);

      fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp' });

      // Should still work - first item should be selected
      fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should not go below last item when pressing ArrowDown', async () => {
      useCommandPaletteStore.getState().open('search');

      const { container } = render(<CommandPalette />);

      const buttons = container.querySelectorAll('button[class*="flex"]');
      const lastIndex = buttons.length - 1;

      // Press down multiple times
      for (let i = 0; i < lastIndex + 10; i++) {
        fireEvent.keyDown(window, { key: 'ArrowDown', code: 'ArrowDown' });
      }

      // Should still be on last button
      const lastButton = buttons[lastIndex] as HTMLElement;

      await waitFor(() => {
        expect(lastButton.className).toContain('bg-zinc-100');
      });
    });
  });

  describe('Search/Filtering', () => {
    it('should filter commands by search query', async () => {
      useCommandPaletteStore.getState().open('search');

      const { container } = render(<CommandPalette />);

      const input = container.querySelector('input') as HTMLInputElement;
      await userEvent.type(input, 'dashboard');

      await waitFor(() => {
        expect(input.value).toBe('dashboard');
      });

      // Should show dashboard-related items
      const results = screen.queryAllByRole('button');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should show no results message when search returns nothing', async () => {
      useCommandPaletteStore.getState().open('search');

      const { container } = render(<CommandPalette />);

      const input = container.querySelector('input') as HTMLInputElement;
      await userEvent.type(input, 'nonexistentcommand');

      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      });
    });

    it('should reset selection index when query changes', async () => {
      useCommandPaletteStore.getState().open('search');

      const { container } = render(<CommandPalette />);

      const input = container.querySelector('input') as HTMLInputElement;

      // Navigate to second item
      fireEvent.keyDown(window, { key: 'ArrowDown', code: 'ArrowDown' });

      // Type to filter
      await userEvent.type(input, 'home');

      await waitFor(() => {
        // First item should be selected after filtering
        const buttons = container.querySelectorAll('button[class*="flex"]');
        const firstButton = buttons[0] as HTMLElement;
        expect(firstButton.className).toContain('bg-zinc-100');
      });
    });

    it('should filter by keywords', async () => {
      useCommandPaletteStore.getState().open('search');

      const { container } = render(<CommandPalette />);

      const input = container.querySelector('input') as HTMLInputElement;
      await userEvent.type(input, 'tasks');

      await waitFor(() => {
        // Should show "Go to My Work" which has 'tasks' keyword
        expect(screen.getByRole('button', { name: /go to my work/i })).toBeInTheDocument();
      });
    });
  });

  describe('Mouse Interactions', () => {
    it('should select item on hover', async () => {
      useCommandPaletteStore.getState().open('search');

      const { container } = render(<CommandPalette />);

      const buttons = container.querySelectorAll('button[class*="flex"]');
      const secondButton = buttons[1] as HTMLElement;

      fireEvent.mouseEnter(secondButton);

      await waitFor(() => {
        expect(secondButton.className).toContain('bg-zinc-100');
      });
    });

    it('should navigate to page when clicking hovered item', async () => {
      useCommandPaletteStore.getState().open('search');

      const { container } = render(<CommandPalette />);

      const buttons = container.querySelectorAll('button[class*="flex"]');
      const secondButton = buttons[1] as HTMLElement;

      fireEvent.mouseEnter(secondButton);
      await userEvent.click(secondButton);

      expect(mockPush).toHaveBeenCalledWith('/inbox');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid command execution', async () => {
      useCommandPaletteStore.getState().open('search');

      render(<CommandPalette />);

      const homeButton = screen.getByRole('button', { name: /go to home/i });

      // Rapidly click
      await userEvent.click(homeButton);
      await userEvent.click(homeButton);

      // Should only call once
      expect(mockPush).toHaveBeenCalledTimes(1);
    });

    it('should handle empty query correctly', async () => {
      useCommandPaletteStore.getState().open('search');

      render(<CommandPalette />);

      // All commands should be visible
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should maintain selection state during arrow navigation', async () => {
      useCommandPaletteStore.getState().open('search');

      const { container } = render(<CommandPalette />);

      fireEvent.keyDown(window, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(window, { key: 'ArrowDown', code: 'ArrowDown' });

      const buttons = container.querySelectorAll('button[class*="flex"]');
      const thirdButton = buttons[2] as HTMLElement;

      await waitFor(() => {
        expect(thirdButton.className).toContain('bg-zinc-100');
      });
    });
  });
});
