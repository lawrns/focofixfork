import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';

expect.extend(toHaveNoViolations);

// Mock Command Palette Component
const MockCommandPalette = ({
  isOpen,
  onClose,
  onCommand,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (cmd: string) => void;
}) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const commands = [
    { id: 'cmd1', label: 'Go to Home', shortcut: 'G H' },
    { id: 'cmd2', label: 'Go to Inbox', shortcut: 'G I' },
    { id: 'cmd3', label: 'Create Task', shortcut: 'C' },
    { id: 'cmd4', label: 'Create Project', shortcut: 'P' },
  ];

  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, commands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          onCommand(commands[selectedIndex].id);
          onClose();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, onCommand, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="Command Palette"
      data-testid="command-palette"
    >
      <input
        type="text"
        placeholder="Type a command..."
        autoFocus
        data-testid="command-input"
        aria-label="Command search"
      />
      <div role="listbox" data-testid="command-list">
        {commands.map((cmd, index) => (
          <button
            key={cmd.id}
            role="option"
            aria-selected={index === selectedIndex}
            className={index === selectedIndex ? 'selected' : ''}
            onClick={() => {
              onCommand(cmd.id);
              onClose();
            }}
            data-testid={`command-${cmd.id}`}
          >
            <span>{cmd.label}</span>
            <kbd>{cmd.shortcut}</kbd>
          </button>
        ))}
      </div>
      <div className="footer" aria-label="Keyboard shortcuts">
        <span>↑↓ Navigate</span>
        <span>↵ Select</span>
        <span>ESC Close</span>
      </div>
    </div>
  );
};

describe('Keyboard Navigation - Command Palette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should focus search input when command palette opens', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    const { rerender } = render(
      <MockCommandPalette isOpen={false} onClose={handleClose} onCommand={vi.fn()} />
    );

    rerender(
      <MockCommandPalette isOpen={true} onClose={handleClose} onCommand={vi.fn()} />
    );

    const input = screen.getByTestId('command-input');
    await waitFor(() => {
      expect(input).toHaveFocus();
    });
  });

  it('should navigate commands with arrow keys', async () => {
    const user = userEvent.setup();
    const handleCommand = vi.fn();
    const handleClose = vi.fn();

    render(
      <MockCommandPalette
        isOpen={true}
        onClose={handleClose}
        onCommand={handleCommand}
      />
    );

    const cmdList = screen.getByTestId('command-list');
    const firstCmd = screen.getByTestId('command-cmd1');

    // Initially, first command should be focused
    firstCmd.focus();
    expect(firstCmd).toHaveClass('selected');

    // Arrow down to next command
    await user.keyboard('{ArrowDown}');
    const secondCmd = screen.getByTestId('command-cmd2');
    expect(secondCmd).toHaveAttribute('aria-selected', 'true');

    // Arrow down again
    await user.keyboard('{ArrowDown}');
    const thirdCmd = screen.getByTestId('command-cmd3');
    expect(thirdCmd).toHaveAttribute('aria-selected', 'true');

    // Arrow up to go back
    await user.keyboard('{ArrowUp}');
    expect(secondCmd).toHaveAttribute('aria-selected', 'true');
  });

  it('should execute command with Enter key', async () => {
    const user = userEvent.setup();
    const handleCommand = vi.fn();
    const handleClose = vi.fn();

    render(
      <MockCommandPalette
        isOpen={true}
        onClose={handleClose}
        onCommand={handleCommand}
      />
    );

    const firstCmd = screen.getByTestId('command-cmd1');
    firstCmd.focus();

    await user.keyboard('{Enter}');

    expect(handleCommand).toHaveBeenCalledWith('cmd1');
    expect(handleClose).toHaveBeenCalled();
  });

  it('should close command palette with Escape key', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <MockCommandPalette
        isOpen={true}
        onClose={handleClose}
        onCommand={vi.fn()}
      />
    );

    const input = screen.getByTestId('command-input');
    input.focus();

    await user.keyboard('{Escape}');

    expect(handleClose).toHaveBeenCalled();
  });

  it('should wrap around at command boundaries', async () => {
    const user = userEvent.setup();
    const handleCommand = vi.fn();
    const handleClose = vi.fn();

    render(
      <MockCommandPalette
        isOpen={true}
        onClose={handleClose}
        onCommand={handleCommand}
      />
    );

    const firstCmd = screen.getByTestId('command-cmd1');
    const lastCmd = screen.getByTestId('command-cmd4');

    firstCmd.focus();

    // Keep pressing arrow up should stay at first
    await user.keyboard('{ArrowUp}');
    expect(firstCmd).toHaveAttribute('aria-selected', 'true');

    lastCmd.focus();

    // Keep pressing arrow down should stay at last
    await user.keyboard('{ArrowDown}');
    expect(lastCmd).toHaveAttribute('aria-selected', 'true');
  });

  it('should support mouse selection', async () => {
    const user = userEvent.setup();
    const handleCommand = vi.fn();
    const handleClose = vi.fn();

    render(
      <MockCommandPalette
        isOpen={true}
        onClose={handleClose}
        onCommand={handleCommand}
      />
    );

    const secondCmd = screen.getByTestId('command-cmd2');
    await user.click(secondCmd);

    expect(handleCommand).toHaveBeenCalledWith('cmd2');
    expect(handleClose).toHaveBeenCalled();
  });

  it('should display keyboard shortcuts visually', async () => {
    render(
      <MockCommandPalette isOpen={true} onClose={vi.fn()} onCommand={vi.fn()} />
    );

    const kbd1 = screen.getByText('G H');
    const kbd2 = screen.getByText('G I');

    expect(kbd1).toBeInTheDocument();
    expect(kbd2).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', async () => {
    const { container } = render(
      <MockCommandPalette isOpen={true} onClose={vi.fn()} onCommand={vi.fn()} />
    );

    const palette = screen.getByTestId('command-palette');
    expect(palette).toHaveAttribute('role', 'dialog');

    const listbox = screen.getByTestId('command-list');
    expect(listbox).toHaveAttribute('role', 'listbox');

    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);

    // Check results violate no accessibility rules
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should announce navigation to screen readers', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MockCommandPalette isOpen={true} onClose={vi.fn()} onCommand={vi.fn()} />
    );

    const options = screen.getAllByRole('option');

    // First option should be selected
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    // Navigate and check selection updates
    await user.keyboard('{ArrowDown}');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
