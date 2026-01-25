import { toast } from 'sonner';
import React from 'react';
import { openDB, IDBPDatabase } from 'idb';
import { audioService } from '../audio/audio-service';

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
  body?: any;
  timestamp: number;
  retryCount: number;
}

const DB_NAME = 'foco-pwa-db';
const STORE_NAME = 'offline-actions';

export class PWAService {
  private static deferredPrompt: any = null;
  private static registration: ServiceWorkerRegistration | null = null;
  private static db: IDBPDatabase | null = null;

  static get isOnline(): boolean {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  }

  // Initialize PWA functionality
  static async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;

    // CRITICAL: Ensure React hydration is complete before any SW activity
    // Wait for idle callback to ensure main thread is free
    await new Promise<void>(resolve => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => resolve(), { timeout: 2000 });
      } else {
        setTimeout(resolve, 100);
      }
    });

    // Initialize IndexedDB
    try {
      this.db = await openDB(DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        },
      });
    } catch (e) {
      console.error('[PWA] Failed to initialize IndexedDB:', e);
    }

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
  static async queueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    if (!this.db) {
      console.warn('[PWA] DB not initialized, falling back to basic execution');
      return;
    }

    const offlineAction: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    await this.db.add(STORE_NAME, offlineAction);

    if (this.isOffline) {
      toast.info('Action queued for when you\'re back online');
    }
    
    // Register background sync if available
    this.requestBackgroundSync();
  }

  // Sync offline data
  static async syncOfflineData(): Promise<void> {
    if (!this.db) return;

    const offlineActions = await this.db.getAll(STORE_NAME);
    if (offlineActions.length === 0) return;

    console.log(`[PWA] Syncing ${offlineActions.length} offline actions...`);

    const successfulActions: string[] = [];
    const failedActions: string[] = [];

    for (const action of offlineActions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: {
            'Content-Type': 'application/json',
            ...action.headers,
          },
          body: typeof action.body === 'string' ? action.body : JSON.stringify(action.body),
        });

        if (response.ok) {
          successfulActions.push(action.id);
          await this.db.delete(STORE_NAME, action.id);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error(`[PWA] Failed to sync action ${action.id}:`, error);
        action.retryCount++;

        if (action.retryCount >= 3) {
          failedActions.push(action.id);
          await this.db.delete(STORE_NAME, action.id);
        } else {
          await this.db.put(STORE_NAME, action);
        }
      }
    }

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
      icon: '/icons/manifest-icon-192.maskable.png',
      badge: '/icons/manifest-icon-192.maskable.png',
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

    // Clear IndexedDB
    if (this.db) {
      await this.db.clear(STORE_NAME);
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
          audioService.play('sync');
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

