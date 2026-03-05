import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
  usePathname: vi.fn(() => '/dashboard'),
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

const mockOpenTaskModal = vi.fn();
vi.mock('@/features/tasks', () => ({
  useCreateTaskModal: vi.fn(() => ({
    openTaskModal: mockOpenTaskModal,
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

  it('routes to create initiative when Initiative is clicked', async () => {
    const user = userEvent.setup();
    render(<TopBar />);

    const createButton = screen.getByRole('button', { name: /new action/i });
    await user.click(createButton);

    const item = await screen.findByText('Initiative');
    await user.click(item);
    expect(mockPush).toHaveBeenCalledWith('/empire/missions?create=true');
  });

  it('routes to create playbook note when Playbook Note is clicked', async () => {
    const user = userEvent.setup();
    render(<TopBar />);

    const createButton = screen.getByRole('button', { name: /new action/i });
    await user.click(createButton);

    const item = await screen.findByText('Playbook Note');
    await user.click(item);
    expect(mockPush).toHaveBeenCalledWith('/artifacts?create=true');
  });

  it('routes to import when Import Data is clicked', async () => {
    const user = userEvent.setup();
    render(<TopBar />);

    const createButton = screen.getByRole('button', { name: /new action/i });
    await user.click(createButton);

    const item = await screen.findByText('Import Data...');
    await user.click(item);
    expect(mockPush).toHaveBeenCalledWith('/empire/missions?import=true');
  });

  it('opens task modal when Execution Task is clicked', async () => {
    const user = userEvent.setup();
    render(<TopBar />);

    const createButton = screen.getByRole('button', { name: /new action/i });
    await user.click(createButton);

    const item = await screen.findByText('Execution Task');
    await user.click(item);
    expect(mockOpenTaskModal).toHaveBeenCalledTimes(1);
  });
});
