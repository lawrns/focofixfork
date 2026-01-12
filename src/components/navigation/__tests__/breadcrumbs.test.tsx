import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Breadcrumbs } from '../breadcrumbs';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
  usePathname: vi.fn(),
}));

// Mock use-media-query hook
vi.mock('@/lib/hooks/use-media-query', () => ({
  useMediaQuery: vi.fn(() => false), // Default to desktop view
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronLeft: ({ className }: { className?: string }) => <div data-testid="chevron-left" className={className} />,
}));

import { usePathname } from 'next/navigation';
import { useMediaQuery } from '@/lib/hooks/use-media-query';

describe('Breadcrumbs Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dashboard Page', () => {
    beforeEach(() => {
      (usePathname as any).mockReturnValue('/dashboard');
    });

    it('renders Dashboard breadcrumb', () => {
      render(<Breadcrumbs />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('Dashboard is not a link', () => {
      render(<Breadcrumbs />);
      const dashboardElement = screen.getByText('Dashboard');
      expect(dashboardElement.tagName).not.toBe('A');
    });

    it('Dashboard text is bold', () => {
      render(<Breadcrumbs />);
      const dashboardElement = screen.getByText('Dashboard');
      expect(dashboardElement).toHaveClass('font-bold');
    });
  });

  describe('Project Pages', () => {
    beforeEach(() => {
      (usePathname as any).mockReturnValue('/projects/my-awesome-project');
    });

    it('renders breadcrumb path: Home > Projects > Project Name', () => {
      render(<Breadcrumbs projectName="My Awesome Project" />);
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('My Awesome Project')).toBeInTheDocument();
    });

    it('Home link is present and navigable', () => {
      render(<Breadcrumbs projectName="My Project" />);
      const homeLink = screen.getByRole('link', { name: /home/i });
      expect(homeLink).toHaveAttribute('href', '/dashboard');
    });

    it('Projects link is present and navigable', () => {
      render(<Breadcrumbs projectName="My Project" />);
      const projectsLink = screen.getByRole('link', { name: /projects/i });
      expect(projectsLink).toHaveAttribute('href', '/projects');
    });

    it('Project Name is not a link and is bold', () => {
      render(<Breadcrumbs projectName="My Project" />);
      const projectElement = screen.getByText('My Project');
      expect(projectElement.tagName).not.toBe('A');
      expect(projectElement).toHaveClass('font-bold');
    });
  });

  describe('Task Pages', () => {
    beforeEach(() => {
      (usePathname as any).mockReturnValue('/projects/my-project/tasks/task-123');
    });

    it('renders breadcrumb path: Home > Projects > Project Name > Task Title', () => {
      render(<Breadcrumbs projectName="My Project" taskTitle="Complete Feature" />);
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('My Project')).toBeInTheDocument();
      expect(screen.getByText('Complete Feature')).toBeInTheDocument();
    });

    it('Task Title is not a link and is bold', () => {
      render(<Breadcrumbs projectName="My Project" taskTitle="Complete Feature" />);
      const taskElement = screen.getByText('Complete Feature');
      expect(taskElement.tagName).not.toBe('A');
      expect(taskElement).toHaveClass('font-bold');
    });

    it('Project Name is a link', () => {
      render(<Breadcrumbs projectName="My Project" taskTitle="Complete Feature" />);
      const projectLink = screen.getByRole('link', { name: /my project/i });
      expect(projectLink).toBeInTheDocument();
    });
  });

  describe('Long Names Truncation', () => {
    beforeEach(() => {
      (usePathname as any).mockReturnValue('/projects/very-long-project-name/tasks/task-123');
    });

    it('truncates long project names to 30 characters with ellipsis', () => {
      const longName = 'This is a very long project name that should be truncated';
      render(<Breadcrumbs projectName={longName} />);

      const projectElement = screen.getByText('This is a very long project na...');
      expect(projectElement).toBeInTheDocument();
      // Verify truncation: 30 characters of original text + "..."
      expect(projectElement.textContent?.length).toBe(33);
    });

    it('truncates long task titles to 30 characters with ellipsis', () => {
      const longTitle = 'This is a very long task title that should be truncated here';
      render(<Breadcrumbs projectName="My Project" taskTitle={longTitle} />);

      const taskElement = screen.getByText('This is a very long task title...');
      expect(taskElement).toBeInTheDocument();
    });

    it('does not truncate short names', () => {
      render(<Breadcrumbs projectName="Short" taskTitle="Task" />);
      expect(screen.getByText('Short')).toBeInTheDocument();
      expect(screen.getByText('Task')).toBeInTheDocument();
    });
  });

  describe('Separator Display', () => {
    beforeEach(() => {
      (usePathname as any).mockReturnValue('/projects/my-project/tasks/task-123');
    });

    it('displays separator between breadcrumb items', () => {
      render(<Breadcrumbs projectName="My Project" taskTitle="Task Title" />);
      // Check for separator - should be visible between items
      const separators = screen.getAllByText('/');
      expect(separators.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Behavior - Mobile', () => {
    beforeEach(() => {
      (usePathname as any).mockReturnValue('/projects/my-project/tasks/task-123');
    });

    it('shows only current page and back button on mobile', () => {
      (useMediaQuery as any).mockReturnValue(true); // Mobile view
      render(<Breadcrumbs projectName="My Project" taskTitle="Task Title" />);
      const mobileBreadcrumbs = screen.getByTestId('breadcrumbs-mobile');
      expect(mobileBreadcrumbs).toBeInTheDocument();
    });

    it('hides full breadcrumbs on mobile screens', () => {
      (useMediaQuery as any).mockReturnValue(true); // Mobile view
      const { container } = render(<Breadcrumbs projectName="My Project" taskTitle="Task Title" />);
      const fullBreadcrumbs = container.querySelector('[data-testid="breadcrumbs-full"]');
      expect(fullBreadcrumbs).not.toBeInTheDocument();
    });

    it('back button in mobile view navigates to previous page', async () => {
      (useMediaQuery as any).mockReturnValue(true); // Mobile view
      const user = userEvent.setup();
      const mockBack = vi.fn();

      // Mock window history
      Object.defineProperty(window, 'history', {
        value: { back: mockBack },
        writable: true,
      });

      render(<Breadcrumbs projectName="My Project" taskTitle="Task Title" />);
      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);
      expect(mockBack).toHaveBeenCalled();
    });

    it('displays full breadcrumbs on desktop screens', () => {
      (useMediaQuery as any).mockReturnValue(false); // Desktop view
      render(<Breadcrumbs projectName="My Project" taskTitle="Task Title" />);
      const fullBreadcrumbs = screen.getByTestId('breadcrumbs-full');
      expect(fullBreadcrumbs).toBeInTheDocument();
    });
  });

  describe('Separator Styling', () => {
    beforeEach(() => {
      (usePathname as any).mockReturnValue('/projects/my-project');
    });

    it('renders breadcrumbs with / separator', () => {
      render(<Breadcrumbs projectName="My Project" />);
      const separators = screen.getAllByText('/');
      expect(separators.length).toBeGreaterThan(0);
    });

    it('separators are light gray on desktop', () => {
      const { container } = render(<Breadcrumbs projectName="My Project" />);
      const separator = container.querySelector('[data-testid="breadcrumb-separator"]');
      expect(separator).toHaveClass('text-zinc-400');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      (usePathname as any).mockReturnValue('/projects/my-project/tasks/task-123');
    });

    it('links have proper aria labels', () => {
      render(<Breadcrumbs projectName="My Project" taskTitle="Task Title" />);
      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link).toHaveAccessibleName();
      });
    });

    it('renders with nav role', () => {
      const { container } = render(<Breadcrumbs projectName="My Project" />);
      const nav = container.querySelector('nav');
      expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
    });
  });
});
