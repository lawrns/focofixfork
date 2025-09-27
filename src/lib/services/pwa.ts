import { toast } from 'sonner';
import React from 'react';

export interface PWACapabilities {
  isInstallable: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  hasUpdate: boolean;
  isOnline: boolean;
  cacheStatus: 'empty' | 'partial' | 'full';
}

export interface OfflineAction {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
  retryCount: number;
}

export class PWAService {
  private static deferredPrompt: any = null;
  private static registration: ServiceWorkerRegistration | null = null;
  private static offlineActions: OfflineAction[] = [];

  static get isOnline(): boolean {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  }

  // Initialize PWA functionality
  static async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;

    // Load offline actions from storage
    this.loadOfflineActions();

    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[PWA] Service worker registered:', this.registration.scope);

        // Handle updates
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration?.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.showUpdateNotification();
              }
            });
          }
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage);

      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
      }
    }

    // Handle install prompt
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredPrompt = event;
      this.notifyInstallAvailable();
    });

    // Handle app installed
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      toast.success('Foco has been installed successfully!');
    });

    // Handle online/offline status
    window.addEventListener('online', () => {
      this.syncOfflineData();
      toast.success('You\'re back online!');
    });

    window.addEventListener('offline', () => {
      toast.warning('You\'re offline. Changes will be synced when you\'re back online.');
    });

    // Check for updates periodically
    setInterval(() => {
      this.checkForUpdates();
    }, 60 * 60 * 1000); // Check every hour
  }

  // Get PWA capabilities
  static async getCapabilities(): Promise<PWACapabilities> {
    const isInstallable = 'beforeinstallprompt' in window || window.matchMedia('(display-mode: standalone)').matches;
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    const canInstall = this.deferredPrompt !== null;
    const hasUpdate = await this.checkForUpdates();
    const cacheStatus = await this.getCacheStatus();

    return {
      isInstallable,
      isInstalled,
      canInstall,
      hasUpdate,
      isOnline: this.isOnline,
      cacheStatus,
    };
  }

  // Install the PWA
  static async install(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        toast.success('Installing Foco...');
        return true;
      } else {
        toast.info('Installation cancelled');
        return false;
      }
    } catch (error) {
      console.error('Installation failed:', error);
      toast.error('Installation failed');
      return false;
    } finally {
      this.deferredPrompt = null;
    }
  }

  // Update the PWA
  static async update(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      await this.registration.update();

      // Check if there's a waiting worker
      const waitingWorker = this.registration.waiting;
      if (waitingWorker) {
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Update failed:', error);
      return false;
    }
  }

  // Check for offline status
  static get isOffline(): boolean {
    return !this.isOnline;
  }

  // Queue action for offline sync
  static queueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): void {
    const offlineAction: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.offlineActions.push(offlineAction);
    this.saveOfflineActions();

    if (this.isOffline) {
      toast.info('Action queued for when you\'re back online');
    }
  }

  // Sync offline data
  static async syncOfflineData(): Promise<void> {
    if (this.offlineActions.length === 0) return;

    console.log('[PWA] Syncing offline data...');

    const actionsToRetry = [...this.offlineActions];
    const successfulActions: string[] = [];
    const failedActions: string[] = [];

    for (const action of actionsToRetry) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: {
            'Content-Type': 'application/json',
            ...action.headers,
          },
          body: action.body,
        });

        if (response.ok) {
          successfulActions.push(action.id);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error(`[PWA] Failed to sync action ${action.id}:`, error);
        action.retryCount++;

        // Remove after 3 failed attempts
        if (action.retryCount >= 3) {
          failedActions.push(action.id);
        }
      }
    }

    // Remove successful actions
    this.offlineActions = this.offlineActions.filter(action => !successfulActions.includes(action.id));
    // Remove permanently failed actions
    this.offlineActions = this.offlineActions.filter(action => !failedActions.includes(action.id));

    this.saveOfflineActions();

    if (successfulActions.length > 0) {
      toast.success(`Synced ${successfulActions.length} offline actions`);
    }

    if (failedActions.length > 0) {
      toast.warning(`${failedActions.length} actions failed to sync and were removed`);
    }
  }

  // Request background sync
  static async requestBackgroundSync(tag = 'background-sync'): Promise<boolean> {
    if (!this.registration) return false;

    try {
      if ('sync' in this.registration) {
        await (this.registration as any).sync.register(tag);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Background sync registration failed:', error);
      return false;
    }
  }

  // Send push notification (requires user permission)
  static async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  static async sendNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (Notification.permission !== 'granted') return;

    const defaultOptions: NotificationOptions & { vibrate?: number[] } = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      ...options,
    };

    if (this.registration) {
      await this.registration.showNotification(title, defaultOptions);
    } else {
      new Notification(title, defaultOptions);
    }
  }

  // Clear all caches
  static async clearCache(): Promise<void> {
    if (this.registration) {
      this.registration.active?.postMessage({ type: 'CLEAR_CACHE' });
    }

    // Also clear local caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    toast.success('Cache cleared successfully');
  }

  // Get cache status
  private static async getCacheStatus(): Promise<'empty' | 'partial' | 'full'> {
    if (!('caches' in window)) return 'empty';

    try {
      const cacheNames = await caches.keys();
      if (cacheNames.length === 0) return 'empty';

      // Check if main caches exist
      const hasStatic = cacheNames.some(name => name.includes('static'));
      const hasDynamic = cacheNames.some(name => name.includes('dynamic'));

      if (hasStatic && hasDynamic) return 'full';
      if (hasStatic || hasDynamic) return 'partial';

      return 'empty';
    } catch {
      return 'empty';
    }
  }

  // Check for updates
  private static async checkForUpdates(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      const newRegistration = await navigator.serviceWorker.getRegistration();
      if (newRegistration && newRegistration !== this.registration) {
        this.registration = newRegistration;
        return true;
      }

      await this.registration.update();
      return false;
    } catch {
      return false;
    }
  }

  // Handle service worker messages
  private static handleServiceWorkerMessage = (event: MessageEvent): void => {
    const { type, data } = event.data;

    switch (type) {
      case 'SYNC_COMPLETE':
        if (data.success) {
          toast.success('Offline data synced successfully');
        }
        break;

      case 'CONTENT_SYNC':
        console.log('[PWA] Content sync completed');
        break;

      case 'CACHE_CLEARED':
        toast.success('Cache cleared from service worker');
        break;

      default:
        console.log('[PWA] Unknown service worker message:', type);
    }
  };

  // Show install prompt
  private static notifyInstallAvailable(): void {
    toast.info(
      'Foco can be installed as an app',
      {
        action: {
          label: 'Install',
          onClick: () => this.install(),
        },
        duration: 10000,
      }
    );
  }

  // Show update notification
  private static showUpdateNotification(): void {
    toast.info(
      'A new version of Foco is available',
      {
        action: {
          label: 'Update',
          onClick: () => this.update(),
        },
        duration: 15000,
      }
    );
  }

  // Offline actions storage
  private static loadOfflineActions(): void {
    try {
      const stored = localStorage.getItem('foco_offline_actions');
      if (stored) {
        this.offlineActions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline actions:', error);
      this.offlineActions = [];
    }
  }

  private static saveOfflineActions(): void {
    try {
      localStorage.setItem('foco_offline_actions', JSON.stringify(this.offlineActions));
    } catch (error) {
      console.error('Failed to save offline actions:', error);
    }
  }
}

// React hook for PWA functionality
export function usePWA() {
  const [capabilities, setCapabilities] = React.useState<PWACapabilities>({
    isInstallable: false,
    isInstalled: false,
    canInstall: false,
    hasUpdate: false,
    isOnline: PWAService.isOnline,
    cacheStatus: 'empty',
  });

  React.useEffect(() => {
    PWAService.initialize().then(() => {
      updateCapabilities();
    });

    // Update capabilities periodically
    const interval = setInterval(updateCapabilities, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const updateCapabilities = async () => {
    const caps = await PWAService.getCapabilities();
    setCapabilities(caps);
  };

  return {
    capabilities,
    install: PWAService.install,
    update: PWAService.update,
    clearCache: PWAService.clearCache,
    requestNotificationPermission: PWAService.requestNotificationPermission,
    sendNotification: PWAService.sendNotification,
    isOffline: PWAService.isOffline,
    syncOfflineData: PWAService.syncOfflineData,
    refreshCapabilities: updateCapabilities,
  };
}
