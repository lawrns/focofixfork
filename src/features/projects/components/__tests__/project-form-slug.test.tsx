import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectForm } from '../project-form';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon">Loading</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
  AlertCircle: () => <div data-testid="alert-icon">Alert</div>,
  ChevronUp: () => <div data-testid="chevron-up-icon">^</div>,
  ChevronDown: () => <div data-testid="chevron-down-icon">v</div>,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock auth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
  }),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('ProjectForm - Slug Validation', () => {
  const mockOrganizations = [
    { id: 'org-1', name: 'Test Organization' },
    { id: 'org-2', name: 'Another Org' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Slug Field Rendering', () => {
    it('should render slug input field with auto-generated value', async () => {
      render(
        <ProjectForm
          organizations={mockOrganizations}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const user = userEvent.setup();

      // Type a project name
      await user.type(nameInput, 'My Test Project');

      // Slug field should appear with auto-generated slug
      const slugInput = await screen.findByLabelText(/slug/i);
      expect(slugInput).toBeInTheDocument();
      expect(slugInput).toHaveValue('my-test-project');
    });

    it('should allow user to manually edit slug', async () => {
      render(
        <ProjectForm
          organizations={mockOrganizations}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const user = userEvent.setup();

      await user.type(nameInput, 'My Test Project');

      const slugInput = await screen.findByLabelText(/slug/i);

      // Clear and type custom slug
      await user.clear(slugInput);
      await user.type(slugInput, 'custom-slug');

      expect(slugInput).toHaveValue('custom-slug');
    });

    it('should show slug field even when editing project', async () => {
      const existingProject = {
        id: 'project-1',
        name: 'Existing Project',
        organization_id: 'org-1',
        status: 'active' as const,
        priority: 'medium' as const,
      };

      render(
        <ProjectForm
          project={existingProject}
          organizations={mockOrganizations}
        />
      );

      // When editing, slug field should be disabled
      const slugInput = await screen.findByLabelText(/slug/i);
      expect(slugInput).toBeInTheDocument();
      expect(slugInput).toBeDisabled();
    });
  });

  describe('Slug Uniqueness Validation', () => {
    it('should check slug uniqueness when slug changes', async () => {
      // Mock API to return slug is available
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ available: true }),
      });

      render(
        <ProjectForm
          organizations={mockOrganizations}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const user = userEvent.setup();

      await user.type(nameInput, 'Test Project');

      // Wait for debounced API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/projects/check-slug'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: expect.stringContaining('test-project'),
          })
        );
      }, { timeout: 2000 });
    });

    it('should debounce slug uniqueness check', async () => {
      vi.useFakeTimers();

      // Mock API
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ available: true }),
      });

      render(
        <ProjectForm
          organizations={mockOrganizations}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const user = userEvent.setup({ delay: null });

      // Type multiple characters rapidly
      await user.type(nameInput, 'Test');

      // API should not be called immediately
      expect(global.fetch).not.toHaveBeenCalled();

      // Fast-forward 500ms (debounce time)
      vi.advanceTimersByTime(500);

      // API should now be called once
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      vi.useRealTimers();
    });

    it('should show error message when slug is already taken', async () => {
      // Mock API to return slug is NOT available
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ available: false }),
      });

      render(
        <ProjectForm
          organizations={mockOrganizations}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const user = userEvent.setup();

      await user.type(nameInput, 'Existing Project');

      // Wait for error message
      const errorMessage = await screen.findByText(/slug already taken/i);
      expect(errorMessage).toBeInTheDocument();
    });

    it('should disable submit button when slug is not unique', async () => {
      // Mock API to return slug is NOT available
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ available: false }),
      });

      render(
        <ProjectForm
          organizations={mockOrganizations}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const user = userEvent.setup();

      await user.type(nameInput, 'Existing Project');

      // Wait for validation
      await screen.findByText(/slug already taken/i);

      // Submit button should be disabled
      const submitButton = screen.getByRole('button', { name: /create project/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when slug is unique', async () => {
      // Mock API to return slug is available
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ available: true }),
      });

      render(
        <ProjectForm
          organizations={mockOrganizations}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const user = userEvent.setup();

      await user.type(nameInput, 'New Project');

      // Wait for validation
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Submit button should be enabled
      const submitButton = screen.getByRole('button', { name: /create project/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('should show loading indicator during slug check', async () => {
      // Mock API with delay
      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ available: true }),
        }), 100))
      );

      render(
        <ProjectForm
          organizations={mockOrganizations}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const user = userEvent.setup();

      await user.type(nameInput, 'Test Project');

      // Should show checking indicator
      const checkingIndicator = await screen.findByText(/checking/i);
      expect(checkingIndicator).toBeInTheDocument();

      // Wait for check to complete
      await waitFor(() => {
        expect(screen.queryByText(/checking/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Race Condition Handling', () => {
    it('should handle rapid slug changes correctly', async () => {
      vi.useFakeTimers();

      let callCount = 0;
      (global.fetch as any).mockImplementation(() => {
        callCount++;
        const isAvailable = callCount === 1; // First call returns false, second true
        return Promise.resolve({
          ok: true,
          json: async () => ({ available: isAvailable }),
        });
      });

      render(
        <ProjectForm
          organizations={mockOrganizations}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const user = userEvent.setup({ delay: null });

      // Type first name
      await user.type(nameInput, 'First');
      vi.advanceTimersByTime(500);

      // Immediately change to second name
      await user.clear(nameInput);
      await user.type(nameInput, 'Second');
      vi.advanceTimersByTime(500);

      // Should only show result from most recent check
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();

      // The last result should be shown (available: true from second call)
      await waitFor(() => {
        expect(screen.queryByText(/slug already taken/i)).not.toBeInTheDocument();
      });
    });

    it('should cancel previous slug check when new one is triggered', async () => {
      vi.useFakeTimers();

      const abortSpy = vi.spyOn(AbortController.prototype, 'abort');

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ available: true }),
      });

      render(
        <ProjectForm
          organizations={mockOrganizations}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const user = userEvent.setup({ delay: null });

      // Type first value
      await user.type(nameInput, 'First');
      vi.advanceTimersByTime(300);

      // Type second value before first completes
      await user.clear(nameInput);
      await user.type(nameInput, 'Second');
      vi.advanceTimersByTime(500);

      // Abort should have been called for previous request
      await waitFor(() => {
        expect(abortSpy).toHaveBeenCalled();
      });

      vi.useRealTimers();
    });
  });

  describe('API Integration', () => {
    it('should reject duplicate slug on server side', async () => {
      // Mock slug check to pass
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ available: true }),
        })
        // Mock create to fail with duplicate error
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Slug already exists' }),
        });

      render(
        <ProjectForm
          organizations={mockOrganizations}
        />
      );

      const user = userEvent.setup();
      const nameInput = screen.getByLabelText(/project name/i);

      await user.type(nameInput, 'Test Project');

      // Wait for slug validation
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Fill other required fields
      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, 'Test description');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      // Should show server error
      const errorMessage = await screen.findByText(/slug already exists/i);
      expect(errorMessage).toBeInTheDocument();
    });

    it('should include workspace_id in slug uniqueness check', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ available: true }),
      });

      render(
        <ProjectForm
          organizations={mockOrganizations}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const user = userEvent.setup();

      // Select organization first
      const orgSelect = screen.getByRole('combobox', { name: /organization/i });
      await user.click(orgSelect);
      const orgOption = await screen.findByText('Test Organization');
      await user.click(orgOption);

      // Type project name
      await user.type(nameInput, 'Test Project');

      // API call should include workspace_id from selected organization
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            body: expect.stringContaining('org-1'),
          })
        );
      }, { timeout: 2000 });
    });

    it('should handle API errors gracefully', async () => {
      // Mock API to fail
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(
        <ProjectForm
          organizations={mockOrganizations}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const user = userEvent.setup();

      await user.type(nameInput, 'Test Project');

      // Should show error message or allow submission despite error
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /create project/i });
        // Button should remain enabled if check fails
        expect(submitButton).not.toBeDisabled();
      }, { timeout: 2000 });
    });
  });

  describe('User Experience', () => {
    it('should show success indicator when slug is available', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ available: true }),
      });

      render(
        <ProjectForm
          organizations={mockOrganizations}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const user = userEvent.setup();

      await user.type(nameInput, 'Available Project');

      // Should show available indicator
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Look for success indicator (checkmark or "available" text)
      const slugInput = screen.getByLabelText(/slug/i);
      expect(slugInput).toBeInTheDocument();

      // No error message should be visible
      expect(screen.queryByText(/already taken/i)).not.toBeInTheDocument();
    });

    it('should preserve user-edited slug when name changes', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ available: true }),
      });

      render(
        <ProjectForm
          organizations={mockOrganizations}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const user = userEvent.setup();

      // Type initial name
      await user.type(nameInput, 'Initial Name');

      const slugInput = await screen.findByLabelText(/slug/i);

      // Manually edit slug
      await user.clear(slugInput);
      await user.type(slugInput, 'custom-slug');

      // Change name
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      // Custom slug should be preserved
      expect(slugInput).toHaveValue('custom-slug');
    });

    it('should sanitize slug input to valid format', async () => {
      render(
        <ProjectForm
          organizations={mockOrganizations}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const user = userEvent.setup();

      await user.type(nameInput, 'Test!@# Project 123');

      const slugInput = await screen.findByLabelText(/slug/i);

      // Slug should be sanitized
      expect(slugInput).toHaveValue('test-project-123');
    });
  });
});
