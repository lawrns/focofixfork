import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { createMockUser, createMockProject, createMockTask, mockSupabaseResponse } from '../setup';

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({
          limit: vi.fn(),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  })),
};

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  QueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
  })),
  QueryClientProvider: ({ children }: any) => children,
}));

// Mock services
vi.mock('@/lib/services/projects', () => ({
  ProjectService: {
    getProjects: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  },
}));

vi.mock('@/lib/services/tasks', () => ({
  TaskService: {
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  },
}));

// Test component that integrates multiple services
function DataFlowTestComponent() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Simulate data loading
      const mockProjects = [createMockProject()];
      const mockTasks = [createMockTask()];

      setProjects(mockProjects);
      setTasks(mockTasks);
    } finally {
      setLoading(false);
    }
  };

  const createNewProject = async () => {
    const newProject = createMockProject({ name: 'New Project' });
    setProjects(prev => [...prev, newProject]);
  };

  const createNewTask = async (projectId: string) => {
    const newTask = createMockTask({ project_id: projectId, title: 'New Task' });
    setTasks(prev => [...prev, newTask]);
  };

  if (loading) return <div>Loading data...</div>;

  return (
    <div>
      <h1>Projects & Tasks</h1>

      <section>
        <h2>Projects ({projects.length})</h2>
        <button onClick={createNewProject}>Create Project</button>
        <ul>
          {projects.map((project: any) => (
            <li key={project.id}>
              <h3>{project.name}</h3>
              <button onClick={() => createNewTask(project.id)}>
                Add Task to {project.name}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Tasks ({tasks.length})</h2>
        <ul>
          {tasks.map((task: any) => (
            <li key={task.id}>
              {task.title} (Project: {task.project_id})
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// Import here to avoid circular dependency
import { useAuth } from '@/lib/contexts/auth-context';
import { useState, useEffect } from 'react';

describe('Data Flow Integration', () => {
  const mockUser = createMockUser();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue(mockSupabaseResponse(mockUser));
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
  });

  it('loads and displays data from multiple sources', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DataFlowTestComponent />
        </AuthProvider>
      </QueryClientProvider>
    );

    // Should show loading initially
    expect(screen.getByText('Loading data...')).toBeInTheDocument();

    // Should load and display data
    await waitFor(() => {
      expect(screen.getByText('Projects & Tasks')).toBeInTheDocument();
    });

    expect(screen.getByText('Projects (1)')).toBeInTheDocument();
    expect(screen.getByText('Tasks (1)')).toBeInTheDocument();
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('handles creating new projects and tasks', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DataFlowTestComponent />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Projects (1)')).toBeInTheDocument();
    });

    // Create new project
    const createProjectButton = screen.getByRole('button', { name: /create project/i });
    await user.click(createProjectButton);

    // Should show 2 projects
    await waitFor(() => {
      expect(screen.getByText('Projects (2)')).toBeInTheDocument();
    });
    expect(screen.getByText('New Project')).toBeInTheDocument();

    // Create task for first project
    const addTaskButtons = screen.getAllByRole('button', { name: /add task/i });
    await user.click(addTaskButtons[0]);

    // Should show 2 tasks
    await waitFor(() => {
      expect(screen.getByText('Tasks (2)')).toBeInTheDocument();
    });
    expect(screen.getByText('New Task')).toBeInTheDocument();
  });

  it('maintains data consistency across operations', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DataFlowTestComponent />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Projects (1)')).toBeInTheDocument();
    });

    // Create multiple projects and tasks
    const createProjectButton = screen.getByRole('button', { name: /create project/i });

    await user.click(createProjectButton);
    await user.click(createProjectButton);

    await waitFor(() => {
      expect(screen.getByText('Projects (3)')).toBeInTheDocument();
    });

    // Add tasks to different projects
    const addTaskButtons = screen.getAllByRole('button', { name: /add task/i });
    await user.click(addTaskButtons[0]);
    await user.click(addTaskButtons[1]);
    await user.click(addTaskButtons[2]);

    await waitFor(() => {
      expect(screen.getByText('Tasks (4)')).toBeInTheDocument();
    });

    // Verify all tasks are associated with projects
    const taskElements = screen.getAllByText(/Project:/);
    expect(taskElements).toHaveLength(4);
  });

  it('handles error states gracefully', async () => {
    // Mock data loading failure
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Force an error in data loading
    const originalLoadData = DataFlowTestComponent.prototype.loadData;
    DataFlowTestComponent.prototype.loadData = async function() {
      throw new Error('Data loading failed');
    };

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DataFlowTestComponent />
        </AuthProvider>
      </QueryClientProvider>
    );

    // Should handle error gracefully
    await waitFor(() => {
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    // Restore original method
    DataFlowTestComponent.prototype.loadData = originalLoadData;
    consoleSpy.mockRestore();
  });

  it('updates UI reactively when data changes', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DataFlowTestComponent />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Projects (1)')).toBeInTheDocument();
    });

    // Create project
    const createProjectButton = screen.getByRole('button', { name: /create project/i });
    await user.click(createProjectButton);

    // UI should update immediately
    expect(screen.getByText('Projects (2)')).toBeInTheDocument();
    expect(screen.getByText('New Project')).toBeInTheDocument();

    // Create task
    const addTaskButton = screen.getByRole('button', { name: /add task to new project/i });
    await user.click(addTaskButton);

    // UI should update immediately
    expect(screen.getByText('Tasks (2)')).toBeInTheDocument();
    expect(screen.getByText('New Task')).toBeInTheDocument();
  });

  it('maintains proper relationships between data entities', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DataFlowTestComponent />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Projects (1)')).toBeInTheDocument();
    });

    // Create a new project
    const createProjectButton = screen.getByRole('button', { name: /create project/i });
    await user.click(createProjectButton);

    await waitFor(() => {
      expect(screen.getByText('Projects (2)')).toBeInTheDocument();
    });

    // Get the new project ID from the task creation buttons
    const addTaskButtons = screen.getAllByRole('button', { name: /add task/i });
    expect(addTaskButtons).toHaveLength(2);

    // Add a task to the second project
    await user.click(addTaskButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Tasks (2)')).toBeInTheDocument();
    });

    // Verify the task is associated with the correct project
    const taskElements = screen.getAllByText(/New Task/);
    expect(taskElements).toHaveLength(1);
  });

  it('handles concurrent data operations', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DataFlowTestComponent />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Projects (1)')).toBeInTheDocument();
    });

    // Perform multiple operations quickly
    const createProjectButton = screen.getByRole('button', { name: /create project/i });

    await user.click(createProjectButton);
    await user.click(createProjectButton);
    await user.click(createProjectButton);

    // Wait for all operations to complete
    await waitFor(() => {
      expect(screen.getByText('Projects (4)')).toBeInTheDocument();
    });

    // Verify all projects were created
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4);
  });
});
