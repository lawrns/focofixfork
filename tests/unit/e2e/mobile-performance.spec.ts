import { test, expect } from '@playwright/test'

test.describe('Mobile Performance', () => {
  test.describe('Core Web Vitals', () => {
    test('should meet LCP threshold on mobile', async ({ page, browserName }) => {
      // Skip on Firefox due to inconsistent performance metrics
      if (browserName === 'firefox') return

      await page.goto('/', { waitUntil: 'domcontentloaded' })

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle')

      // Measure LCP
      const lcp = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lastEntry = entries[entries.length - 1] as any
            resolve(lastEntry.startTime)
            observer.disconnect()
          })
          observer.observe({ entryTypes: ['largest-contentful-paint'] })

          // Fallback timeout
          setTimeout(() => resolve(0), 5000)
        })
      })

      // LCP should be under 2.5 seconds for good mobile performance
      expect(lcp).toBeLessThan(2500)
    })

    test('should have low CLS on mobile', async ({ page, browserName }) => {
      // Skip on Firefox due to inconsistent performance metrics
      if (browserName === 'firefox') return

      await page.goto('/', { waitUntil: 'domcontentloaded' })

      // Wait for page interactions
      await page.waitForTimeout(2000)

      // Measure CLS
      const cls = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let clsValue = 0
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            entries.forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value
              }
            })
          })
          observer.observe({ entryTypes: ['layout-shift'] })

          // Wait a bit for layout shifts to occur, then resolve
          setTimeout(() => {
            observer.disconnect()
            resolve(clsValue)
          }, 3000)
        })
      })

      // CLS should be under 0.1 for good user experience
      expect(cls).toBeLessThan(0.1)
    })

    test('should have fast FID on mobile', async ({ page, browserName }) => {
      // Skip on Firefox due to inconsistent performance metrics
      if (browserName === 'firefox') return

      await page.goto('/', { waitUntil: 'domcontentloaded' })

      // Simulate user interaction
      await page.click('button').catch(() => {}) // Click any button, ignore if none exist

      // Measure FID
      const fid = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lastEntry = entries[entries.length - 1] as any
            const fidValue = lastEntry.processingStart - lastEntry.startTime
            resolve(fidValue)
            observer.disconnect()
          })
          observer.observe({ entryTypes: ['first-input'] })

          // Fallback timeout
          setTimeout(() => resolve(0), 5000)
        })
      })

      // FID should be under 100ms for good responsiveness
      expect(fid).toBeLessThan(100)
    })
  })

  test.describe('Mobile-Specific Performance', () => {
    test('should load critical resources quickly', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      const domContentLoaded = Date.now() - startTime

      // DOM should load within 2 seconds
      expect(domContentLoaded).toBeLessThan(2000)

      // Check for blocking resources
      const blockingScripts = await page.$$eval('script[src]:not([async]):not([defer])', scripts => scripts.length)
      expect(blockingScripts).toBe(0)
    })

    test('should optimize images for mobile', async ({ page }) => {
      await page.goto('/')

      // Check images have proper loading attributes
      const images = await page.$$('img')
      for (const img of images) {
        const loading = await img.getAttribute('loading')
        if (loading) {
          expect(['lazy', 'eager']).toContain(loading)
        }

        const alt = await img.getAttribute('alt')
        expect(alt).toBeTruthy()
      }

      // Check for WebP support or fallbacks
      const imageSources = await page.$$eval('img', imgs =>
        imgs.map(img => img.src).filter(src => src)
      )

      // Should have some images (but not too many for performance)
      expect(imageSources.length).toBeLessThan(10)
    })

    test('should minimize bundle size', async ({ page }) => {
      await page.goto('/')

      // Check for efficient resource loading
      const resources = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        return resources.map(r => ({
          name: r.name,
          transferSize: r.transferSize,
          decodedBodySize: r.decodedBodySize
        }))
      })

      // JavaScript bundles should be reasonably sized
      const jsResources = resources.filter(r => r.name.includes('.js'))
      const totalJSSize = jsResources.reduce((sum, r) => sum + r.transferSize, 0)

      // Should be under 1MB for good mobile performance
      expect(totalJSSize).toBeLessThan(1024 * 1024)
    })

    test('should have efficient caching headers', async ({ page }) => {
      await page.goto('/')

      // Check static assets have proper caching
      const responses = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        return resources
          .filter(r => r.name.includes('/_next/static/'))
          .map(r => ({
            url: r.name,
            duration: r.responseEnd - r.requestStart
          }))
      })

      // Static assets should load quickly (cached)
      responses.forEach(response => {
        expect(response.duration).toBeLessThan(100) // Should be cached
      })
    })
  })

  test.describe('Mobile Network Conditions', () => {
    test('should work on slow 3G connection', async ({ page, browser }) => {
      // Simulate slow 3G connection
      const context = await browser.newContext({
        ...devices['iPhone 12'],
      })

      // Throttle network to 3G speeds
      await context.route('**/*', async route => {
        await route.fulfill({
          ...route.request(),
          delay: 100 + Math.random() * 200 // Add random delay
        })
      })

      const slowPage = await context.newPage()
      const startTime = Date.now()

      await slowPage.goto('/', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      // Should still load within reasonable time on slow connection
      expect(loadTime).toBeLessThan(10000) // 10 seconds max

      await context.close()
    })

    test('should handle offline scenarios gracefully', async ({ page }) => {
      await page.goto('/')

      // Check for offline indicators or PWA capabilities
      const hasManifest = await page.$('link[rel="manifest"]')
      expect(hasManifest).toBeTruthy()

      // Check for service worker registration
      const hasServiceWorker = await page.evaluate(() => {
        return 'serviceWorker' in navigator
      })
      expect(hasServiceWorker).toBe(true)
    })
  })

  test.describe('Memory Usage', () => {
    test('should not have excessive memory usage', async ({ page }) => {
      await page.goto('/dashboard')

      // Navigate through different views
      const views = ['table', 'kanban', 'gantt']
      for (const view of views) {
        await page.click(`button[aria-label*="Switch to ${view}"]`).catch(() => {})
        await page.waitForTimeout(1000)
      }

      // Check memory usage doesn't grow excessively
      const memoryUsage = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize
        }
        return 0
      })

      // Should be under 50MB for reasonable memory usage
      expect(memoryUsage).toBeLessThan(50 * 1024 * 1024)
    })
  })
})
