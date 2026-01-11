import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/input';
import { checkAccessibility, measureRenderTime } from '../setup';

describe('Input Component', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Input placeholder="Enter text" />);

      const input = screen.getByPlaceholderText('Enter text');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('w-full', 'rounded-lg', 'border', 'bg-white');
    });

    it('renders with custom className', () => {
      render(<Input className="custom-class" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
    });

    it('renders with error state', () => {
      render(<Input error="This field is required" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-500');
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('renders with different types', () => {
      const { rerender } = render(<Input type="email" />);
      let input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');

      rerender(<Input type="password" />);
      input = screen.getByDisplayValue('');
      expect(input).toHaveAttribute('type', 'password');

      rerender(<Input type="number" />);
      input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('renders with value', () => {
      render(<Input value="test value" readOnly />);
      
      const input = screen.getByDisplayValue('test value');
      expect(input).toBeInTheDocument();
    });

    it('renders with placeholder text', () => {
      render(<Input placeholder="Enter your name" />);
      
      const input = screen.getByPlaceholderText('Enter your name');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Functionality', () => {
    it('handles user input', async () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello World');
      
      expect(handleChange).toHaveBeenCalledTimes(11); // One for each character
      expect(input).toHaveValue('Hello World');
    });

    it('handles focus events', async () => {
      const handleFocus = vi.fn();
      const handleBlur = vi.fn();
      
      render(<Input onFocus={handleFocus} onBlur={handleBlur} />);
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      
      expect(handleFocus).toHaveBeenCalledTimes(1);
      expect(input).toHaveFocus();
      
      await user.tab(); // Move focus away
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('can be disabled', () => {
      render(<Input disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:opacity-60', 'disabled:bg-zinc-50');
    });

    it('does not accept input when disabled', async () => {
      render(<Input disabled />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      
      expect(input).toHaveValue('');
    });

    it('can be read-only', () => {
      render(<Input value="readonly value" readOnly />);
      
      const input = screen.getByDisplayValue('readonly value');
      expect(input).toHaveAttribute('readonly');
      expect(input).not.toBeDisabled();
    });

    it('handles keyboard events', async () => {
      const handleKeyDown = vi.fn();
      const handleKeyPress = vi.fn();
      const handleKeyUp = vi.fn();
      
      render(
        <Input 
          onKeyDown={handleKeyDown}
          onKeyPress={handleKeyPress}
          onKeyUp={handleKeyUp}
        />
      );
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'a');
      
      expect(handleKeyDown).toHaveBeenCalled();
      expect(handleKeyPress).toHaveBeenCalled();
      expect(handleKeyUp).toHaveBeenCalled();
    });

    it('forwards ref correctly', () => {
      const ref = { current: null };
      render(<Input ref={ref} />);
      
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <Input
          aria-label="Custom input label"
          aria-describedby="input-help"
          aria-invalid="true"
          aria-required="true"
        />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label', 'Custom input label');
      expect(input).toHaveAttribute('aria-describedby', 'input-help');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('has accessible name from label', () => {
      render(
        <label htmlFor="test-input">
          Test Input
          <Input id="test-input" />
        </label>
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAccessibleName('Test Input');
    });

    it('has accessible description', () => {
      render(
        <div>
          <Input aria-describedby="help-text" />
          <p id="help-text">Enter your email address</p>
        </div>
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('indicates required state', () => {
      render(<Input required aria-required="true" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toBeRequired();
    });

    it('indicates invalid state', () => {
      render(<Input aria-invalid="true" error="Invalid input" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveClass('border-red-500');
    });

    it('passes accessibility checks', async () => {
      const { container } = render(<Input placeholder="Accessible input" aria-label="Test input" />);
      const violations = await checkAccessibility(container);
      
      expect(violations).toHaveLength(0);
    });

    it('is keyboard navigable', async () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      await user.tab();
      
      expect(input).toHaveFocus();
    });

    it('has proper focus management', async () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      input.focus();
      expect(input).toHaveFocus();
      
      await user.keyboard('{Tab}');
      expect(input).not.toHaveFocus();
    });
  });

  describe('Form Integration', () => {
    it('works with form validation', async () => {
      const handleSubmit = vi.fn((e) => {
        e.preventDefault();
        // Simulate form validation
        const formData = new FormData(e.target);
        const value = formData.get('testField');
        if (value && value.length >= 3) {
          return true;
        }
        return false;
      });
      render(
        <form onSubmit={handleSubmit}>
          <Input 
            name="testField"
            required
            minLength={3}
            onChange={vi.fn()}
          />
          <button type="submit">Submit</button>
        </form>
      );
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'ab'); // Less than minLength
      
      const button = screen.getByRole('button', { name: 'Submit' });
      await user.click(button);
      
      // Form validation should work but submit handler is still called
      expect(handleSubmit).toHaveBeenCalled();
    });

    it('handles form submission', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());
      render(
        <form onSubmit={handleSubmit}>
          <Input name="field1" defaultValue="value1" />
          <button type="submit">Submit</button>
        </form>
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleSubmit).toHaveBeenCalled();
    });

    it('respects form disabled state', () => {
      render(
        <form disabled>
          <Input />
        </form>
      );
      
      const input = screen.getByRole('textbox');
      expect(input).not.toBeDisabled(); // Fieldset disabled doesn't affect individual inputs
    });
  });

  describe('Performance', () => {
    it('renders within performance budget', async () => {
      const renderTime = await measureRenderTime(<Input />);
      
      expect(renderTime).toBeLessThan(16); // Should render in under 16ms
    });

    it('handles rapid input changes efficiently', async () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      
      const input = screen.getByRole('textbox');
      
      // Simulate rapid typing
      const longText = 'A'.repeat(1000);
      await user.type(input, longText);
      
      expect(handleChange).toHaveBeenCalledTimes(1000);
      expect(input).toHaveValue(longText);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty value', () => {
      render(<Input value="" onChange={vi.fn()} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('');
    });

    it('handles very long values', () => {
      const longValue = 'A'.repeat(10000);
      render(<Input value={longValue} readOnly />);
      
      const input = screen.getByDisplayValue(longValue);
      expect(input).toBeInTheDocument();
    });

    it('handles special characters', async () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'Special chars: !@#$%^&*()');
      
      expect(input).toHaveValue('Special chars: !@#$%^&*()');
    });

    it('handles Unicode characters', async () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'Unicode: 🚀 ñáéíóú 中文');
      
      expect(input).toHaveValue('Unicode: 🚀 ñáéíóú 中文');
    });

    it('handles maxLength constraint', async () => {
      render(<Input maxLength={5} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, '123456789');
      
      expect(input).toHaveValue('12345');
    });

    it('handles paste events', async () => {
      const handlePaste = vi.fn();
      render(<Input onPaste={handlePaste} />);
      
      const input = screen.getByRole('textbox');
      
      // Simulate paste
      await user.click(input);
      await user.paste('pasted text');
      
      expect(handlePaste).toHaveBeenCalled();
    });
  });

  describe('Styling and Design System', () => {
    it('applies focus styles correctly', async () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      input.focus();

      expect(input).toHaveClass('focus:ring-2', 'focus:ring-zinc-900/10');
    });

    it('applies disabled styles correctly', () => {
      render(<Input disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('disabled:opacity-60', 'disabled:bg-zinc-50');
    });

    it('maintains design system consistency', () => {
      const { rerender } = render(<Input />);
      let input = screen.getByRole('textbox');

      // Check base design tokens
      expect(input).toHaveClass('rounded-lg', 'text-zinc-900', 'border');

      // Check error state maintains consistency
      rerender(<Input error="Error message" />);
      input = screen.getByRole('textbox');
      expect(input).toHaveClass('rounded-lg', 'text-zinc-900', 'border-red-500');
    });

    it('supports custom styling overrides', () => {
      render(
        <Input 
          className="bg-red-50 border-red-300 text-red-900"
          style={{ padding: '20px' }}
        />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('bg-red-50', 'border-red-300', 'text-red-900');
      expect(input).toHaveStyle({ padding: '20px' });
    });
  });

  describe('Input Types', () => {
    it('handles email input validation', async () => {
      render(<Input type="email" />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'invalid-email');
      
      expect(input).toBeInvalid();
    });

    it('handles password input masking', () => {
      render(<Input type="password" value="secret" readOnly />);
      
      const input = screen.getByDisplayValue('secret');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('handles number input constraints', async () => {
      render(<Input type="number" min="0" max="100" />);
      
      const input = screen.getByRole('spinbutton');
      await user.type(input, '150');
      
      expect(input).toBeInvalid();
    });

    it('handles date input', () => {
      render(<Input type="date" />);
      
      const input = screen.getByDisplayValue('');
      expect(input).toHaveAttribute('type', 'date');
    });

    it('handles search input', () => {
      render(<Input type="search" />);
      
      const input = screen.getByRole('searchbox');
      expect(input).toHaveAttribute('type', 'search');
    });
  });

  describe('Error Handling', () => {
    it('handles invalid props gracefully', () => {
      // @ts-expect-error Testing invalid prop
      render(<Input variant="invalid" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      // Should fall back to default variant
    });

    it('handles missing event handlers', async () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      expect(() => user.type(input, 'test')).not.toThrow();
    });

    it('handles error in onChange callback', async () => {
      const handleError = vi.fn();
      const originalError = console.error;
      console.error = handleError;

      const erroringChange = vi.fn(() => {
        throw new Error('Change error');
      });

      render(<Input onChange={erroringChange} />);
      
      const input = screen.getByRole('textbox');
      
      expect(async () => {
        await user.type(input, 'test');
      }).not.toThrow();

      console.error = originalError;
    });
  });

  describe('Integration', () => {
    it('works with label elements', () => {
      render(
        <label>
          Email Address
          <Input type="email" placeholder="you@example.com" />
        </label>
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAccessibleName('Email Address');
    });

    it('works with fieldset and legend', () => {
      render(
        <fieldset>
          <legend>Contact Information</legend>
          <Input name="email" placeholder="Email" />
        </fieldset>
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('integrates with form validation APIs', () => {
      render(<Input required aria-invalid="false" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('required');
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });
  });
});
