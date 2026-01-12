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

describe('Settings Page - Integration Buttons', () => {
  let mockToast: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { toast } = await import('sonner');
    mockToast = toast;
  });

  it('should render all integrations in the Integrations section', async () => {
    render(<SettingsPage />);

    // Navigate to Integrations tab
    const integrationsButton = screen.getByRole('button', { name: /integrations/i });
    await userEvent.click(integrationsButton);

    // Check all integrations are present
    expect(screen.getByText('Slack')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Figma')).toBeInTheDocument();
    expect(screen.getByText('Google Calendar')).toBeInTheDocument();
    expect(screen.getByText('Jira')).toBeInTheDocument();
  });

  it('should render Connect button for disconnected integrations', async () => {
    render(<SettingsPage />);

    // Navigate to Integrations tab
    const integrationsButton = screen.getByRole('button', { name: /integrations/i });
    await userEvent.click(integrationsButton);

    // GitHub is disconnected, should show Connect button
    const connectButtons = screen.getAllByRole('button', { name: /connect/i });
    expect(connectButtons.length).toBeGreaterThan(0);
  });

  it('should render Configure button for connected integrations', async () => {
    render(<SettingsPage />);

    // Navigate to Integrations tab
    const integrationsButton = screen.getByRole('button', { name: /integrations/i });
    await userEvent.click(integrationsButton);

    // Slack is connected, should show Configure button
    const configureButtons = screen.getAllByRole('button', { name: /configure/i });
    expect(configureButtons.length).toBeGreaterThan(0);
  });

  it('should show Connected badge for connected integrations', async () => {
    render(<SettingsPage />);

    // Navigate to Integrations tab
    const integrationsButton = screen.getByRole('button', { name: /integrations/i });
    await userEvent.click(integrationsButton);

    // Should show Connected badges
    const connectedBadges = screen.getAllByText(/connected/i);
    expect(connectedBadges.length).toBeGreaterThan(0);
  });

  it('should open configuration dialog when Configure button is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    // Navigate to Integrations tab
    const integrationsButton = screen.getByRole('button', { name: /integrations/i });
    await user.click(integrationsButton);

    // Click Configure button (first one - Slack)
    const configureButtons = screen.getAllByRole('button', { name: /configure/i });
    await user.click(configureButtons[0]);

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Dialog should show integration settings title
    expect(screen.getByText(/Settings/i)).toBeInTheDocument();
  });

  it('should open connection dialog when Connect button is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    // Navigate to Integrations tab
    const integrationsButton = screen.getByRole('button', { name: /integrations/i });
    await user.click(integrationsButton);

    // Click Connect button (GitHub)
    const connectButtons = screen.getAllByRole('button', { name: /connect/i });
    await user.click(connectButtons[0]);

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('should show loading state when connecting an integration', async () => {
    const user = userEvent.setup();

    // Mock API with delay
    (global.fetch as any).mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, connected: true }),
      }), 100))
    );

    render(<SettingsPage />);

    // Navigate to Integrations tab
    const integrationsButton = screen.getByRole('button', { name: /integrations/i });
    await user.click(integrationsButton);

    // Click Connect button
    const connectButtons = screen.getAllByRole('button', { name: /connect/i });
    await user.click(connectButtons[0]);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    });
  });

  it('should update integration state after successful connection', async () => {
    const user = userEvent.setup();

    // Mock successful connection
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, connected: true }),
    });

    render(<SettingsPage />);

    // Navigate to Integrations tab
    const integrationsButton = screen.getByRole('button', { name: /integrations/i });
    await user.click(integrationsButton);

    // Count initial Connect buttons
    const initialConnectButtons = screen.getAllByRole('button', { name: /^connect$/i });
    const initialCount = initialConnectButtons.length;

    // Click Connect button for GitHub
    await user.click(initialConnectButtons[0]);

    // Wait for connection to complete and close dialog
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Should now show Configure button instead of Connect
    const updatedConnectButtons = screen.queryAllByRole('button', { name: /^connect$/i });
    expect(updatedConnectButtons.length).toBeLessThan(initialCount);

    // Should show Connected badge
    const connectedBadges = screen.getAllByText(/connected/i);
    expect(connectedBadges.length).toBeGreaterThan(0);
  });

  it('should show disconnect option in configuration dialog', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    // Navigate to Integrations tab
    const integrationsButton = screen.getByRole('button', { name: /integrations/i });
    await user.click(integrationsButton);

    // Click Configure button
    const configureButtons = screen.getAllByRole('button', { name: /configure/i });
    await user.click(configureButtons[0]);

    // Dialog should have a disconnect button
    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const disconnectButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('disconnect'));
      expect(disconnectButton).toBeInTheDocument();
    });
  });

  it('should disconnect integration when Disconnect button is clicked', async () => {
    const user = userEvent.setup();

    // Mock successful disconnection
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, connected: false }),
    });

    render(<SettingsPage />);

    // Navigate to Integrations tab
    const integrationsButton = screen.getByRole('button', { name: /integrations/i });
    await user.click(integrationsButton);

    // Click Configure button
    const configureButtons = screen.getAllByRole('button', { name: /configure/i });
    await user.click(configureButtons[0]);

    // Find and click Disconnect button
    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const disconnectButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('disconnect'));
      expect(disconnectButton).toBeTruthy();
      if (disconnectButton) {
        user.click(disconnectButton);
      }
    });

    // Should call API to disconnect
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/integrations'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  it('should show success toast after connecting integration', async () => {
    const user = userEvent.setup();

    // Mock successful connection
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, connected: true }),
    });

    render(<SettingsPage />);

    // Navigate to Integrations tab
    const integrationsButton = screen.getByRole('button', { name: /integrations/i });
    await user.click(integrationsButton);

    // Click Connect button
    const connectButtons = screen.getAllByRole('button', { name: /connect/i });
    await user.click(connectButtons[0]);

    // Wait for success toast
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('should show error toast on failed connection', async () => {
    const user = userEvent.setup();

    // Mock failed connection
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Connection failed' }),
    });

    render(<SettingsPage />);

    // Navigate to Integrations tab
    const integrationsButton = screen.getByRole('button', { name: /integrations/i });
    await user.click(integrationsButton);

    // Click Connect button
    const connectButtons = screen.getAllByRole('button', { name: /connect/i });
    await user.click(connectButtons[0]);

    // Wait for error toast
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('should allow closing the configuration dialog', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    // Navigate to Integrations tab
    const integrationsButton = screen.getByRole('button', { name: /integrations/i });
    await user.click(integrationsButton);

    // Click Configure button
    const configureButtons = screen.getAllByRole('button', { name: /configure/i });
    await user.click(configureButtons[0]);

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Click close button or Cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should display integration-specific settings in configuration dialog', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    // Navigate to Integrations tab
    const integrationsButton = screen.getByRole('button', { name: /integrations/i });
    await user.click(integrationsButton);

    // Click Configure button for Slack
    const configureButtons = screen.getAllByRole('button', { name: /configure/i });
    await user.click(configureButtons[0]);

    // Should show settings in dialog
    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      // Check for Settings text in the dialog
      expect(screen.getByText('Integration Settings')).toBeInTheDocument();
    });
  });
});
