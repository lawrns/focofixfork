import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { TopBar } from '@/components/foco/layout/top-bar';
import { SidebarNew } from '@/components/layout/sidebar-new';
import DashboardHeader from '@/features/dashboard/components/header';

expect.extend(toHaveNoViolations);

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}));

// Mock stores
jest.mock('@/lib/stores/foco-store', () => ({
  useCommandPaletteStore: () => ({
    open: jest.fn(),
  }),
  useInboxStore: () => ({
    unreadCount: 3,
  }),
  useUIPreferencesStore: () => ({
    sidebarCollapsed: false,
    density: 'comfortable',
    setDensity: jest.fn(),
  }),
}));

// Mock auth hook
jest.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    },
  }),
}));

// Mock supabase client
jest.mock('@/lib/supabase-client', () => ({
  supabase: {
    auth: {
      signOut: jest.fn(),
    },
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    aside: ({ children, ...props }: any) => <aside {...props}>{children}</aside>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Accessibility - ARIA Labels for Icon Buttons', () => {
  describe('TopBar Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<TopBar />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('notification bell button should have aria-label', () => {
      const { container } = render(<TopBar />);
      const bellButton = container.querySelector('button[aria-label*="Notification"]');
      expect(bellButton).toBeInTheDocument();
      expect(bellButton).toHaveAttribute('aria-label');
    });

    it('profile button should have aria-label or accessible name', () => {
      const { container } = render(<TopBar />);
      // Profile button contains Avatar, should have accessible name
      const profileButtons = container.querySelectorAll('button');
      const profileButton = Array.from(profileButtons).find(btn =>
        btn.querySelector('[class*="avatar"]') ||
        btn.getAttribute('aria-label')?.toLowerCase().includes('profile')
      );
      expect(profileButton).toBeDefined();
    });
  });

  describe('SidebarNew Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<SidebarNew collapsed={false} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('plus button should have aria-label', () => {
      const { container } = render(<SidebarNew collapsed={false} />);
      const plusButton = container.querySelector('button[aria-label*="Create"]');
      expect(plusButton).toBeInTheDocument();
      expect(plusButton).toHaveAttribute('aria-label');
    });

    it('collapse toggle button should have aria-label', () => {
      const { container } = render(<SidebarNew collapsed={false} />);
      const toggleButtons = container.querySelectorAll('button');
      const toggleButton = Array.from(toggleButtons).find(btn =>
        btn.getAttribute('aria-label')?.toLowerCase().includes('collapse') ||
        btn.getAttribute('aria-label')?.toLowerCase().includes('expand')
      );
      expect(toggleButton).toBeDefined();
    });
  });

  describe('DashboardHeader Component', () => {
    const defaultProps = {
      selectedProject: {
        id: '1',
        name: 'Test Project',
        description: 'Test Description',
        status: 'active',
        progress: 50,
      },
      sidebarOpen: true,
      setSidebarOpen: jest.fn(),
      activeView: 'table' as const,
      setActiveView: jest.fn(),
      searchTerm: '',
      setSearchTerm: jest.fn(),
      isConnected: true,
    };

    it('should have no accessibility violations', async () => {
      const { container } = render(<DashboardHeader {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('notification bell button should have aria-label', () => {
      const { container } = render(<DashboardHeader {...defaultProps} />);
      const bellButton = container.querySelector('button[aria-label*="notification"]');
      expect(bellButton).toBeInTheDocument();
      expect(bellButton).toHaveAttribute('aria-label');
    });

    it('create new button should have aria-label', () => {
      const { container } = render(<DashboardHeader {...defaultProps} />);
      const newButton = container.querySelector('button[aria-label*="Create"]');
      expect(newButton).toBeInTheDocument();
      expect(newButton).toHaveAttribute('aria-label');
    });

    it('menu button should have aria-label', () => {
      const { container } = render(<DashboardHeader {...defaultProps} />);
      const menuButton = container.querySelector('button[aria-label*="menu"]');
      expect(menuButton).toBeInTheDocument();
      expect(menuButton).toHaveAttribute('aria-label');
    });

    it('view toggle buttons should have aria-labels', () => {
      const { container } = render(<DashboardHeader {...defaultProps} />);
      const tableButton = container.querySelector('button[aria-label*="table"]');
      const kanbanButton = container.querySelector('button[aria-label*="kanban"]');
      const ganttButton = container.querySelector('button[aria-label*="gantt"]');

      expect(tableButton).toBeInTheDocument();
      expect(kanbanButton).toBeInTheDocument();
      expect(ganttButton).toBeInTheDocument();
    });
  });
});
