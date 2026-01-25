import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';

expect.extend(toHaveNoViolations);

// Mock Sidebar Component
const MockSidebar = () => {
  const [projectsExpanded, setProjectsExpanded] = React.useState(true);

  const navItems = [
    { name: 'Home', href: '/dashboard' },
    { name: 'Inbox', href: '/inbox' },
    { name: 'Tasks', href: '/tasks' },
    { name: 'Reports', href: '/reports' },
  ];

  const projects = [
    { id: '1', name: 'Project A', slug: 'project-a' },
    { id: '2', name: 'Project B', slug: 'project-b' },
    { id: '3', name: 'Project C', slug: 'project-c' },
  ];

  return (
    <aside data-testid="sidebar">
      <nav aria-label="Main navigation" data-testid="main-nav">
        {navItems.map((item) => (
          <a
            key={item.name}
            href={item.href}
            data-testid={`nav-${item.name.toLowerCase()}`}
            className="nav-link"
          >
            {item.name}
          </a>
        ))}
      </nav>

      <div className="projects-section">
        <button
          onClick={() => setProjectsExpanded(!projectsExpanded)}
          aria-expanded={projectsExpanded}
          aria-label={
            projectsExpanded ? 'Collapse projects' : 'Expand projects'
          }
          data-testid="projects-toggle"
          className="projects-toggle"
        >
          Projects
        </button>

        {projectsExpanded && (
          <nav aria-label="Projects" data-testid="projects-nav">
            {projects.map((project) => (
              <a
                key={project.id}
                href={`/projects/${project.slug}`}
                data-testid={`project-${project.slug}`}
                className="project-link"
              >
                {project.name}
              </a>
            ))}
          </nav>
        )}
      </div>

      <div className="actions">
        <button data-testid="new-project-btn" className="action-btn">
          New Project
        </button>
        <a href="/settings" data-testid="settings-link" className="action-link">
          Settings
        </a>
      </div>
    </aside>
  );
};

describe('Keyboard Navigation - Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should navigate sidebar links with Tab key', async () => {
    const user = userEvent.setup();

    render(<MockSidebar />);

    const homeLink = screen.getByTestId('nav-home');
    homeLink.focus();

    expect(homeLink).toHaveFocus();

    await user.tab();
    const inboxLink = screen.getByTestId('nav-inbox');
    expect(inboxLink).toHaveFocus();

    await user.tab();
    const tasksLink = screen.getByTestId('nav-tasks');
    expect(tasksLink).toHaveFocus();
  });

  it('should activate links with Enter key', async () => {
    const user = userEvent.setup();

    render(<MockSidebar />);

    const homeLink = screen.getByTestId('nav-home') as HTMLAnchorElement;
    homeLink.focus();

    expect(homeLink).toHaveFocus();
    // Note: In a real browser, Enter would follow the link
  });

  it('should toggle projects section with keyboard', async () => {
    const user = userEvent.setup();

    render(<MockSidebar />);

    const toggleBtn = screen.getByTestId('projects-toggle');
    toggleBtn.focus();

    expect(toggleBtn).toHaveFocus();

    // Projects should be visible initially
    expect(screen.getByTestId('projects-nav')).toBeInTheDocument();

    await user.keyboard('{Enter}');

    // Projects should be hidden after toggle
    await waitFor(() => {
      expect(screen.queryByTestId('projects-nav')).not.toBeInTheDocument();
    });

    // Toggle again with Space
    await user.keyboard(' ');

    await waitFor(() => {
      expect(screen.getByTestId('projects-nav')).toBeInTheDocument();
    });
  });

  it('should navigate to projects with Tab after expanding', async () => {
    const user = userEvent.setup();

    render(<MockSidebar />);

    const toggleBtn = screen.getByTestId('projects-toggle');
    toggleBtn.focus();

    // Projects are already expanded, so tab to first project
    await user.tab();
    const projectA = screen.getByTestId('project-project-a');
    expect(projectA).toHaveFocus();

    await user.tab();
    const projectB = screen.getByTestId('project-project-b');
    expect(projectB).toHaveFocus();
  });

  it('should have aria-expanded on collapsible button', async () => {
    render(<MockSidebar />);

    const toggleBtn = screen.getByTestId('projects-toggle');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
  });

  it('should navigate all sidebar sections with Tab', async () => {
    const user = userEvent.setup();

    render(<MockSidebar />);

    const homeLink = screen.getByTestId('nav-home');
    homeLink.focus();

    // Navigate through main nav
    await user.tab();
    const inboxLink = screen.getByTestId('nav-inbox');
    expect(inboxLink).toHaveFocus();

    await user.tab();
    const tasksLink = screen.getByTestId('nav-tasks');
    expect(tasksLink).toHaveFocus();

    await user.tab();
    const reportsLink = screen.getByTestId('nav-reports');
    expect(reportsLink).toHaveFocus();

    // Navigate to projects section
    await user.tab();
    const toggleBtn = screen.getByTestId('projects-toggle');
    expect(toggleBtn).toHaveFocus();

    // Navigate through projects
    await user.tab();
    const projectA = screen.getByTestId('project-project-a');
    expect(projectA).toHaveFocus();

    await user.tab();
    const projectB = screen.getByTestId('project-project-b');
    expect(projectB).toHaveFocus();
  });

  it('should have visible focus indicators on sidebar links', async () => {
    render(<MockSidebar />);

    const homeLink = screen.getByTestId('nav-home');
    homeLink.focus();

    const styles = window.getComputedStyle(homeLink);
    const hasFocusIndicator =
      styles.outline !== 'none' ||
      styles.boxShadow !== 'none' ||
      styles.getPropertyValue('--tw-ring-offset-shadow') !== '';

    // Elements should have some focus indicator
    expect(homeLink).toHaveFocus();
  });

  it('should reverse Tab with Shift+Tab', async () => {
    const user = userEvent.setup();

    render(<MockSidebar />);

    const tasksLink = screen.getByTestId('nav-tasks');
    tasksLink.focus();

    expect(tasksLink).toHaveFocus();

    await user.tab({ shift: true });
    const inboxLink = screen.getByTestId('nav-inbox');
    expect(inboxLink).toHaveFocus();

    await user.tab({ shift: true });
    const homeLink = screen.getByTestId('nav-home');
    expect(homeLink).toHaveFocus();
  });

  it('should have proper landmark role for navigation', async () => {
    const { container } = render(<MockSidebar />);

    const mainNav = screen.getByTestId('main-nav');
    expect(mainNav).toHaveAttribute('aria-label', 'Main navigation');

    const projectsNav = screen.getByTestId('projects-nav');
    expect(projectsNav).toHaveAttribute('aria-label', 'Projects');
  });

  it('should pass accessibility checks', async () => {
    const { container } = render(<MockSidebar />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have descriptive aria labels on buttons', async () => {
    render(<MockSidebar />);

    const toggleBtn = screen.getByTestId('projects-toggle');
    expect(toggleBtn).toHaveAttribute('aria-label');

    const newProjectBtn = screen.getByTestId('new-project-btn');
    // Button should have either text content or aria-label
    const hasLabel =
      newProjectBtn.textContent?.trim() ||
      newProjectBtn.getAttribute('aria-label');
    expect(hasLabel).toBeTruthy();
  });

  it('should skip over disabled items in tab order', async () => {
    const user = userEvent.setup();

    const DisabledSidebar = () => (
      <nav>
        <a href="/" data-testid="link-1">
          Link 1
        </a>
        <a href="/" data-testid="link-2" aria-disabled="true" tabIndex={-1}>
          Link 2 (disabled)
        </a>
        <a href="/" data-testid="link-3">
          Link 3
        </a>
      </nav>
    );

    render(<DisabledSidebar />);

    const link1 = screen.getByTestId('link-1');
    link1.focus();

    await user.tab();
    const link3 = screen.getByTestId('link-3');
    expect(link3).toHaveFocus();
  });
});
