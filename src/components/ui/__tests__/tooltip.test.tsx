import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../tooltip';

describe('Tooltip Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('Basic Rendering', () => {
    it('renders tooltip trigger', () => {
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent>Tooltip content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      expect(screen.getByRole('button', { name: /hover me/i })).toBeInTheDocument();
    });

    it('renders tooltip content hidden by default', () => {
      const { queryByText } = render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent>Tooltip content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      expect(queryByText('Tooltip content')).not.toBeInTheDocument();
    });
  });

  describe('Hover Behavior', () => {
    it('shows tooltip on hover', async () => {
      const user = userEvent.setup({ delay: null });
      const { queryByText } = render(
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent>Tooltip content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button', { name: /hover me/i });

      await user.hover(trigger);

      await waitFor(() => {
        expect(queryByText('Tooltip content')).toBeInTheDocument();
      });
    });

    it('hides tooltip on mouse leave', async () => {
      const user = userEvent.setup({ delay: null });
      const { queryByText } = render(
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent>Tooltip content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button', { name: /hover me/i });

      await user.hover(trigger);

      await waitFor(() => {
        expect(queryByText('Tooltip content')).toBeInTheDocument();
      });

      await user.unhover(trigger);

      await waitFor(() => {
        expect(queryByText('Tooltip content')).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Keyboard Accessibility', () => {
    it('shows tooltip on focus', async () => {
      const user = userEvent.setup({ delay: null });
      const { queryByText } = render(
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent>Tooltip content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button', { name: /hover me/i });

      trigger.focus();

      await waitFor(() => {
        expect(queryByText('Tooltip content')).toBeInTheDocument();
      });
    });

    it('hides tooltip on blur', async () => {
      const user = userEvent.setup({ delay: null });
      const { container, queryByText } = render(
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent>Tooltip content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button', { name: /hover me/i });

      trigger.focus();

      await waitFor(() => {
        expect(queryByText('Tooltip content')).toBeInTheDocument();
      });

      // Move focus away
      const input = document.createElement('input');
      container.appendChild(input);
      input.focus();

      await waitFor(() => {
        expect(queryByText('Tooltip content')).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Positioning', () => {
    it('renders tooltip content with correct positioning', async () => {
      const user = userEvent.setup({ delay: null });
      const { queryByText } = render(
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent side="top">Tooltip content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button', { name: /hover me/i });

      await user.hover(trigger);

      await waitFor(() => {
        const content = queryByText('Tooltip content');
        expect(content).toBeInTheDocument();
        expect(content).toHaveAttribute('data-side', 'top');
      });
    });

    it('supports different side positions', async () => {
      const user = userEvent.setup({ delay: null });
      const sides: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left'];

      for (const side of sides) {
        const { unmount, queryByText } = render(
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button>Hover me</button>
              </TooltipTrigger>
              <TooltipContent side={side}>Tooltip content</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );

        const trigger = screen.getByRole('button', { name: /hover me/i });

        await user.hover(trigger);

        await waitFor(() => {
          const content = queryByText('Tooltip content');
          expect(content).toBeInTheDocument();
          expect(content).toHaveAttribute('data-side', side);
        });

        unmount();
      }
    });
  });

  describe('Styling', () => {
    it('applies correct classes for dark background and white text', async () => {
      const user = userEvent.setup({ delay: null });
      const { queryByText } = render(
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent>Tooltip content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button', { name: /hover me/i });

      await user.hover(trigger);

      await waitFor(() => {
        const content = queryByText('Tooltip content');
        expect(content).toBeInTheDocument();
        expect(content).toHaveClass('bg-popover', 'text-popover-foreground');
      });
    });
  });

  describe('Delay Configuration', () => {
    it('respects delay duration when showing tooltip', async () => {
      const user = userEvent.setup();
      const { queryByText } = render(
        <TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent>Tooltip content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button', { name: /hover me/i });

      await user.hover(trigger);

      // Should not be visible immediately
      expect(queryByText('Tooltip content')).not.toBeInTheDocument();

      // Advance time by 500ms
      vi.advanceTimersByTime(500);

      await waitFor(() => {
        expect(queryByText('Tooltip content')).toBeInTheDocument();
      });
    });
  });

  describe('Content Variants', () => {
    it('renders string content', async () => {
      const user = userEvent.setup({ delay: null });
      const { queryByText } = render(
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent>String content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button', { name: /hover me/i });

      await user.hover(trigger);

      await waitFor(() => {
        expect(queryByText('String content')).toBeInTheDocument();
      });
    });

    it('renders JSX content', async () => {
      const user = userEvent.setup({ delay: null });
      const { queryByText } = render(
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent>
              <div>
                <strong>Bold text</strong>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button', { name: /hover me/i });

      await user.hover(trigger);

      await waitFor(() => {
        expect(queryByText('Bold text')).toBeInTheDocument();
      });
    });
  });
});
