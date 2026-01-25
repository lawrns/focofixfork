import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '../dialog';

// Mock the useMobile hook
vi.mock('@/lib/hooks/use-mobile', () => ({
  useMobile: vi.fn(() => true), // Default to mobile for these tests
}));

describe('Dialog Mobile Responsiveness', () => {
  beforeEach(() => {
    // Set mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should have responsive max-width that fits within mobile viewport', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
          <DialogDescription>Test content</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    const dialogContent = screen.getByRole('dialog');

    // Get the computed classes
    const classes = dialogContent.className;

    // Should have responsive width class max-w-[calc(100vw-2rem)] for mobile
    expect(classes).toMatch(/max-w-\[calc\(100vw-2rem\)\]/);

    // Should NOT have max-w-lg on mobile (component conditionally applies this)
    // The component uses isMobile to switch between max-w-[calc(100vw-2rem)] and max-w-lg
    expect(classes).not.toContain('max-w-lg');
  });

  it('should have close button accessible on mobile', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
          <DialogDescription>Test content</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    const closeButton = screen.getByRole('button', { name: /close/i });

    // Close button should be visible
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toBeVisible();

    // Close button should have proper positioning classes
    const classes = closeButton.className;
    expect(classes).toContain('absolute');
    expect(classes).toContain('right-4');
    expect(classes).toContain('top-4');
  });

  it('should have proper padding that does not cause overflow', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
          <DialogDescription>Test content</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    const dialogContent = screen.getByRole('dialog');
    const classes = dialogContent.className;

    // Should have padding
    expect(classes).toContain('p-6');

    // Should have w-full to take full width
    expect(classes).toContain('w-full');
  });

  it('should be centered on screen', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
          <DialogDescription>Test content</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    const dialogContent = screen.getByRole('dialog');
    const classes = dialogContent.className;

    // Should have centering classes
    expect(classes).toContain('left-[50%]');
    expect(classes).toContain('top-[50%]');
    expect(classes).toContain('translate-x-[-50%]');
    expect(classes).toContain('translate-y-[-50%]');
  });

  it('should have overflow handling for content', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
          <DialogDescription>
            Very long content that might overflow the viewport on mobile screens.
            This should be scrollable within the dialog without causing horizontal overflow.
          </DialogDescription>
        </DialogContent>
      </Dialog>
    );

    const dialogContent = screen.getByRole('dialog');
    const classes = dialogContent.className;

    // Should have max height and overflow handling
    expect(classes).toContain('max-h-[90vh]');
    expect(classes).toContain('overflow-y-auto');
  });
});
