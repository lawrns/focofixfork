import { test, expect, chromium } from '@playwright/test'
import { playAudit } from 'playwright-lighthouse'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'

test.describe('Lighthouse Performance Audit', () => {
  test('should run comprehensive Lighthouse audit on login page', async () => {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] })
    const options = {
      logLevel: 'info' as const,
      output: 'html' as const,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      port: chrome.port,
    }

    const runnerResult = await lighthouse('http://localhost:3000/login', options)

    if (!runnerResult) {
      throw new Error('Lighthouse audit failed')
    }

    const { lhr } = runnerResult

    console.log('\n=== LIGHTHOUSE AUDIT RESULTS ===')
    console.log(`Performance Score: ${(lhr.categories.performance.score || 0) * 100}`)
    console.log(`Accessibility Score: ${(lhr.categories.accessibility.score || 0) * 100}`)
    console.log(`Best Practices Score: ${(lhr.categories['best-practices'].score || 0) * 100}`)
    console.log(`SEO Score: ${(lhr.categories.seo.score || 0) * 100}`)

    console.log('\n=== CORE WEB VITALS ===')
    console.log(`First Contentful Paint: ${lhr.audits['first-contentful-paint'].displayValue}`)
    console.log(`Largest Contentful Paint: ${lhr.audits['largest-contentful-paint'].displayValue}`)
    console.log(`Total Blocking Time: ${lhr.audits['total-blocking-time'].displayValue}`)
    console.log(`Cumulative Layout Shift: ${lhr.audits['cumulative-layout-shift'].displayValue}`)
    console.log(`Speed Index: ${lhr.audits['speed-index'].displayValue}`)

    console.log('\n=== PERFORMANCE METRICS ===')
    console.log(`Time to Interactive: ${lhr.audits['interactive'].displayValue}`)
    console.log(`First Meaningful Paint: ${lhr.audits['first-meaningful-paint']?.displayValue || 'N/A'}`)
    console.log(`Max Potential FID: ${lhr.audits['max-potential-fid'].displayValue}`)

    console.log('\n=== OPPORTUNITIES (if any) ===')
    const opportunities = Object.entries(lhr.audits)
      .filter(([_, audit]: any) => audit.details?.type === 'opportunity' && audit.score !== null && audit.score < 1)
      .map(([id, audit]: any) => ({
        id,
        title: audit.title,
        score: audit.score,
        savings: audit.details?.overallSavingsMs || 0
      }))
      .sort((a, b) => b.savings - a.savings)

    opportunities.slice(0, 5).forEach((opp, i) => {
      console.log(`${i + 1}. ${opp.title} (Save: ${opp.savings}ms)`)
    })

    await chrome.kill()

    // Assertions
    expect((lhr.categories.performance.score || 0) * 100).toBeGreaterThan(90)
    expect((lhr.categories.accessibility.score || 0) * 100).toBeGreaterThan(90)
  })

  test('should run Lighthouse audit on dashboard (authenticated)', async () => {
    const browser = await chromium.launch()
    const page = await browser.newPage()

    try {
      // Login first
      await page.goto('http://localhost:3000/login')
      await page.fill('input[type="email"]', 'manager@demo.foco.local')
      await page.fill('input[type="password"]', 'DemoManager123!')
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/dashboard/, { timeout: 10000 })

      // Run Lighthouse on authenticated dashboard
      const result = await playAudit({
        page,
        port: 9222,
        thresholds: {
          performance: 85, // Slightly lower threshold for authenticated pages
          accessibility: 90,
          'best-practices': 90,
          seo: 80,
        },
      })

      console.log('\n=== DASHBOARD LIGHTHOUSE SCORES ===')
      console.log('Performance:', result?.lhr?.categories?.performance?.score || 'N/A')
      console.log('Accessibility:', result?.lhr?.categories?.accessibility?.score || 'N/A')

    } finally {
      await browser.close()
    }
  })

  test('should measure bundle sizes and suggest optimizations', async () => {
    const browser = await chromium.launch()
    const page = await browser.newPage()

    try {
      const resources: any[] = []

      page.on('response', async response => {
        const url = response.url()
        const contentType = response.headers()['content-type'] || ''
        const contentLength = parseInt(response.headers()['content-length'] || '0')

        if (url.includes('_next') && (contentType.includes('javascript') || contentType.includes('css'))) {
          resources.push({
            type: contentType.includes('javascript') ? 'JS' : 'CSS',
            url: url.split('/').pop(),
            size: contentLength,
            compressed: response.headers()['content-encoding'] === 'gzip' || response.headers()['content-encoding'] === 'br'
          })
        }
      })

      await page.goto('http://localhost:3000/login')
      await page.waitForLoadState('networkidle')

      console.log('\n=== BUNDLE ANALYSIS ===')

      const jsResources = resources.filter(r => r.type === 'JS')
      const cssResources = resources.filter(r => r.type === 'CSS')

      const totalJS = jsResources.reduce((sum, r) => sum + r.size, 0)
      const totalCSS = cssResources.reduce((sum, r) => sum + r.size, 0)

      console.log(`\nJavaScript Bundles: ${jsResources.length} files`)
      console.log(`Total JS Size: ${(totalJS / 1024).toFixed(2)} KB`)
      jsResources
        .sort((a, b) => b.size - a.size)
        .slice(0, 10)
        .forEach(r => {
          console.log(`  - ${r.url}: ${(r.size / 1024).toFixed(2)} KB ${r.compressed ? '(compressed)' : ''}`)
        })

      console.log(`\nCSS Bundles: ${cssResources.length} files`)
      console.log(`Total CSS Size: ${(totalCSS / 1024).toFixed(2)} KB`)
      cssResources.forEach(r => {
        console.log(`  - ${r.url}: ${(r.size / 1024).toFixed(2)} KB ${r.compressed ? '(compressed)' : ''}`)
      })

      console.log('\n=== OPTIMIZATION RECOMMENDATIONS ===')

      if (totalJS > 500 * 1024) {
        console.log('⚠️  Consider code splitting to reduce initial JS bundle size')
      }

      if (totalCSS > 100 * 1024) {
        console.log('⚠️  Consider removing unused CSS or splitting critical CSS')
      }

      const uncompressed = resources.filter(r => !r.compressed)
      if (uncompressed.length > 0) {
        console.log(`⚠️  ${uncompressed.length} resources are not compressed`)
      }

      const largeFiles = resources.filter(r => r.size > 200 * 1024)
      if (largeFiles.length > 0) {
        console.log(`⚠️  ${largeFiles.length} files are larger than 200KB`)
      }

      // Assertions
      expect(totalJS).toBeLessThan(2 * 1024 * 1024) // 2MB
      expect(totalCSS).toBeLessThan(500 * 1024) // 500KB
      expect(jsResources.length).toBeGreaterThan(1) // Code splitting in place

    } finally {
      await browser.close()
    }
  })

  test('should verify lazy loading and code splitting', async () => {
    const browser = await chromium.launch()
    const page = await browser.newPage()

    try {
      const initialResources = new Set<string>()
      const lazyResources = new Set<string>()
      let initialLoadComplete = false

      page.on('response', response => {
        const url = response.url()
        if (url.includes('_next') && url.includes('.js')) {
          if (initialLoadComplete) {
            lazyResources.add(url)
          } else {
            initialResources.add(url)
          }
        }
      })

      await page.goto('http://localhost:3000/login')
      await page.waitForLoadState('networkidle')
      initialLoadComplete = true

      console.log('\n=== CODE SPLITTING ANALYSIS ===')
      console.log(`Initial bundles loaded: ${initialResources.size}`)

      // Navigate to dashboard to trigger lazy loading
      await page.fill('input[type="email"]', 'manager@demo.foco.local')
      await page.fill('input[type="password"]', 'DemoManager123!')
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/dashboard/, { timeout: 10000 }).catch(() => {})
      await page.waitForLoadState('networkidle')

      console.log(`Lazy loaded bundles: ${lazyResources.size}`)

      if (lazyResources.size > 0) {
        console.log('✅ Code splitting is working - additional chunks loaded on navigation')
      } else {
        console.log('⚠️  No lazy loaded chunks detected - consider route-based code splitting')
      }

      // Check for image lazy loading
      const images = await page.$$('img')
      const lazyImages = await page.$$('img[loading="lazy"]')

      console.log(`\n=== IMAGE LAZY LOADING ===`)
      console.log(`Total images: ${images.length}`)
      console.log(`Lazy loaded images: ${lazyImages.length}`)

      if (lazyImages.length > 0) {
        console.log('✅ Image lazy loading is implemented')
      }

    } finally {
      await browser.close()
    }
  })

  test('should measure Time to First Byte (TTFB)', async () => {
    const browser = await chromium.launch()
    const page = await browser.newPage()

    try {
      await page.goto('http://localhost:3000/login')

      const ttfb = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        return navigation.responseStart - navigation.requestStart
      })

      console.log('\n=== SERVER RESPONSE TIME ===')
      console.log(`Time to First Byte: ${ttfb.toFixed(2)}ms`)

      if (ttfb < 200) {
        console.log('✅ Excellent TTFB')
      } else if (ttfb < 500) {
        console.log('✓ Good TTFB')
      } else if (ttfb < 1000) {
        console.log('⚠️  Fair TTFB - consider optimization')
      } else {
        console.log('❌ Poor TTFB - server optimization needed')
      }

      // TTFB should be under 600ms for good performance
      expect(ttfb).toBeLessThan(600)

    } finally {
      await browser.close()
    }
  })

  test('should analyze network waterfall', async () => {
    const browser = await chromium.launch()
    const page = await browser.newPage()

    try {
      const resourceTimings: any[] = []

      page.on('response', async response => {
        const timing = await response.request().timing()
        if (timing) {
          resourceTimings.push({
            url: response.url().split('/').pop(),
            duration: timing.responseEnd - timing.requestStart,
            blocked: timing.dnsStart > 0 ? timing.dnsStart : 0,
            dns: timing.dnsEnd - timing.dnsStart,
            connect: timing.connectEnd - timing.connectStart,
            send: timing.sendEnd - timing.sendStart,
            wait: timing.responseStart - timing.sendEnd,
            receive: timing.responseEnd - timing.responseStart
          })
        }
      })

      await page.goto('http://localhost:3000/login')
      await page.waitForLoadState('networkidle')

      console.log('\n=== NETWORK WATERFALL ANALYSIS ===')
      console.log(`Total resources: ${resourceTimings.length}`)

      // Find slowest resources
      const slowest = resourceTimings
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10)

      console.log('\nSlowest Resources:')
      slowest.forEach((timing, i) => {
        console.log(`${i + 1}. ${timing.url}: ${timing.duration.toFixed(2)}ms`)
        console.log(`   Wait: ${timing.wait.toFixed(2)}ms, Receive: ${timing.receive.toFixed(2)}ms`)
      })

      // Check for parallel loading
      const avgDuration = resourceTimings.reduce((sum, t) => sum + t.duration, 0) / resourceTimings.length
      console.log(`\nAverage resource load time: ${avgDuration.toFixed(2)}ms`)

    } finally {
      await browser.close()
    }
  })
})
