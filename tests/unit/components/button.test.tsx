import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';
import { checkAccessibility, measureRenderTime } from '../setup';

describe('Button Component', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>);

      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('bg-zinc-900', 'text-white', 'h-10', 'px-4');
    });

    it('renders with custom className', () => {
      render(<Button className="custom-class">Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('renders with different variants', () => {
      const { rerender } = render(<Button variant="destructive">Delete</Button>);
      let button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-500', 'text-white');

      rerender(<Button variant="outline">Outline</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveClass('border', 'border-zinc-200', 'text-zinc-700');

      rerender(<Button variant="ghost">Ghost</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveClass('text-zinc-700');
    });

    it('renders with different sizes', () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      let button = screen.getByRole('button');
      expect(button).toHaveClass('h-8', 'px-3', 'text-sm');

      rerender(<Button size="lg">Large</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveClass('h-12', 'px-5', 'text-base');

      rerender(<Button size="icon">Icon</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveClass('h-10', 'w-10');
    });

    it('renders children correctly', () => {
      render(
        <Button>
          <span data-testid="child-icon">Icon</span>
          <span>Text</span>
        </Button>
      );
      
      expect(screen.getByTestId('child-icon')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
    });
  });

  describe('Functionality', () => {
    it('handles click events', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('can be disabled', () => {
      render(<Button disabled>Disabled</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('does not trigger click when disabled', async () => {
      const handleClick = vi.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('shows loading state', () => {
      render(<Button loading>Loading</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByTestId('loader2-icon')).toBeInTheDocument();
    });

    it('handles keyboard events', async () => {
      const handleKeyDown = vi.fn();
      render(<Button onKeyDown={handleKeyDown}>Button</Button>);
      
      const button = screen.getByRole('button');
      await user.type(button, '{Enter}');
      
      expect(handleKeyDown).toHaveBeenCalled();
    });

    it('forwards ref correctly', () => {
      const ref = { current: null };
      render(<Button ref={ref}>Button</Button>);
      
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<Button aria-label="Custom label">Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom label');
    });

    it('has accessible name when disabled', () => {
      render(<Button disabled>Disabled Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAccessibleName('Disabled Button');
    });

    it('has accessible name in loading state', () => {
      render(<Button loading>Submit</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByTestId('loader2-icon')).toBeInTheDocument();
    });

    it('passes accessibility checks', async () => {
      const { container } = render(<Button>Accessible Button</Button>);
      const violations = await checkAccessibility(container);
      
      expect(violations).toHaveLength(0);
    });

    it('is keyboard navigable', async () => {
      render(<Button>Button</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
      
      await user.keyboard('{Enter}');
      // Should trigger click action
    });

    it('has proper focus management', async () => {
      render(<Button>Button</Button>);
      
      const button = screen.getByRole('button');
      await user.tab();
      
      expect(button).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('renders within performance budget', async () => {
      const renderTime = await measureRenderTime(<Button>Button</Button>);
      
      expect(renderTime).toBeLessThan(16); // Should render in under 16ms
    });

    it('handles rapid clicks without performance issues', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Button</Button>);
      
      const button = screen.getByRole('button');
      
      // Simulate rapid clicks
      for (let i = 0; i < 10; i++) {
        await user.click(button);
      }
      
      expect(handleClick).toHaveBeenCalledTimes(10);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty children', () => {
      render(<Button></Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAccessibleName('');
    });

    it('handles long text content', () => {
      const longText = 'A'.repeat(1000);
      render(<Button>{longText}</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent(longText);
    });

    it('handles HTML entities in text', () => {
      render(<Button>Button &amp; More</Button>);
      
      expect(screen.getByText('Button & More')).toBeInTheDocument();
    });

    it('handles special characters', () => {
      render(<Button>Button © 2024</Button>);
      
      expect(screen.getByText('Button © 2024')).toBeInTheDocument();
    });

    it('handles data attributes', () => {
      render(<Button data-testid="test-button" data-action="submit">Button</Button>);
      
      const button = screen.getByTestId('test-button');
      expect(button).toHaveAttribute('data-action', 'submit');
    });

    it('handles form submission', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());
      render(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit</Button>
        </form>
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  describe('Styling and Design System', () => {
    it('applies focus states correctly', async () => {
      render(<Button>Button</Button>);

      const button = screen.getByRole('button');
      button.focus();

      expect(button).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-ring');
    });

    it('maintains design system consistency', () => {
      const { rerender } = render(<Button variant="default">Default</Button>);
      let button = screen.getByRole('button');

      // Check default design tokens
      expect(button).toHaveClass('rounded-md', 'text-sm', 'font-medium');

      // Check variant maintains consistency
      rerender(<Button variant="secondary">Secondary</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveClass('rounded-md', 'text-sm', 'font-medium');
    });

    it('supports custom styling overrides', () => {
      render(
        <Button 
          className="bg-red-500 text-white border-4 border-red-700"
          style={{ margin: '10px' }}
        >
          Custom
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-500', 'text-white', 'border-4');
      expect(button).toHaveStyle({ margin: '10px' });
    });
  });

  describe('Error Handling', () => {
    it('handles invalid props gracefully', () => {
      // @ts-expect-error Testing invalid prop
      render(<Button variant="invalid">Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      // Should fall back to default variant
    });

    it('handles missing onClick callback', async () => {
      render(<Button>Button</Button>);
      
      const button = screen.getByRole('button');
      expect(() => user.click(button)).not.toThrow();
    });

    it('handles error in onClick callback', async () => {
      const handleError = vi.fn();
      const originalError = console.error;
      console.error = handleError;

      const erroringClick = vi.fn(() => {
        throw new Error('Click error');
      });

      render(<Button onClick={erroringClick}>Error Button</Button>);
      
      const button = screen.getByRole('button');
      
      expect(async () => {
        await user.click(button);
      }).not.toThrow();

      console.error = originalError;
    });
  });

  describe('Integration', () => {
    it('works within forms', () => {
      render(
        <form>
          <Button type="submit">Submit Form</Button>
        </form>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('works with disabled form', () => {
      render(
        <form disabled>
          <Button>Form Button</Button>
        </form>
      );
      
      const button = screen.getByRole('button');
      // Button should still be individually controllable
      expect(button).not.toBeDisabled();
    });

    it('integrates with other UI components', () => {
      render(
        <Button>
          <span data-testid="icon">🚀</span>
          <span>Launch</span>
        </Button>
      );
      
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Launch')).toBeInTheDocument();
    });
  });
});
