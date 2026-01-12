import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopBar } from '../top-bar';
import { useCommandPaletteStore } from '@/lib/stores/foco-store';

// Mock the stores
vi.mock('@/lib/stores/foco-store', () => ({
  useCommandPaletteStore: vi.fn(),
  useInboxStore: vi.fn(() => ({ unreadCount: 0 })),
  useUIPreferencesStore: vi.fn(() => ({
    sidebarCollapsed: false,
    density: 'comfortable',
    setDensity: vi.fn(),
  })),
}));

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({
    theme: 'light',
    setTheme: vi.fn(),
  })),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

// Mock use-auth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({
    user: {
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    },
  })),
}));

// Mock supabase client
vi.mock('@/lib/supabase-client', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
  },
}));

describe('TopBar Create Dropdown', () => {
  const mockOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup command palette store mock
    (useCommandPaletteStore as any).mockReturnValue({
      open: mockOpen,
      isOpen: false,
      mode: 'search',
      query: '',
      close: vi.fn(),
      setQuery: vi.fn(),
      toggle: vi.fn(),
    });

    // Mock fetch for workspace data
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true, data: [] }),
      })
    ) as any;
  });

  it('calls openCommandPalette with "create-project" when Project button is clicked', async () => {
    const user = userEvent.setup();
    render(<TopBar />);

    // Open the Create dropdown
    const createButton = screen.getByRole('button', { name: /create/i });
    await user.click(createButton);

    // Click the Project menu item
    const projectMenuItem = await screen.findByText('Project');
    await user.click(projectMenuItem);

    // Verify the command palette was opened with correct mode
    expect(mockOpen).toHaveBeenCalledWith('create-project');
  });

  it('calls openCommandPalette with "create-doc" when Doc button is clicked', async () => {
    const user = userEvent.setup();
    render(<TopBar />);

    // Open the Create dropdown
    const createButton = screen.getByRole('button', { name: /create/i });
    await user.click(createButton);

    // Click the Doc menu item
    const docMenuItem = await screen.findByText('Doc');
    await user.click(docMenuItem);

    // Verify the command palette was opened with correct mode
    expect(mockOpen).toHaveBeenCalledWith('create-doc');
  });

  it('calls openCommandPalette with "import" when Import button is clicked', async () => {
    const user = userEvent.setup();
    render(<TopBar />);

    // Open the Create dropdown
    const createButton = screen.getByRole('button', { name: /create/i });
    await user.click(createButton);

    // Click the Import menu item
    const importMenuItem = await screen.findByText('Import...');
    await user.click(importMenuItem);

    // Verify the command palette was opened with correct mode
    expect(mockOpen).toHaveBeenCalledWith('import');
  });

  it('already has onClick handler for Task button (existing functionality)', async () => {
    const user = userEvent.setup();
    render(<TopBar />);

    // Open the Create dropdown
    const createButton = screen.getByRole('button', { name: /create/i });
    await user.click(createButton);

    // Click the Task menu item
    const taskMenuItem = await screen.findByText('Task');
    await user.click(taskMenuItem);

    // Verify the command palette was opened with 'create' mode (existing)
    expect(mockOpen).toHaveBeenCalledWith('create');
  });
});
