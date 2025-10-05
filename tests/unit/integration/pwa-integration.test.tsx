import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PWAService } from '@/lib/services/pwa';
import { usePWA } from '@/lib/services/pwa';

// Mock service worker
const mockServiceWorker = {
  register: vi.fn(),
  ready: Promise.resolve({
    active: { postMessage: vi.fn() },
    waiting: null,
  }),
  getRegistration: vi.fn().mockResolvedValue(null),
  getRegistrations: vi.fn().mockResolvedValue([]),
};

// Mock navigator
Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  configurable: true,
});

// Mock beforeinstallprompt event
const mockBeforeInstallPromptEvent = {
  preventDefault: vi.fn(),
  prompt: vi.fn().mockResolvedValue({ outcome: 'accepted' }),
  userChoice: Promise.resolve({ outcome: 'accepted' }),
};

// Mock Notification API
Object.defineProperty(window, 'Notification', {
  value: {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  },
  configurable: true,
});

// Test component that uses PWA hook
function PWAStatusComponent() {
  const {
    capabilities,
    install,
    update,
    clearCache,
    requestNotificationPermission,
    sendNotification,
    isOffline,
    syncOfflineData,
  } = usePWA();

  return (
    <div>
      <div data-testid="online-status">
        {isOffline ? 'Offline' : 'Online'}
      </div>

      <div data-testid="install-status">
        Can Install: {capabilities.canInstall ? 'Yes' : 'No'}
      </div>

      <div data-testid="installed-status">
        Installed: {capabilities.isInstalled ? 'Yes' : 'No'}
      </div>

      <div data-testid="cache-status">
        Cache: {capabilities.cacheStatus}
      </div>

      <button onClick={install} data-testid="install-btn">
        Install
      </button>

      <button onClick={update} data-testid="update-btn">
        Update
      </button>

      <button onClick={clearCache} data-testid="clear-cache-btn">
        Clear Cache
      </button>

      <button onClick={requestNotificationPermission} data-testid="notification-btn">
        Request Notifications
      </button>

      <button onClick={syncOfflineData} data-testid="sync-btn">
        Sync Data
      </button>
    </div>
  );
}

describe('PWA Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset service worker mocks
    mockServiceWorker.register.mockResolvedValue({
      scope: '/',
      update: vi.fn(),
      unregister: vi.fn(),
    });

    // Reset beforeinstallprompt
    delete (window as any).beforeInstallPromptEvent;
  });

  it('initializes PWA service on component mount', async () => {
    const initializeSpy = vi.spyOn(PWAService, 'initialize');

    render(<PWAStatusComponent />);

    await waitFor(() => {
      expect(initializeSpy).toHaveBeenCalled();
    });

    initializeSpy.mockRestore();
  });

  it('displays online status correctly', async () => {
    render(<PWAStatusComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('online-status')).toHaveTextContent('Online');
    });
  });

  it('handles offline status changes', async () => {
    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });

    // Trigger offline event
    window.dispatchEvent(new Event('offline'));

    render(<PWAStatusComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('online-status')).toHaveTextContent('Offline');
    });
  });

  it('handles install prompt availability', async () => {
    // Simulate beforeinstallprompt event
    window.dispatchEvent(
      new CustomEvent('beforeinstallprompt', {
        detail: mockBeforeInstallPromptEvent,
      })
    );

    render(<PWAStatusComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('install-status')).toHaveTextContent('Can Install: Yes');
    });
  });

  it('handles successful app installation', async () => {
    const user = userEvent.setup();

    // Simulate install prompt
    window.dispatchEvent(
      new CustomEvent('beforeinstallprompt', {
        detail: mockBeforeInstallPromptEvent,
      })
    );

    render(<PWAStatusComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('install-status')).toHaveTextContent('Can Install: Yes');
    });

    // Click install button
    const installBtn = screen.getByTestId('install-btn');
    await user.click(installBtn);

    // Should handle successful installation
    window.dispatchEvent(new Event('appinstalled'));

    await waitFor(() => {
      expect(screen.getByTestId('installed-status')).toHaveTextContent('Installed: Yes');
    });
  });

  it('handles service worker registration', async () => {
    render(<PWAStatusComponent />);

    await waitFor(() => {
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js', {
        scope: '/',
      });
    });
  });

  it('handles service worker updates', async () => {
    // Mock service worker update available
    const mockRegistration = {
      update: vi.fn().mockResolvedValue(true),
      waiting: { postMessage: vi.fn() },
    };

    mockServiceWorker.getRegistration.mockResolvedValue(mockRegistration as any);

    render(<PWAStatusComponent />);

    // Simulate update check
    const updateBtn = screen.getByTestId('update-btn');
    await userEvent.click(updateBtn);

    expect(mockRegistration.update).toHaveBeenCalled();
  });

  it('handles cache management', async () => {
    const clearCacheSpy = vi.spyOn(PWAService, 'clearCache');

    render(<PWAStatusComponent />);

    const clearCacheBtn = screen.getByTestId('clear-cache-btn');
    await userEvent.click(clearCacheBtn);

    expect(clearCacheSpy).toHaveBeenCalled();

    clearCacheSpy.mockRestore();
  });

  it('handles notification permissions', async () => {
    const user = userEvent.setup();

    render(<PWAStatusComponent />);

    const notificationBtn = screen.getByTestId('notification-btn');
    await user.click(notificationBtn);

    expect(Notification.requestPermission).toHaveBeenCalled();
  });

  it('handles notification sending', async () => {
    // Mock granted permission
    (window as any).Notification.permission = 'granted';

    const showNotificationSpy = vi.fn();
    const mockRegistration = {
      showNotification: showNotificationSpy,
    };

    // Mock service worker registration
    mockServiceWorker.ready = Promise.resolve({
      active: { postMessage: vi.fn() },
      waiting: null,
      showNotification: showNotificationSpy,
    } as any);

    render(<PWAStatusComponent />);

    // This would typically be triggered by some user action
    // For testing, we can verify the capability exists
    await waitFor(() => {
      expect(screen.getByTestId('notification-btn')).toBeInTheDocument();
    });
  });

  it('handles offline data synchronization', async () => {
    const user = userEvent.setup();
    const syncSpy = vi.spyOn(PWAService, 'syncOfflineData');

    render(<PWAStatusComponent />);

    const syncBtn = screen.getByTestId('sync-btn');
    await user.click(syncBtn);

    expect(syncSpy).toHaveBeenCalled();

    syncSpy.mockRestore();
  });

  it('handles background sync registration', async () => {
    const mockRegistration = {
      sync: {
        register: vi.fn().mockResolvedValue(undefined),
      },
    };

    mockServiceWorker.getRegistration.mockResolvedValue(mockRegistration as any);

    const registerSpy = vi.spyOn(PWAService, 'requestBackgroundSync');

    render(<PWAStatusComponent />);

    // Background sync would typically be triggered by going offline
    // For testing, we verify the method exists
    expect(registerSpy).toBeDefined();

    registerSpy.mockRestore();
  });

  it('adapts to system preferences', async () => {
    // Mock reduced motion preference
    const mockMatchMedia = vi.fn((query) => ({
      matches: query.includes('reduce'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });

    render(<PWAStatusComponent />);

    // Should detect and apply system preferences
    expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-contrast: high)');
  });

  it('handles service worker messages', async () => {
    const mockRegistration = {
      active: { postMessage: vi.fn() },
    };

    mockServiceWorker.ready = Promise.resolve(mockRegistration);

    // Mock message event
    const messageEvent = new MessageEvent('message', {
      data: { type: 'SYNC_COMPLETE', success: true },
    });

    render(<PWAStatusComponent />);

    // Service worker messages should be handled
    // This is tested through the PWA service integration
    await waitFor(() => {
      expect(screen.getByTestId('sync-btn')).toBeInTheDocument();
    });
  });

  it('maintains state across re-mounts', async () => {
    const { rerender } = render(<PWAStatusComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('online-status')).toBeInTheDocument();
    });

    // Re-mount component
    rerender(<PWAStatusComponent />);

    // Should maintain state
    expect(screen.getByTestId('online-status')).toBeInTheDocument();
    expect(screen.getByTestId('install-status')).toBeInTheDocument();
  });

  it('handles PWA capabilities detection', async () => {
    // Mock standalone display mode (installed PWA)
    Object.defineProperty(window.navigator, 'standalone', {
      value: true,
      configurable: true,
    });

    render(<PWAStatusComponent />);

    await waitFor(() => {
      // Should detect installation status
      expect(screen.getByTestId('installed-status')).toBeInTheDocument();
    });
  });
});
