/**
 * Lighthouse Performance Tests
 */

import { test, expect } from '@playwright/test'
import { playAudit } from 'playwright-lighthouse'

test.describe('Lighthouse Performance Tests', () => {
  test.setTimeout(120000) // 2 minutes timeout for performance tests

  test('should meet performance budgets for homepage', async ({ page, browserName }) => {
    // Skip on Firefox as Lighthouse works best with Chromium
    test.skip(browserName === 'firefox', 'Lighthouse tests only run on Chromium')

    await page.goto('/')

    const lighthouseReport = await playAudit({
      page,
      thresholds: {
        performance: 85,
        accessibility: 90,
        'best-practices': 85,
        seo: 85,
        pwa: 50
      },
      port: 9222,
      config: {
        extends: 'lighthouse:default',
        settings: {
          formFactor: 'desktop',
          screenEmulation: {
            mobile: false,
            width: 1920,
            height: 1080
          }
        }
      }
    })

    // Log the results for debugging
    console.log('Lighthouse Scores:', lighthouseReport.lhr.categories)

    // Assert minimum scores
    expect(lighthouseReport.lhr.categories.performance.score * 100).toBeGreaterThanOrEqual(85)
    expect(lighthouseReport.lhr.categories.accessibility.score * 100).toBeGreaterThanOrEqual(90)
    expect(lighthouseReport.lhr.categories['best-practices'].score * 100).toBeGreaterThanOrEqual(85)
    expect(lighthouseReport.lhr.categories.seo.score * 100).toBeGreaterThanOrEqual(85)
  })

  test('should meet performance budgets for dashboard', async ({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'Lighthouse tests only run on Chromium')

    // Login first (assuming we have a test user)
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')

    await page.waitForURL('/dashboard')

    const lighthouseReport = await playAudit({
      page,
      thresholds: {
        performance: 80,
        accessibility: 90,
        'best-practices': 85,
        seo: 80
      },
      port: 9222
    })

    console.log('Dashboard Lighthouse Scores:', lighthouseReport.lhr.categories)

    expect(lighthouseReport.lhr.categories.performance.score * 100).toBeGreaterThanOrEqual(80)
    expect(lighthouseReport.lhr.categories.accessibility.score * 100).toBeGreaterThanOrEqual(90)
  })

  test('should have good Web Vitals', async ({ page }) => {
    await page.goto('/')

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle')

    // Measure LCP (Largest Contentful Paint)
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          resolve(lastEntry.startTime)
        })
        observer.observe({ entryTypes: ['largest-contentful-paint'] })

        // Fallback after 5 seconds
        setTimeout(() => resolve(2500), 5000)
      })
    })

    console.log('LCP:', lcp)
    expect(lcp).toBeLessThan(2500) // Should be under 2.5s

    // Measure FID (First Input Delay) - requires user interaction
    const fid = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          if (entries.length > 0) {
            const lastEntry = entries[entries.length - 1] as any
            resolve(lastEntry.processingStart - lastEntry.startTime)
          }
        })
        observer.observe({ entryTypes: ['first-input'] })

        // Simulate user interaction
        setTimeout(() => {
          document.dispatchEvent(new Event('click'))
        }, 1000)

        // Fallback after 3 seconds
        setTimeout(() => resolve(100), 3000)
      })
    })

    console.log('FID:', fid)
    expect(fid).toBeLessThan(100) // Should be under 100ms
  })

  test('should load quickly on slow connections', async ({ page, browser }) => {
    // Simulate slow 3G connection
    const context = await browser.newContext({
      ...require('playwright').devices['iPhone 12'],
      reducedMotion: 'reduce'
    })

    const slowPage = await context.newPage()

    // Set slow network conditions
    await slowPage.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)) // Add 100ms delay
      await route.continue()
    })

    await slowPage.goto('/')

    // Time how long it takes to become interactive
    const timeToInteractive = await slowPage.evaluate(() => {
      return performance.now()
    })

    console.log('Time to interactive (slow 3G):', timeToInteractive)
    expect(timeToInteractive).toBeLessThan(10000) // Should be under 10s even on slow connection

    await context.close()
  })

  test('should have small bundle sizes', async ({ page }) => {
    await page.goto('/')

    // Wait for all resources to load
    await page.waitForLoadState('networkidle')

    // Get all JavaScript resources
    const jsResources = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource')
      return resources
        .filter(r => r.name.includes('.js') && !r.name.includes('node_modules'))
        .map(r => ({
          name: r.name,
          size: (r as any).transferSize || 0
        }))
    })

    const totalJSSize = jsResources.reduce((total, resource) => total + resource.size, 0)

    console.log('Total JS bundle size:', totalJSSize / 1024 / 1024, 'MB')
    console.log('JS resources:', jsResources)

    // Should be under 500KB for main bundles
    expect(totalJSSize).toBeLessThan(500 * 1024)
  })

  test('should have efficient caching headers', async ({ page }) => {
    await page.goto('/')

    // Check caching headers for static assets
    const responses = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource')
      return resources
        .filter(r => r.name.includes('.js') || r.name.includes('.css') || r.name.includes('.png') || r.name.includes('.jpg'))
        .map(r => ({
          url: r.name,
          cacheControl: (r as any).responseHeaders?.['cache-control'] || 'none'
        }))
    })

    // Most static assets should have caching headers
    const assetsWithCache = responses.filter(r =>
      r.cacheControl.includes('max-age') ||
      r.cacheControl.includes('immutable')
    )

    console.log('Assets with caching:', assetsWithCache.length, '/', responses.length)
    expect(assetsWithCache.length / responses.length).toBeGreaterThan(0.8) // 80% should be cached
  })

  test('should render content quickly', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Check if main content is visible within 2 seconds
    const contentVisible = await page.evaluate(() => {
      const main = document.querySelector('main') || document.body
      return main && main.offsetHeight > 0
    })

    const loadTime = Date.now() - startTime

    console.log('Content visible after:', loadTime, 'ms')
    expect(contentVisible).toBe(true)
    expect(loadTime).toBeLessThan(2000) // Content should be visible within 2 seconds
  })

  test('should not have render-blocking resources', async ({ page }) => {
    await page.goto('/')

    // Check for render-blocking CSS/JS
    const renderBlocking = await page.evaluate(() => {
      const blockingScripts = document.querySelectorAll('script[src]:not([defer]):not([async])')
      const blockingStyles = document.querySelectorAll('link[rel="stylesheet"]:not([media="print"])')

      return {
        blockingScripts: blockingScripts.length,
        blockingStyles: blockingStyles.length
      }
    })

    console.log('Render blocking resources:', renderBlocking)
    expect(renderBlocking.blockingScripts).toBe(0)
    expect(renderBlocking.blockingStyles).toBe(0)
  })
})


