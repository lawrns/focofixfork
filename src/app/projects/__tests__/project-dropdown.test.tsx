import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  useParams: () => ({}),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Plus: () => 'Plus',
  Search: () => 'Search',
  Filter: () => 'Filter',
  Grid3X3: () => 'Grid3X3',
  List: () => 'List',
  MoreHorizontal: () => 'MoreHorizontal',
  Star: () => 'Star',
  StarOff: () => 'StarOff',
  Users: () => 'Users',
  Calendar: () => 'Calendar',
  AlertTriangle: () => 'AlertTriangle',
  FolderKanban: () => 'FolderKanban',
  ArrowUpDown: () => 'ArrowUpDown',
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
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    isLoading: false,
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('Project Dropdown Menu Items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockToast.success.mockClear();
    mockToast.error.mockClear();

    // Default fetch mock for GET /api/projects
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          data: [
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
              owner: { name: 'Test Owner' },
              team_size: 3,
              updated_at: '2 days ago',
            },
          ],
        },
      }),
    });
  });

  it('should call handleEditProject when Edit project is clicked', async () => {
    const user = userEvent.setup();
    const ProjectsPage = (await import('../page')).default;

    render(<ProjectsPage />);

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Find and click the dropdown trigger (MoreHorizontal button)
    const dropdownTriggers = screen.getAllByRole('button');
    const moreButton = dropdownTriggers.find(btn =>
      btn.querySelector('svg') || btn.textContent === 'MoreHorizontal'
    );

    expect(moreButton).toBeDefined();
    await user.click(moreButton!);

    // Wait for dropdown menu to appear and click Edit project
    await waitFor(() => {
      const editButton = screen.getByText('Edit project');
      expect(editButton).toBeInTheDocument();
    });

    const editButton = screen.getByText('Edit project');
    await user.click(editButton);

    // Should open an edit dialog (we'll check for dialog presence)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('should call handleDuplicateProject when Duplicate is clicked', async () => {
    const user = userEvent.setup();
    const ProjectsPage = (await import('../page')).default;

    // Mock POST for duplicate
    (global.fetch as any).mockImplementation((url: string, options?: any) => {
      if (url === '/api/projects' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
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
          success: true,
          data: {
            data: [
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
                owner: { name: 'Test Owner' },
                team_size: 3,
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

    const dropdownTriggers = screen.getAllByRole('button');
    const moreButton = dropdownTriggers.find(btn =>
      btn.querySelector('svg') || btn.textContent === 'MoreHorizontal'
    );

    await user.click(moreButton!);

    await waitFor(() => {
      const duplicateButton = screen.getByText('Duplicate');
      expect(duplicateButton).toBeInTheDocument();
    });

    const duplicateButton = screen.getByText('Duplicate');
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
    const ProjectsPage = (await import('../page')).default;

    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    const dropdownTriggers = screen.getAllByRole('button');
    const moreButton = dropdownTriggers.find(btn =>
      btn.querySelector('svg') || btn.textContent === 'MoreHorizontal'
    );

    await user.click(moreButton!);

    await waitFor(() => {
      const generateButton = screen.getByText('Generate status update');
      expect(generateButton).toBeInTheDocument();
    });

    const generateButton = screen.getByText('Generate status update');
    await user.click(generateButton);

    // Should navigate to /projects/{slug}/status-update
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/projects/test-project/status-update');
    });
  });

  it('should call handleArchiveProject when Archive is clicked', async () => {
    const user = userEvent.setup();
    const ProjectsPage = (await import('../page')).default;

    // Mock PATCH for archive
    (global.fetch as any).mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/projects/project-1') && options?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
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
          success: true,
          data: {
            data: [
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
                owner: { name: 'Test Owner' },
                team_size: 3,
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

    const dropdownTriggers = screen.getAllByRole('button');
    const moreButton = dropdownTriggers.find(btn =>
      btn.querySelector('svg') || btn.textContent === 'MoreHorizontal'
    );

    await user.click(moreButton!);

    await waitFor(() => {
      const archiveButton = screen.getByText('Archive');
      expect(archiveButton).toBeInTheDocument();
    });

    const archiveButton = screen.getByText('Archive');
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
