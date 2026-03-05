import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/empire/missions',
  useParams: () => ({}),
  redirect: vi.fn(),
}));

// Mock sonner toast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};
vi.mock('sonner', () => ({
  toast: mockToast,
}));

// Mock auth hook
const mockAuthUser = { id: 'test-user-id', email: 'test@example.com' };
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    loading: false,
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('Project Dropdown Menu Items', () => {
  const getProjectActionsButton = () => {
    const projectName = screen.getByText('Test Project');
    const projectLink = projectName.closest('a');
    const buttons = projectLink?.querySelectorAll('button');
    const menuButton = buttons?.[buttons.length - 1];
    if (!menuButton) throw new Error('Could not find project actions button');
    return menuButton;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockToast.success.mockClear();
    mockToast.error.mockClear();

    // Default fetch mock for GET /api/projects
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          projects: [
            {
              id: 'project-1',
              name: 'Test Project',
              slug: 'test-project',
              description: 'Test description',
              color: '#6366F1',
              icon: 'folder',
              status: 'active',
              is_pinned: false,
              progress: 50,
              tasks_completed: 5,
              total_tasks: 10,
              risk: 'low',
              owner_name: 'Test Owner',
              updated_at: '2 days ago',
            },
          ],
        },
      }),
    });
  });

  it('should call handleEditProject when Edit project is clicked', async () => {
    const user = userEvent.setup();
    const ProjectsPage = (await import('../ProjectsPageClient')).default;

    render(<ProjectsPage />);

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    await user.click(getProjectActionsButton());

    // Wait for dropdown menu to appear and click Edit project
    const editButton = await screen.findByRole('menuitem', { name: 'Edit project' });
    await user.click(editButton);

    // Should open an edit dialog (we'll check for dialog presence)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('should call handleDuplicateProject when Duplicate is clicked', async () => {
    const user = userEvent.setup();
    const ProjectsPage = (await import('../ProjectsPageClient')).default;

    // Mock POST for duplicate
    (global.fetch as any).mockImplementation((url: string, options?: any) => {
      if (url === '/api/projects' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ok: true,
            data: {
              id: 'project-2',
              name: 'Test Project (Copy)',
              slug: 'test-project-copy',
            },
          }),
        });
      }
      // Default GET response
      return Promise.resolve({
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            projects: [
              {
                id: 'project-1',
                name: 'Test Project',
                slug: 'test-project',
                description: 'Test description',
                color: '#6366F1',
                icon: 'folder',
                status: 'active',
                is_pinned: false,
                progress: 50,
                tasks_completed: 5,
                total_tasks: 10,
                risk: 'low',
                owner_name: 'Test Owner',
                updated_at: '2 days ago',
              },
            ],
          },
        }),
      });
    });

    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    await user.click(getProjectActionsButton());

    const duplicateButton = await screen.findByRole('menuitem', { name: 'Duplicate' });
    await user.click(duplicateButton);

    // Should POST to /api/projects with copy data
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('Test Project (Copy)'),
        })
      );
    });

    // Should show success toast
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Project duplicated successfully');
    });
  });

  it('should call handleGenerateStatus when Generate status update is clicked', async () => {
    const user = userEvent.setup();
    const ProjectsPage = (await import('../ProjectsPageClient')).default;

    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    await user.click(getProjectActionsButton());

    const generateButton = await screen.findByRole('menuitem', { name: 'Generate status update' });
    await user.click(generateButton);

    // Should navigate to reports status flow with project context
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/reports?generate=status&project_slug=test-project');
    });
  });

  it('should call handleArchiveProject when Archive is clicked', async () => {
    const user = userEvent.setup();
    const ProjectsPage = (await import('../ProjectsPageClient')).default;

    // Mock PATCH for archive
    (global.fetch as any).mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/projects/project-1') && options?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ok: true,
            data: {
              id: 'project-1',
              status: 'archived',
            },
          }),
        });
      }
      // Default GET response
      return Promise.resolve({
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            projects: [
              {
                id: 'project-1',
                name: 'Test Project',
                slug: 'test-project',
                description: 'Test description',
                color: '#6366F1',
                icon: 'folder',
                status: 'active',
                is_pinned: false,
                progress: 50,
                tasks_completed: 5,
                total_tasks: 10,
                risk: 'low',
                owner_name: 'Test Owner',
                updated_at: '2 days ago',
              },
            ],
          },
        }),
      });
    });

    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    await user.click(getProjectActionsButton());

    const archiveButton = await screen.findByRole('menuitem', { name: 'Archive' });
    await user.click(archiveButton);

    // Should PATCH to /api/projects/{id} with status: archived
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects/project-1',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('archived'),
        })
      );
    });

    // Should show success toast
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Project archived successfully');
    });
  });
});
