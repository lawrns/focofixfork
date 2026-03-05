import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '../page';

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: any) => children,
}));

vi.mock('@/lib/stores/foco-store', () => ({
  useUIPreferencesStore: () => ({
    density: 'comfortable',
    setDensity: vi.fn(),
  }),
  useWorkspaceStore: () => ({
    currentWorkspace: { id: 'ws-1', name: 'Workspace', slug: 'workspace' },
    setCurrentWorkspace: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('Settings Page - Notification Switches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/auth/status')) {
        return {
          ok: true,
          json: async () => ({ twoFactorEnabled: false }),
        } as Response;
      }

      if (url.includes('/api/settings')) {
        return {
          ok: true,
          json: async () => ({ success: true }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({}),
      } as Response;
    });
  });

  async function openNotifications() {
    const user = userEvent.setup();
    render(<SettingsPage />);
    await user.click(screen.getByRole('button', { name: /notifications/i }));
    return user;
  }

  it('renders notification channel and type sections', async () => {
    await openNotifications();

    expect(screen.getByText('In-app notifications')).toBeInTheDocument();
    expect(screen.getByText('Email notifications')).toBeInTheDocument();
    expect(screen.getByText('Telegram notifications')).toBeInTheDocument();
    expect(screen.getByText('Mentions')).toBeInTheDocument();
    expect(screen.getByText('Assigned to me')).toBeInTheDocument();
    expect(screen.getByText('AI flags and suggestions')).toBeInTheDocument();
  });

  it('toggles switches and sends updated payload to /api/settings', async () => {
    const user = await openNotifications();
    const { toast } = await import('sonner');
    const switches = screen.getAllByRole('switch');
    await user.click(switches[1]); // email: true -> false
    await user.click(switches[5]); // mentions: true -> false (after 5 channel switches)

    await user.click(screen.getByRole('button', { name: /save notification settings/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    const apiCall = mockFetch.mock.calls.find((call) => String(call[0]).includes('/api/settings'));
    const body = JSON.parse(apiCall?.[1]?.body as string);

    expect(body.notifications.channels.email).toBe(false);
    expect(body.notifications.types.mentions).toBe(false);
    expect(toast.success).toHaveBeenCalledWith('Notification settings saved successfully');
  });

  it('shows error toast when save request fails', async () => {
    const { toast } = await import('sonner');
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/auth/status')) {
        return { ok: true, json: async () => ({ twoFactorEnabled: false }) } as Response;
      }
      if (url.includes('/api/settings')) {
        return { ok: false, json: async () => ({ error: 'failed' }) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    const user = await openNotifications();
    await user.click(screen.getByRole('button', { name: /save notification settings/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save notification settings');
    });
  });
});
