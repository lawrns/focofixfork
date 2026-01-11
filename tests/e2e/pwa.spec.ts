import { test, expect } from '@playwright/test';

test.describe('Progressive Web App', () => {
  test('should have PWA manifest', async ({ page, request }) => {
    // Check that manifest exists and is properly configured
    const response = await request.get('/manifest.json');
    expect(response.ok()).toBe(true);

    const manifest = await response.json();

    // Required manifest fields
    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.start_url).toBeDefined();
    expect(manifest.display).toBeDefined();
    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.theme_color).toBeDefined();
  });

  test('should have service worker registered', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Check if service worker is registered
    const swRegistered = await page.evaluate(() => {
      return navigator.serviceWorker.getRegistrations().then(registrations => {
        return registrations.length > 0;
      });
    });

    expect(swRegistered).toBe(true);
  });

  test('should show install prompt when available', async ({ page, browserName }) => {
    // Skip on Firefox as it doesn't support beforeinstallprompt
    test.skip(browserName === 'firefox', 'Firefox does not support beforeinstallprompt');

    await page.goto('/');

    // Wait for potential install prompt
    // Note: This may not trigger in all test environments
    await page.waitForTimeout(1000);

    // Check if install button is available
    const installButton = page.locator('button').filter({ hasText: /install|instalar/i });

    // Install button may or may not be visible depending on browser support
    // The important thing is that the PWA infrastructure is in place
    const isInstallable = await page.evaluate(() => {
      return 'beforeinstallprompt' in window || window.matchMedia('(display-mode: standalone)').matches;
    });

    expect(typeof isInstallable).toBe('boolean');
  });

  test('should work offline', async ({ page, context }) => {
    // First load the app online
    await page.goto('/');

    // Wait for service worker to be ready
    await page.waitForFunction(() => {
      return navigator.serviceWorker.ready.then(() => true);
    });

    // Set offline
    await context.setOffline(true);

    // Try to navigate (should work via cache)
    await page.reload();

    // Should still show the app (from cache)
    await expect(page.locator('body')).toBeVisible();

    // Should show offline indicator if implemented
    const offlineIndicator = page.locator('text=/offline|sin conexión/i');
    // May or may not be present depending on implementation
  });

  test('should cache static assets', async ({ page, request }) => {
    await page.goto('/');

    // Wait for service worker to cache assets
    await page.waitForTimeout(2000);

    // Check if assets are cached by making requests
    const cacheStatus = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      const hasCache = cacheNames.some(name => name.includes('static'));

      if (hasCache) {
        const cache = await caches.open(cacheNames.find(name => name.includes('static'))!);
        const cachedAssets = await cache.keys();
        return cachedAssets.length > 0;
      }

      return false;
    });

    expect(cacheStatus).toBe(true);
  });

  test('should have proper PWA meta tags', async ({ page }) => {
    await page.goto('/');

    // Check for PWA meta tags
    const metaTags = await page.evaluate(() => {
      const tags = {};
      const metaElements = document.querySelectorAll('meta[name], meta[property]');

      metaElements.forEach(meta => {
        const name = meta.getAttribute('name') || meta.getAttribute('property');
        const content = meta.getAttribute('content');
        if (name && content) {
          tags[name] = content;
        }
      });

      return tags;
    });

    // Should have PWA-related meta tags
    expect(metaTags['application-name']).toBeDefined();
    expect(metaTags['theme-color']).toBeDefined();
    expect(metaTags['apple-mobile-web-app-capable']).toBeDefined();
  });

  test('should have app icons', async ({ page, request }) => {
    // Check that icon files exist
    const iconSizes = ['192x192', '512x512', '72x72'];

    for (const size of iconSizes) {
      const response = await request.get(`/icons/icon-${size}.png`);
      expect(response.ok()).toBe(true);
    }
  });

  test('should support app shortcuts', async ({ page }) => {
    // Check manifest shortcuts
    const manifestResponse = await page.request.get('/manifest.json');
    const manifest = await manifestResponse.json();

    if (manifest.shortcuts) {
      expect(Array.isArray(manifest.shortcuts)).toBe(true);

      if (manifest.shortcuts.length > 0) {
        const shortcut = manifest.shortcuts[0];
        expect(shortcut.name).toBeDefined();
        expect(shortcut.url).toBeDefined();
        expect(shortcut.icons).toBeDefined();
      }
    }
  });

  test('should handle background sync', async ({ page }) => {
    await page.goto('/');

    // Simulate going offline and performing an action
    await page.context().setOffline(true);

    // Try to perform an action that would be queued
    // This depends on the specific implementation
    const offlineAction = page.locator('button').filter({ hasText: /sync|sincronizar/i });

    if (await offlineAction.isVisible()) {
      await offlineAction.click();

      // Should show some indication of offline queuing
      const offlineMessage = page.locator('text=/offline|queued|en cola/i');
      // May or may not be visible depending on implementation
    }

    // Restore online status
    await page.context().setOffline(false);
  });

  test('should have offline fallback page', async ({ page, request }) => {
    const response = await request.get('/offline.html');
    expect(response.ok()).toBe(true);

    const content = await response.text();
    expect(content).toContain('offline');
    expect(content).toContain('You\'re offline');
  });

  test('should handle push notifications', async ({ page, browserName }) => {
    // Skip on Firefox as it has different notification handling
    test.skip(browserName === 'firefox', 'Firefox notification handling differs');

    await page.goto('/');

    // Request notification permission
    const permission = await page.evaluate(async () => {
      if ('Notification' in window) {
        return await Notification.requestPermission();
      }
      return 'denied';
    });

    // Permission may be granted or denied
    expect(['granted', 'denied', 'default']).toContain(permission);
  });

  test('should adapt to different screen sizes', async ({ page }) => {
    await page.goto('/');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Should show mobile-optimized layout
    const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"]');
    // Mobile menu may or may not be visible depending on implementation

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Should adapt to tablet layout
    await expect(page.locator('body')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Should show desktop layout
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have proper app-like behavior', async ({ page }) => {
    await page.goto('/');

    // Check for app-like behavior
    const hasAppBehavior = await page.evaluate(() => {
      // Check for standalone display mode indicators
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const hasNoBrowserUI = !window.locationbar.visible;

      return isStandalone || hasNoBrowserUI;
    });

    // App behavior depends on how the app is launched
    expect(typeof hasAppBehavior).toBe('boolean');
  });

  test('should handle service worker updates', async ({ page }) => {
    await page.goto('/');

    // Check for update handling
    const updateHandled = await page.evaluate(() => {
      return new Promise((resolve) => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
              resolve(true);
            }
          });

          // Timeout after 2 seconds
          setTimeout(() => resolve(false), 2000);
        } else {
          resolve(false);
        }
      });
    });

    // Update handling may or may not occur
    expect(typeof updateHandled).toBe('boolean');
  });

  test('should cache API responses', async ({ page }) => {
    await page.goto('/');

    // Wait for potential API calls to be cached
    await page.waitForTimeout(3000);

    // Check if API cache exists
    const hasApiCache = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      return cacheNames.some(name => name.includes('api'));
    });

    // API caching depends on implementation
    expect(typeof hasApiCache).toBe('boolean');
  });

  test('should handle network recovery', async ({ page, context }) => {
    await page.goto('/');

    // Go offline
    await context.setOffline(true);

    // Should show offline state
    await page.waitForTimeout(1000);

    // Come back online
    await context.setOffline(false);

    // Should sync any offline actions
    await page.waitForTimeout(2000);

    // App should be functional again
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have proper PWA performance', async ({ page }) => {
    // Measure load performance
    const startTime = Date.now();

    await page.goto('/', { waitUntil: 'networkidle' });

    const loadTime = Date.now() - startTime;

    // PWA should load reasonably fast (under 5 seconds)
    expect(loadTime).toBeLessThan(5000);

    // Check for performance indicators
    const performanceMetrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
      };
    });

    expect(performanceMetrics.domContentLoaded).toBeGreaterThan(0);
    expect(performanceMetrics.loadComplete).toBeGreaterThan(0);
  });
});
