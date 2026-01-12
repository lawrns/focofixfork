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

describe('Settings Page - Quiet Hours', () => {
  let mockToast: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { toast } = await import('sonner');
    mockToast = toast;
  });

  it('should render quiet hours section in notification settings', async () => {
    render(<SettingsPage />);

    // Navigate to Notifications tab
    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await userEvent.click(notificationsButton);

    // Check for Quiet Hours section
    expect(screen.getByText(/quiet hours/i)).toBeInTheDocument();
  });

  it('should render quiet hours start and end time inputs', async () => {
    render(<SettingsPage />);

    // Navigate to Notifications tab
    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await userEvent.click(notificationsButton);

    // Check for time inputs
    const startInput = screen.getByLabelText(/quiet hours start|start time/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/quiet hours end|end time/i) as HTMLInputElement;

    expect(startInput).toBeInTheDocument();
    expect(endInput).toBeInTheDocument();
    expect(startInput.type).toBe('time');
    expect(endInput.type).toBe('time');
  });

  it('should show default quiet hours values', async () => {
    render(<SettingsPage />);

    // Navigate to Notifications tab
    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await userEvent.click(notificationsButton);

    const startInput = screen.getByLabelText(/quiet hours start|start time/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/quiet hours end|end time/i) as HTMLInputElement;

    expect(startInput.value).toBeTruthy();
    expect(endInput.value).toBeTruthy();
  });

  it('should allow changing quiet hours start time', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    // Navigate to Notifications tab
    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await user.click(notificationsButton);

    const startInput = screen.getByLabelText(/quiet hours start|start time/i) as HTMLInputElement;

    // Change start time
    await user.clear(startInput);
    await user.type(startInput, '21:00');

    expect(startInput.value).toBe('21:00');
  });

  it('should allow changing quiet hours end time', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    // Navigate to Notifications tab
    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await user.click(notificationsButton);

    const endInput = screen.getByLabelText(/quiet hours end|end time/i) as HTMLInputElement;

    // Change end time
    await user.clear(endInput);
    await user.type(endInput, '08:00');

    expect(endInput.value).toBe('08:00');
  });

  it('should validate that end time is after start time', async () => {
    const user = userEvent.setup();

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'End time must be after start time' }),
    });

    render(<SettingsPage />);

    // Navigate to Notifications tab
    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await user.click(notificationsButton);

    const startInput = screen.getByLabelText(/quiet hours start|start time/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/quiet hours end|end time/i) as HTMLInputElement;
    const saveButton = screen.getByRole('button', { name: /save (changes|notification settings)/i });

    // Set invalid time range (end before start)
    await user.clear(startInput);
    await user.type(startInput, '22:00');
    await user.clear(endInput);
    await user.type(endInput, '06:00');

    await user.click(saveButton);

    // Should show error
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  it('should save quiet hours when included with notifications', async () => {
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

    const startInput = screen.getByLabelText(/quiet hours start|start time/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/quiet hours end|end time/i) as HTMLInputElement;

    // Change quiet hours
    await user.clear(startInput);
    await user.type(startInput, '22:00');
    await user.clear(endInput);
    await user.type(endInput, '07:00');

    const saveButton = screen.getByRole('button', { name: /save (changes|notification settings)/i });
    await user.click(saveButton);

    // Verify API was called with quiet hours
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    const callArgs = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.notifications).toBeDefined();
    expect(body.notifications.quietHours).toBeDefined();
    expect(body.notifications.quietHours.start).toBe('22:00');
    expect(body.notifications.quietHours.end).toBe('07:00');
  });

  it('should show success toast when quiet hours saved', async () => {
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

    const startInput = screen.getByLabelText(/quiet hours start|start time/i) as HTMLInputElement;

    await user.clear(startInput);
    await user.type(startInput, '23:00');

    const saveButton = screen.getByRole('button', { name: /save (changes|notification settings)/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith(
        expect.stringContaining('Notification settings saved')
      );
    });
  });

  it('should handle quiet hours API error gracefully', async () => {
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

    const startInput = screen.getByLabelText(/quiet hours start|start time/i) as HTMLInputElement;
    await user.clear(startInput);
    await user.type(startInput, '21:00');

    const saveButton = screen.getByRole('button', { name: /save (changes|notification settings)/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  it('should indicate when quiet hours are enabled', async () => {
    render(<SettingsPage />);

    // Navigate to Notifications tab
    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await userEvent.click(notificationsButton);

    // Should show quiet hours are configured
    const quietHoursSection = screen.getByText(/quiet hours/i);
    expect(quietHoursSection).toBeInTheDocument();

    // Should have inputs visible and filled
    const startInput = screen.getByLabelText(/quiet hours start|start time/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/quiet hours end|end time/i) as HTMLInputElement;

    expect(startInput.value).toBeTruthy();
    expect(endInput.value).toBeTruthy();
  });

  it('should display quiet hours description', async () => {
    render(<SettingsPage />);

    // Navigate to Notifications tab
    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await userEvent.click(notificationsButton);

    // Check for description text
    expect(screen.getByText(/mute notifications|suppress notifications|do not disturb/i)).toBeInTheDocument();
  });

  it('should allow disabling quiet hours by clearing times', async () => {
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

    const startInput = screen.getByLabelText(/quiet hours start|start time/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/quiet hours end|end time/i) as HTMLInputElement;

    // Clear quiet hours
    await user.clear(startInput);
    await user.clear(endInput);

    const saveButton = screen.getByRole('button', { name: /save (changes|notification settings)/i });
    await user.click(saveButton);

    // Verify API was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.notifications.quietHours).toBeDefined();
      expect(body.notifications.quietHours.start).toBe('');
      expect(body.notifications.quietHours.end).toBe('');
    });
  });
});
