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

describe('Settings Page - AI Policy Switches', () => {
  let mockToast: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { toast } = await import('sonner');
    mockToast = toast;
  });

  it('should render all data source switches in AI Policy', async () => {
    render(<SettingsPage />);

    // Navigate to AI Policy tab
    const aiPolicyButton = screen.getByRole('button', { name: /ai policy/i });
    await userEvent.click(aiPolicyButton);

    // Check all data sources are present
    expect(screen.getByText('Tasks & Work Items')).toBeInTheDocument();
    expect(screen.getByText('Comments & Discussions')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Activity History')).toBeInTheDocument();
  });

  it('should render all AI action switches in AI Policy', async () => {
    render(<SettingsPage />);

    // Navigate to AI Policy tab
    const aiPolicyButton = screen.getByRole('button', { name: /ai policy/i });
    await userEvent.click(aiPolicyButton);

    // Check all AI actions are present
    expect(screen.getByText('Auto-triage new items')).toBeInTheDocument();
    expect(screen.getByText('Suggest assignments')).toBeInTheDocument();
    expect(screen.getByText('Suggest due dates')).toBeInTheDocument();
    expect(screen.getByText('Generate status reports')).toBeInTheDocument();
    expect(screen.getByText('Break down tasks')).toBeInTheDocument();
    expect(screen.getByText('Reassign blocked items')).toBeInTheDocument();
  });

  it('should toggle data source switches', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    // Navigate to AI Policy tab
    const aiPolicyButton = screen.getByRole('button', { name: /ai policy/i });
    await user.click(aiPolicyButton);

    // Find all switches - there are multiple sections with switches
    const switches = screen.getAllByRole('switch');

    // Data sources are the first 4 switches after auto-apply (index 1-4)
    const tasksSwitch = switches[1]; // Tasks & Work Items

    // Check initial state
    expect(tasksSwitch).toBeChecked();

    // Toggle the switch
    await user.click(tasksSwitch);

    // Switch should be unchecked after toggle
    expect(tasksSwitch).not.toBeChecked();
  });

  it('should toggle AI action switches', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    // Navigate to AI Policy tab
    const aiPolicyButton = screen.getByRole('button', { name: /ai policy/i });
    await user.click(aiPolicyButton);

    // Find all switches
    const switches = screen.getAllByRole('switch');

    // AI actions are switches 5-10 (after auto-apply and 4 data sources)
    const triageSwitch = switches[5]; // Auto-triage new items

    // Check initial state
    expect(triageSwitch).toBeChecked();

    // Toggle the switch
    await user.click(triageSwitch);

    // Switch should be unchecked
    expect(triageSwitch).not.toBeChecked();
  });

  it('should render Save button in AI Policy settings', async () => {
    render(<SettingsPage />);

    // Navigate to AI Policy tab
    const aiPolicyButton = screen.getByRole('button', { name: /ai policy/i });
    await userEvent.click(aiPolicyButton);

    // Should have a save button
    const saveButton = screen.getByRole('button', { name: /save (changes|ai policy settings)/i });
    expect(saveButton).toBeInTheDocument();
  });

  it('should save AI policy settings when Save button is clicked', async () => {
    const user = userEvent.setup();

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SettingsPage />);

    // Navigate to AI Policy tab
    const aiPolicyButton = screen.getByRole('button', { name: /ai policy/i });
    await user.click(aiPolicyButton);

    // Toggle some switches
    const switches = screen.getAllByRole('switch');
    const tasksSwitch = switches[1]; // Tasks switch
    await user.click(tasksSwitch);

    // Click save
    const saveButton = screen.getByRole('button', { name: /save (changes|ai policy settings)/i });
    await user.click(saveButton);

    // Verify API was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  it('should include AI policy data in API request', async () => {
    const user = userEvent.setup();

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SettingsPage />);

    // Navigate to AI Policy tab
    const aiPolicyButton = screen.getByRole('button', { name: /ai policy/i });
    await user.click(aiPolicyButton);

    // Toggle specific switches
    const switches = screen.getAllByRole('switch');
    const tasksSwitch = switches[1]; // Tasks switch
    await user.click(tasksSwitch); // Turn OFF

    // Click save
    const saveButton = screen.getByRole('button', { name: /save (changes|ai policy settings)/i });
    await user.click(saveButton);

    // Verify API call includes AI policy data
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.aiPolicy).toBeDefined();
      expect(body.aiPolicy.dataSources).toBeDefined();
      expect(body.aiPolicy.dataSources.tasks).toBe(false); // We toggled it off
    });
  });

  it('should show loading state while saving AI policy', async () => {
    const user = userEvent.setup();

    // Mock API with delay
    (global.fetch as any).mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true }),
      }), 100))
    );

    render(<SettingsPage />);

    // Navigate to AI Policy tab
    const aiPolicyButton = screen.getByRole('button', { name: /ai policy/i });
    await user.click(aiPolicyButton);

    const saveButton = screen.getByRole('button', { name: /save (changes|ai policy settings)/i });
    await user.click(saveButton);

    // Button should be disabled and show loading text
    expect(saveButton).toBeDisabled();
    expect(screen.getByText(/saving/i)).toBeInTheDocument();

    // Wait for save to complete
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    }, { timeout: 2000 });
  });

  it('should show success toast after saving AI policy', async () => {
    const user = userEvent.setup();

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SettingsPage />);

    // Navigate to AI Policy tab
    const aiPolicyButton = screen.getByRole('button', { name: /ai policy/i });
    await user.click(aiPolicyButton);

    const saveButton = screen.getByRole('button', { name: /save (changes|ai policy settings)/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('AI policy settings saved successfully');
    });
  });

  it('should show error toast on failed AI policy save', async () => {
    const user = userEvent.setup();

    // Mock failed API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to save' }),
    });

    render(<SettingsPage />);

    // Navigate to AI Policy tab
    const aiPolicyButton = screen.getByRole('button', { name: /ai policy/i });
    await user.click(aiPolicyButton);

    const saveButton = screen.getByRole('button', { name: /save (changes|ai policy settings)/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to save AI policy settings');
    });
  });
});
