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

describe('Command Palette - Simple Navigation Tests', () => {
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

  it('should call router.push with correct path when clicking "Go to Dashboard"', async () => {
    useCommandPaletteStore.getState().open('search');
    render(<CommandPalette />);

    const dashboardButton = screen.getByRole('option', { name: /go to dashboard/i });
    await user.click(dashboardButton);

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('should call router.push with correct path when clicking "Go to Dispatch"', async () => {
    useCommandPaletteStore.getState().open('search');
    render(<CommandPalette />);

    const dispatchButton = screen.getByRole('option', { name: /go to dispatch/i });
    await user.click(dispatchButton);

    expect(mockPush).toHaveBeenCalledWith('/dashboard?view=dispatch');
  });

  it('should close modal after navigation', async () => {
    useCommandPaletteStore.getState().open('search');
    expect(useCommandPaletteStore.getState().isOpen).toBe(true);

    render(<CommandPalette />);

    const dashboardButton = screen.getByRole('option', { name: /go to dashboard/i });
    await user.click(dashboardButton);

    await waitFor(() => {
      expect(useCommandPaletteStore.getState().isOpen).toBe(false);
    });
  });

  it('should call router.push before closing modal', async () => {
    useCommandPaletteStore.getState().open('search');
    render(<CommandPalette />);

    const dashboardButton = screen.getByRole('option', { name: /go to dashboard/i });
    await user.click(dashboardButton);

    expect(mockPush).toHaveBeenCalledWith('/dashboard');

    await waitFor(() => {
      expect(useCommandPaletteStore.getState().isOpen).toBe(false);
    });
  });

  it('should support Enter key navigation', async () => {
    useCommandPaletteStore.getState().open('search');
    render(<CommandPalette />);

    // Type Enter to select the first command (Go to Home)
    const input = screen.getByPlaceholderText(/type a command/i);
    await user.click(input);
    await user.keyboard('{Enter}');

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

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
