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

describe('Settings Page - Notification Switches', () => {
  let mockToast: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { toast } = await import('sonner');
    mockToast = toast;
  });

  it('should render all notification channel switches', async () => {
    render(<SettingsPage />);

    // Navigate to Notifications tab
    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await userEvent.click(notificationsButton);

    // Check all notification channels are present
    expect(screen.getByText('In-app notifications')).toBeInTheDocument();
    expect(screen.getByText('Email notifications')).toBeInTheDocument();
    expect(screen.getByText('Push notifications')).toBeInTheDocument();
    expect(screen.getByText('Slack notifications')).toBeInTheDocument();
  });

  it('should render all notification type switches', async () => {
    render(<SettingsPage />);

    // Navigate to Notifications tab
    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await userEvent.click(notificationsButton);

    // Check all notification types are present
    expect(screen.getByText('Mentions')).toBeInTheDocument();
    expect(screen.getByText('Assigned to me')).toBeInTheDocument();
    expect(screen.getByText('Comments on my tasks')).toBeInTheDocument();
    expect(screen.getByText('Status changes')).toBeInTheDocument();
    expect(screen.getByText('Due date reminders')).toBeInTheDocument();
    expect(screen.getByText('AI flags and suggestions')).toBeInTheDocument();
  });

  it('should toggle notification channel switches', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    // Navigate to Notifications tab
    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await user.click(notificationsButton);

    // Find all switches
    const switches = screen.getAllByRole('switch');

    // Notification channels are the first 4 switches (index 0-3)
    const inAppSwitch = switches[0]; // In-app notifications

    // Check initial state
    expect(inAppSwitch).toBeChecked();

    // Toggle the switch
    await user.click(inAppSwitch);

    // Switch should be unchecked after toggle
    expect(inAppSwitch).not.toBeChecked();
  });

  it('should toggle notification type switches', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    // Navigate to Notifications tab
    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await user.click(notificationsButton);

    // Find all switches
    const switches = screen.getAllByRole('switch');

    // Notification types are switches 4-9 (after 4 channel switches)
    const mentionsSwitch = switches[4]; // Mentions

    // Check initial state
    expect(mentionsSwitch).toBeChecked();

    // Toggle the switch
    await user.click(mentionsSwitch);

    // Switch should be unchecked
    expect(mentionsSwitch).not.toBeChecked();
  });

  it('should render Save button in Notification settings', async () => {
    render(<SettingsPage />);

    // Navigate to Notifications tab
    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await userEvent.click(notificationsButton);

    // Should have a save button
    const saveButton = screen.getByRole('button', { name: /save (changes|notification settings)/i });
    expect(saveButton).toBeInTheDocument();
  });

  it('should save notification settings when Save button is clicked', async () => {
    const user = userEvent.setup();

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SettingsPage />);

    // Navigate to Notifications tab
    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await user.click(notificationsButton);

    // Toggle some switches
    const switches = screen.getAllByRole('switch');
    const emailSwitch = switches[1]; // Email notifications
    await user.click(emailSwitch);

    // Click save
    const saveButton = screen.getByRole('button', { name: /save (changes|notification settings)/i });
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

  it('should include notification data in API request', async () => {
    const user = userEvent.setup();

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SettingsPage />);

    // Navigate to Notifications tab
    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await user.click(notificationsButton);

    // Toggle specific switches
    const switches = screen.getAllByRole('switch');
    const emailSwitch = switches[1]; // Email switch
    await user.click(emailSwitch); // Turn OFF

    // Click save
    const saveButton = screen.getByRole('button', { name: /save (changes|notification settings)/i });
    await user.click(saveButton);

    // Verify API call includes notification data
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.notifications).toBeDefined();
      expect(body.notifications.channels).toBeDefined();
      expect(body.notifications.channels.email).toBe(false); // We toggled it off
    });
  });

  it('should show loading state while saving notifications', async () => {
    const user = userEvent.setup();

    // Mock API with delay
    (global.fetch as any).mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true }),
      }), 100))
    );

    render(<SettingsPage />);

    // Navigate to Notifications tab
    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await user.click(notificationsButton);

    const saveButton = screen.getByRole('button', { name: /save (changes|notification settings)/i });
    await user.click(saveButton);

    // Button should be disabled and show loading text
    expect(saveButton).toBeDisabled();
    expect(screen.getByText(/saving/i)).toBeInTheDocument();

    // Wait for save to complete
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    }, { timeout: 2000 });
  });

  it('should show success toast after saving notifications', async () => {
    const user = userEvent.setup();

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SettingsPage />);

    // Navigate to Notifications tab
    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await user.click(notificationsButton);

    const saveButton = screen.getByRole('button', { name: /save (changes|notification settings)/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Notification settings saved successfully');
    });
  });

  it('should show error toast on failed notification save', async () => {
    const user = userEvent.setup();

    // Mock failed API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to save' }),
    });

    render(<SettingsPage />);

    // Navigate to Notifications tab
    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await user.click(notificationsButton);

    const saveButton = screen.getByRole('button', { name: /save (changes|notification settings)/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to save notification settings');
    });
  });

  it('should correctly save all channel states', async () => {
    const user = userEvent.setup();

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SettingsPage />);

    // Navigate to Notifications tab
    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await user.click(notificationsButton);

    // Toggle multiple switches
    const switches = screen.getAllByRole('switch');
    await user.click(switches[0]); // in_app - turn OFF
    await user.click(switches[2]); // push - turn ON

    // Click save
    const saveButton = screen.getByRole('button', { name: /save (changes|notification settings)/i });
    await user.click(saveButton);

    // Verify API call includes correct channel states
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.notifications.channels.in_app).toBe(false); // Toggled off
      expect(body.notifications.channels.email).toBe(true); // Unchanged (was on)
      expect(body.notifications.channels.push).toBe(true); // Toggled on
    });
  });

  it('should correctly save all notification type states', async () => {
    const user = userEvent.setup();

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SettingsPage />);

    // Navigate to Notifications tab
    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await user.click(notificationsButton);

    // Toggle notification type switches (indices 4-9)
    const switches = screen.getAllByRole('switch');
    await user.click(switches[4]); // mentions - turn OFF
    await user.click(switches[7]); // status - turn ON

    // Click save
    const saveButton = screen.getByRole('button', { name: /save (changes|notification settings)/i });
    await user.click(saveButton);

    // Verify API call includes correct type states
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.notifications.types.mentions).toBe(false); // Toggled off
      expect(body.notifications.types.status).toBe(true); // Toggled on
    });
  });
});
