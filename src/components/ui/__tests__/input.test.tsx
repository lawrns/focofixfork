import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../input';

describe('Input', () => {
  it('renders with default props', () => {
    render(<Input />);

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('flex', 'h-10', 'w-full', 'rounded-md');
  });

  it('renders with placeholder', () => {
    render(<Input placeholder="Enter your name" />);

    const input = screen.getByPlaceholderText('Enter your name');
    expect(input).toBeInTheDocument();
  });

  it('renders with different types', () => {
    const { rerender } = render(<Input type="text" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');

    rerender(<Input type="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'password');

    rerender(<Input type="number" />);
    expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number');
  });

  it('renders with different variants', () => {
    const { rerender } = render(<Input variant="default" />);
    expect(screen.getByRole('textbox')).toHaveClass('border-input');

    rerender(<Input variant="error" />);
    expect(screen.getByRole('textbox')).toHaveClass('border-destructive');

    rerender(<Input variant="success" />);
    expect(screen.getByRole('textbox')).toHaveClass('border-green-500');
  });

  it('handles user input', async () => {
    const user = userEvent.setup();
    render(<Input />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'Hello World');

    expect(input).toHaveValue('Hello World');
  });

  it('handles controlled value', () => {
    const { rerender } = render(<Input value="initial" />);
    expect(screen.getByRole('textbox')).toHaveValue('initial');

    rerender(<Input value="updated" />);
    expect(screen.getByRole('textbox')).toHaveValue('updated');
  });

  it('calls onChange handler', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'a');

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('handles focus and blur events', async () => {
    const user = userEvent.setup();
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();

    render(<Input onFocus={handleFocus} onBlur={handleBlur} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    expect(handleFocus).toHaveBeenCalledTimes(1);

    await user.tab();
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(<Input className="custom-input" />);

    expect(screen.getByRole('textbox')).toHaveClass('custom-input');
  });

  it('forwards ref correctly', () => {
    const ref = vi.fn();
    render(<Input ref={ref} />);

    expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
  });

  it('handles disabled state', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<Input disabled onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();

    await user.type(input, 'test');
    expect(handleChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('');
  });

  it('handles readonly state', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<Input readOnly value="readonly" onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('readonly');

    await user.type(input, 'test');
    expect(handleChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('readonly');
  });

  it('supports accessibility attributes', () => {
    render(
      <Input
        aria-label="Username"
        aria-describedby="username-help"
        aria-invalid="true"
        aria-required="true"
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-label', 'Username');
    expect(input).toHaveAttribute('aria-describedby', 'username-help');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('forwards additional props', () => {
    render(
      <Input
        data-testid="test-input"
        id="username"
        name="username"
        autoComplete="username"
        maxLength={50}
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('data-testid', 'test-input');
    expect(input).toHaveAttribute('id', 'username');
    expect(input).toHaveAttribute('name', 'username');
    expect(input).toHaveAttribute('autocomplete', 'username');
    expect(input).toHaveAttribute('maxlength', '50');
  });

  it('maintains focus visibility', () => {
    render(<Input />);

    const input = screen.getByRole('textbox');
    input.focus();

    expect(input).toHaveFocus();
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    const handleKeyDown = vi.fn();

    render(<Input onKeyDown={handleKeyDown} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Enter}');

    expect(handleKeyDown).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'Enter',
      })
    );
  });
});
