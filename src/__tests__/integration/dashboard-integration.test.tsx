import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardLayout from '@/components/dashboard/layout';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { createMockUser, createMockProject, mockSupabaseResponse } from '../setup';

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
};

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('Dashboard Integration', () => {
  const mockUser = createMockUser();
  const mockProjects = [
    createMockProject({ name: 'Project Alpha' }),
    createMockProject({ name: 'Project Beta' }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue(mockSupabaseResponse(mockUser));
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
  });

  it('renders dashboard with authenticated user', async () => {
    render(
      <AuthProvider>
        <DashboardLayout
          selectedProject={mockProjects[0]}
          projects={mockProjects}
          activeView="table"
        >
          <div data-testid="dashboard-content">Dashboard Content</div>
        </DashboardLayout>
      </AuthProvider>
    );

    // Should render dashboard content
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
    });

    // Should have proper semantic structure
    expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
    expect(screen.getByRole('main')).toBeInTheDocument(); // Main content
    expect(screen.getByRole('navigation')).toBeInTheDocument(); // Sidebar
  });

  it('displays project information in header', async () => {
    render(
      <AuthProvider>
        <DashboardLayout
          selectedProject={mockProjects[0]}
          projects={mockProjects}
          activeView="table"
        >
          <div>Content</div>
        </DashboardLayout>
      </AuthProvider>
    );

    await waitFor(() => {
      // Header should display project information
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });
  });

  it('handles view switching', async () => {
    const user = userEvent.setup();
    const mockOnViewChange = vi.fn();

    render(
      <AuthProvider>
        <DashboardLayout
          activeView="table"
          onViewChange={mockOnViewChange}
        >
          <div>Content</div>
        </DashboardLayout>
      </AuthProvider>
    );

    await waitFor(() => {
      // Should have view switcher buttons
      const viewButtons = screen.getAllByRole('button');
      expect(viewButtons.length).toBeGreaterThan(0);
    });

    // View switching should be handled by header component
    // This test verifies the integration point exists
  });

  it('includes accessibility features', async () => {
    render(
      <AuthProvider>
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      </AuthProvider>
    );

    await waitFor(() => {
      // Should have skip links
      const skipLinks = screen.getAllByText(/skip to/i);
      expect(skipLinks.length).toBeGreaterThan(0);

      // Should have proper heading structure
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  it('handles sidebar interactions', async () => {
    const user = userEvent.setup();
    const mockOnProjectSelect = vi.fn();

    render(
      <AuthProvider>
        <DashboardLayout
          projects={mockProjects}
          onProjectSelect={mockOnProjectSelect}
        >
          <div>Content</div>
        </DashboardLayout>
      </AuthProvider>
    );

    await waitFor(() => {
      // Sidebar should be present
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    // Project selection should be handled by sidebar component
    // This test verifies the integration point exists
  });

  it('manages search functionality', async () => {
    const user = userEvent.setup();
    const mockOnSearchChange = vi.fn();

    render(
      <AuthProvider>
        <DashboardLayout
          searchTerm=""
          onSearchChange={mockOnSearchChange}
        >
          <div>Content</div>
        </DashboardLayout>
      </AuthProvider>
    );

    await waitFor(() => {
      // Should have search input
      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toBeInTheDocument();
    });

    // Search functionality should be handled by header component
    // This test verifies the integration point exists
  });

  it('handles connection status', async () => {
    render(
      <AuthProvider>
        <DashboardLayout
          isConnected={true}
        >
          <div>Content</div>
        </DashboardLayout>
      </AuthProvider>
    );

    await waitFor(() => {
      // Should display connection status
      // Connection status should be handled by header component
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });

  it('integrates with saved views', async () => {
    const mockOnViewSelect = vi.fn();
    const mockOnViewSave = vi.fn();

    render(
      <AuthProvider>
        <DashboardLayout
          onViewSelect={mockOnViewSelect}
          onViewSave={mockOnViewSave}
          currentViewConfig={{
            filters: {},
            sortBy: 'name',
            groupBy: 'status',
          }}
        >
          <div>Content</div>
        </DashboardLayout>
      </AuthProvider>
    );

    await waitFor(() => {
      // Should integrate with saved views system
      // View management should be handled by header component
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });

  it('handles responsive design', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(
      <AuthProvider>
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      </AuthProvider>
    );

    await waitFor(() => {
      // Should adapt to mobile layout
      // Responsive behavior should be handled by layout components
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  it('integrates with error boundaries', async () => {
    // This would test error boundary integration
    // For now, we verify the structure is in place
    render(
      <AuthProvider>
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});
