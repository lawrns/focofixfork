import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '../page';

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: any) => children,
}));

// Mock the store
vi.mock('@/lib/stores/foco-store', () => ({
  useUIPreferencesStore: () => ({
    density: 'comfortable',
    setDensity: vi.fn(),
  }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Settings Page - Save Button', () => {
  let mockToast: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Get the mocked toast
    const { toast } = await import('sonner');
    mockToast = toast;
  });

  it('should render the Save Changes button in workspace settings', () => {
    render(<SettingsPage />);

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).toBeInTheDocument();
  });

  it('should call API when Save Changes button is clicked', async () => {
    const user = userEvent.setup();

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SettingsPage />);

    // Get the workspace name input and change it
    const workspaceNameInput = screen.getByLabelText(/workspace name/i);
    await user.clear(workspaceNameInput);
    await user.type(workspaceNameInput, 'New Workspace Name');

    // Click the save button
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    // Wait for the API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.any(String),
        })
      );
    });
  });

  it('should show loading state while saving', async () => {
    const user = userEvent.setup();

    // Mock API response with delay
    (global.fetch as any).mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true }),
      }), 100))
    );

    render(<SettingsPage />);

    const saveButton = screen.getByRole('button', { name: /save changes/i });

    // Click the save button
    await user.click(saveButton);

    // Button should be disabled during save
    expect(saveButton).toBeDisabled();

    // Wait for save to complete
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    }, { timeout: 2000 });
  });

  it('should show success toast on successful save', async () => {
    const user = userEvent.setup();

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SettingsPage />);

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Settings saved successfully');
    });
  });

  it('should show error toast on failed save', async () => {
    const user = userEvent.setup();

    // Mock failed API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to save settings' }),
    });

    render(<SettingsPage />);

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to save settings');
    });
  });

  it('should include workspace details in the API request', async () => {
    const user = userEvent.setup();

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SettingsPage />);

    // Fill in workspace details
    const workspaceNameInput = screen.getByLabelText(/workspace name/i);
    const workspaceSlugInput = screen.getByLabelText(/workspace url/i);
    const workspaceDescInput = screen.getByLabelText(/description/i);

    await user.clear(workspaceNameInput);
    await user.type(workspaceNameInput, 'Test Workspace');

    await user.clear(workspaceSlugInput);
    await user.type(workspaceSlugInput, 'test-workspace');

    await user.clear(workspaceDescInput);
    await user.type(workspaceDescInput, 'Test Description');

    // Click save
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    // Verify API call includes the data
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.workspaceName).toBe('Test Workspace');
      expect(body.workspaceSlug).toBe('test-workspace');
      expect(body.workspaceDescription).toBe('Test Description');
    });
  });
});
