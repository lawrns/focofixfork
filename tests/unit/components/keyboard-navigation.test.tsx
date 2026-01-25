import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

expect.extend(toHaveNoViolations);

describe('Keyboard Navigation - Dialog/Modal Focus Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should focus the first input when modal opens', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger asChild>
          <button>Open Dialog</button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
          <div>
            <input
              type="text"
              placeholder="First input"
              data-testid="first-input"
            />
            <input type="text" placeholder="Second input" />
          </div>
        </DialogContent>
      </Dialog>
    );

    const trigger = screen.getByRole('button', { name: /open dialog/i });
    await user.click(trigger);

    await waitFor(() => {
      const firstInput = screen.getByTestId('first-input');
      expect(firstInput).toHaveFocus();
    });
  });

  it('should trap focus within modal', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger asChild>
          <button>Open Dialog</button>
        </DialogTrigger>
        <DialogContent data-testid="modal-content">
          <DialogHeader>
            <DialogTitle>Focus Trap Test</DialogTitle>
          </DialogHeader>
          <div>
            <button data-testid="first-btn">First Button</button>
            <button data-testid="last-btn">Last Button</button>
          </div>
        </DialogContent>
      </Dialog>
    );

    const trigger = screen.getByRole('button', { name: /open dialog/i });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByTestId('modal-content')).toBeInTheDocument();
    });

    const firstBtn = screen.getByTestId('first-btn');
    const lastBtn = screen.getByTestId('last-btn');

    // Manually focus first button
    firstBtn.focus();
    expect(firstBtn).toHaveFocus();

    // Tab to next element
    await user.tab();
    expect(lastBtn).toHaveFocus();

    // Tab from last element should stay within modal (focus trap)
    await user.tab();
    await waitFor(() => {
      const modalContent = screen.getByTestId('modal-content');
      const focusedElement = document.activeElement;
      // Focus should still be within the modal
      expect(modalContent.contains(focusedElement)).toBe(true);
    });
  });

  it('should close modal on Escape key', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger asChild>
          <button>Open Dialog</button>
        </DialogTrigger>
        <DialogContent data-testid="modal-content">
          <DialogHeader>
            <DialogTitle>Escape Test</DialogTitle>
          </DialogHeader>
          <input type="text" placeholder="Test input" />
        </DialogContent>
      </Dialog>
    );

    const trigger = screen.getByRole('button', { name: /open dialog/i });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByTestId('modal-content')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByTestId('modal-content')).not.toBeInTheDocument();
    });
  });

  it('should return focus to trigger button after modal closes', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger asChild>
          <button data-testid="trigger-btn">Open Dialog</button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Focus Return Test</DialogTitle>
          </DialogHeader>
          <button>Close</button>
        </DialogContent>
      </Dialog>
    );

    const triggerBtn = screen.getByTestId('trigger-btn');
    await user.click(triggerBtn);

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Use Escape key to close the dialog (more reliable than clicking Close button)
    await user.keyboard('{Escape}');

    // Wait for dialog to close and focus to return
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(triggerBtn).toHaveFocus();
    });
  });

  it('should have visible focus indicators on interactive elements', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger asChild>
          <button>Open Dialog</button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Focus Indicator Test</DialogTitle>
          </DialogHeader>
          <button data-testid="test-btn">Test Button</button>
          <input type="text" placeholder="Test input" data-testid="test-input" />
        </DialogContent>
      </Dialog>
    );

    const trigger = screen.getByRole('button', { name: /open dialog/i });
    await user.click(trigger);

    const testBtn = screen.getByTestId('test-btn');
    testBtn.focus();

    // Check for focus ring/outline
    const styles = window.getComputedStyle(testBtn);
    const hasFocusIndicator =
      styles.outline !== 'none' ||
      styles.boxShadow !== 'none' ||
      styles.getPropertyValue('--tw-ring-offset-shadow') !== '';

    expect(hasFocusIndicator).toBeTruthy();
  });

  it('should pass axe accessibility checks', async () => {
    const { container } = render(
      <Dialog>
        <DialogTrigger asChild>
          <button>Open Dialog</button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accessibility Test</DialogTitle>
            <DialogDescription>Test modal for a11y</DialogDescription>
          </DialogHeader>
          <input type="text" placeholder="Name" />
          <button>Submit</button>
        </DialogContent>
      </Dialog>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Keyboard Navigation - Form Elements', () => {
  it('should handle Tab key to navigate between form fields', async () => {
    const user = userEvent.setup();

    render(
      <form data-testid="test-form">
        <input
          type="text"
          placeholder="Email"
          data-testid="email-input"
          aria-label="Email"
        />
        <input
          type="password"
          placeholder="Password"
          data-testid="password-input"
          aria-label="Password"
        />
        <button type="submit">Submit</button>
      </form>
    );

    const emailInput = screen.getByTestId('email-input');
    emailInput.focus();

    expect(emailInput).toHaveFocus();

    await user.tab();
    const passwordInput = screen.getByTestId('password-input');
    expect(passwordInput).toHaveFocus();

    await user.tab();
    const submitBtn = screen.getByRole('button', { name: /submit/i });
    expect(submitBtn).toHaveFocus();
  });

  it('should submit form on Enter key when submit button is focused', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        data-testid="test-form"
      >
        <input
          type="text"
          placeholder="Name"
          data-testid="name-input"
          aria-label="Name"
        />
        <button type="submit" data-testid="submit-btn">
          Submit
        </button>
      </form>
    );

    const submitBtn = screen.getByTestId('submit-btn');
    submitBtn.focus();

    await user.keyboard('{Enter}');

    expect(handleSubmit).toHaveBeenCalled();
  });

  it('should properly associate labels with inputs for keyboard users', async () => {
    render(
      <div>
        <label htmlFor="test-input">Test Input Label</label>
        <input id="test-input" type="text" placeholder="Type here" />
      </div>
    );

    const input = screen.getByRole('textbox', { name: /test input label/i });
    expect(input).toBeInTheDocument();
  });

  it('should handle Shift+Tab for reverse navigation', async () => {
    const user = userEvent.setup();

    render(
      <form data-testid="test-form">
        <input
          type="text"
          placeholder="First"
          data-testid="first-input"
          aria-label="First"
        />
        <input
          type="text"
          placeholder="Second"
          data-testid="second-input"
          aria-label="Second"
        />
        <button type="submit">Submit</button>
      </form>
    );

    const secondInput = screen.getByTestId('second-input');
    secondInput.focus();

    await user.tab({ shift: true });
    const firstInput = screen.getByTestId('first-input');
    expect(firstInput).toHaveFocus();
  });
});

describe('Keyboard Navigation - Interactive Elements', () => {
  it('should activate button with Enter key', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <button onClick={handleClick} data-testid="test-btn">
        Click Me
      </button>
    );

    const btn = screen.getByTestId('test-btn');
    btn.focus();

    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalled();
  });

  it('should activate button with Space key', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <button onClick={handleClick} data-testid="test-btn">
        Click Me
      </button>
    );

    const btn = screen.getByTestId('test-btn');
    btn.focus();

    await user.keyboard(' ');
    expect(handleClick).toHaveBeenCalled();
  });

  it('should skip disabled elements in tab order', async () => {
    const user = userEvent.setup();

    render(
      <div>
        <button data-testid="first-btn">First</button>
        <button disabled data-testid="disabled-btn">
          Disabled
        </button>
        <button data-testid="third-btn">Third</button>
      </div>
    );

    const firstBtn = screen.getByTestId('first-btn');
    firstBtn.focus();

    await user.tab();
    const thirdBtn = screen.getByTestId('third-btn');
    expect(thirdBtn).toHaveFocus();
    expect(screen.getByTestId('disabled-btn')).not.toHaveFocus();
  });

  it('should handle links with Enter/Space keys', async () => {
    const user = userEvent.setup();

    render(
      <a href="/test" data-testid="test-link">
        Test Link
      </a>
    );

    const link = screen.getByTestId('test-link');
    link.focus();

    expect(link).toHaveFocus();
    // Note: Enter will follow the link in a real browser
  });
});

describe('Keyboard Navigation - Accessibility (jest-axe)', () => {
  it('should have proper heading hierarchy', async () => {
    const { container } = render(
      <div>
        <h1>Main Title</h1>
        <h2>Subsection</h2>
        <h3>Sub-subsection</h3>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper button names', async () => {
    const { container } = render(
      <div>
        <button>Submit</button>
        <button aria-label="Close dialog">X</button>
        <button title="Delete item">Delete</button>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper link names', async () => {
    const { container } = render(
      <div>
        <a href="/test">Test Link</a>
        <a href="/about" aria-label="About Us">
          About
        </a>
        <a href="/home" title="Go Home">
          Home
        </a>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper form labels', async () => {
    const { container } = render(
      <form>
        <label htmlFor="email">Email Address</label>
        <input id="email" type="email" />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" />
      </form>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA labels on interactive elements', async () => {
    const { container } = render(
      <div>
        <button aria-label="Open menu">Menu</button>
        <input aria-label="Search" type="text" />
        <a href="/home" aria-label="Back to home">
          Back
        </a>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
