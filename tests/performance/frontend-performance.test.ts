/**
 * Frontend Performance Testing Suite
 * Tests page load times, bundle sizes, and frontend performance metrics
 */

import { test, expect } from '@playwright/test';

interface PagePerformanceMetrics {
  page: string;
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  cumulativeLayoutShift: number;
  transferSize: number;
  resourceCount: number;
  jsSize: number;
  cssSize: number;
  imageSize: number;
  cacheHitRate: number;
}

const PERFORMANCE_BUDGETS = {
  loadTime: 3000, // 3s
  firstContentfulPaint: 1800, // 1.8s
  largestContentfulPaint: 2500, // 2.5s
  timeToInteractive: 3800, // 3.8s
  totalBlockingTime: 300, // 300ms
  cumulativeLayoutShift: 0.1, // CLS score
  jsSize: 500000, // 500KB
  cssSize: 100000, // 100KB
};

async function measurePagePerformance(
  page: any,
  url: string
): Promise<PagePerformanceMetrics> {
  // Clear cache and cookies for accurate measurement
  await page.context().clearCookies();

  const startTime = Date.now();

  // Navigate to page
  await page.goto(url, { waitUntil: 'networkidle' });

  const loadTime = Date.now() - startTime;

  // Get performance metrics from browser
  const metrics = await page.evaluate(() => {
    const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintEntries = performance.getEntriesByType('paint');

    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0;
    const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;

    // Get resource sizes
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    let jsSize = 0;
    let cssSize = 0;
    let imageSize = 0;
    let cachedResources = 0;

    resources.forEach((resource) => {
      const size = resource.transferSize;

      if (resource.transferSize === 0) {
        cachedResources++;
      }

      if (resource.name.includes('.js')) {
        jsSize += size;
      } else if (resource.name.includes('.css')) {
        cssSize += size;
      } else if (resource.name.match(/\.(png|jpg|jpeg|gif|svg|webp)/)) {
        imageSize += size;
      }
    });

    return {
      domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
      firstPaint,
      firstContentfulPaint,
      transferSize: perf.transferSize || 0,
      resourceCount: resources.length,
      jsSize,
      cssSize,
      imageSize,
      cacheHitRate: resources.length > 0 ? (cachedResources / resources.length) * 100 : 0,
    };
  });

  // Get Web Vitals using PerformanceObserver
  const webVitals = await page.evaluate(() => {
    return new Promise((resolve) => {
      let lcp = 0;
      let cls = 0;
      let tbt = 0;
      let tti = 0;

      // Largest Contentful Paint
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        lcp = lastEntry.renderTime || lastEntry.loadTime;
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // Layout Shift
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            cls += (entry as any).value;
          }
        }
      }).observe({ entryTypes: ['layout-shift'] });

      // Approximate TTI and TBT from long tasks
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const duration = entry.duration;
          if (duration > 50) {
            tbt += duration - 50;
          }
        }
      }).observe({ entryTypes: ['longtask'] });

      // Give observers time to collect data
      setTimeout(() => {
        // Estimate TTI (simplified)
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        tti = perfData.domInteractive;

        resolve({ lcp, cls, tbt, tti });
      }, 2000);
    });
  });

  return {
    page: url,
    loadTime,
    domContentLoaded: metrics.domContentLoaded,
    firstPaint: metrics.firstPaint,
    firstContentfulPaint: metrics.firstContentfulPaint,
    largestContentfulPaint: (webVitals as any).lcp,
    timeToInteractive: (webVitals as any).tti,
    totalBlockingTime: (webVitals as any).tbt,
    cumulativeLayoutShift: (webVitals as any).cls,
    transferSize: metrics.transferSize,
    resourceCount: metrics.resourceCount,
    jsSize: metrics.jsSize,
    cssSize: metrics.cssSize,
    imageSize: metrics.imageSize,
    cacheHitRate: metrics.cacheHitRate,
  };
}

test.describe('Frontend Performance Analysis', () => {
  let allMetrics: PagePerformanceMetrics[] = [];

  test.beforeAll(async () => {
    console.log('\n🎨 Starting Frontend Performance Analysis...\n');
  });

  test('/tasks page performance', async ({ page }) => {
    console.log('Testing /tasks page...');

    const metrics = await measurePagePerformance(page, '/tasks');
    allMetrics.push(metrics);

    console.log(`  Load Time: ${metrics.loadTime}ms`);
    console.log(`  FCP: ${Math.round(metrics.firstContentfulPaint)}ms`);
    console.log(`  LCP: ${Math.round(metrics.largestContentfulPaint)}ms`);
    console.log(`  TTI: ${Math.round(metrics.timeToInteractive)}ms`);
    console.log(`  TBT: ${Math.round(metrics.totalBlockingTime)}ms`);
    console.log(`  CLS: ${metrics.cumulativeLayoutShift.toFixed(3)}`);
    console.log(`  JS Size: ${Math.round(metrics.jsSize / 1024)}KB`);
    console.log(`  CSS Size: ${Math.round(metrics.cssSize / 1024)}KB`);
    console.log(`  Cache Hit Rate: ${metrics.cacheHitRate.toFixed(1)}%\n`);

    // Performance budget assertions
    expect(metrics.loadTime, 'Page load time').toBeLessThan(PERFORMANCE_BUDGETS.loadTime);
    expect(metrics.firstContentfulPaint, 'FCP').toBeLessThan(PERFORMANCE_BUDGETS.firstContentfulPaint);
    expect(metrics.largestContentfulPaint, 'LCP').toBeLessThan(PERFORMANCE_BUDGETS.largestContentfulPaint);
    expect(metrics.cumulativeLayoutShift, 'CLS').toBeLessThan(PERFORMANCE_BUDGETS.cumulativeLayoutShift);
  });

  test('/tasks/new page performance', async ({ page }) => {
    console.log('Testing /tasks/new page...');

    const metrics = await measurePagePerformance(page, '/tasks/new');
    allMetrics.push(metrics);

    console.log(`  Load Time: ${metrics.loadTime}ms`);
    console.log(`  FCP: ${Math.round(metrics.firstContentfulPaint)}ms`);
    console.log(`  LCP: ${Math.round(metrics.largestContentfulPaint)}ms`);
    console.log(`  TTI: ${Math.round(metrics.timeToInteractive)}ms`);
    console.log(`  TBT: ${Math.round(metrics.totalBlockingTime)}ms`);
    console.log(`  CLS: ${metrics.cumulativeLayoutShift.toFixed(3)}`);
    console.log(`  JS Size: ${Math.round(metrics.jsSize / 1024)}KB`);
    console.log(`  Cache Hit Rate: ${metrics.cacheHitRate.toFixed(1)}%\n`);

    expect(metrics.loadTime).toBeLessThan(PERFORMANCE_BUDGETS.loadTime);
    expect(metrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_BUDGETS.firstContentfulPaint);
  });

  test('/people page performance', async ({ page }) => {
    console.log('Testing /people page...');

    const metrics = await measurePagePerformance(page, '/people');
    allMetrics.push(metrics);

    console.log(`  Load Time: ${metrics.loadTime}ms`);
    console.log(`  FCP: ${Math.round(metrics.firstContentfulPaint)}ms`);
    console.log(`  LCP: ${Math.round(metrics.largestContentfulPaint)}ms`);
    console.log(`  TTI: ${Math.round(metrics.timeToInteractive)}ms`);
    console.log(`  TBT: ${Math.round(metrics.totalBlockingTime)}ms`);
    console.log(`  CLS: ${metrics.cumulativeLayoutShift.toFixed(3)}`);
    console.log(`  JS Size: ${Math.round(metrics.jsSize / 1024)}KB`);
    console.log(`  Cache Hit Rate: ${metrics.cacheHitRate.toFixed(1)}%\n`);

    expect(metrics.loadTime).toBeLessThan(PERFORMANCE_BUDGETS.loadTime);
    expect(metrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_BUDGETS.firstContentfulPaint);
  });

  test('/projects page performance', async ({ page }) => {
    console.log('Testing /projects page...');

    const metrics = await measurePagePerformance(page, '/projects');
    allMetrics.push(metrics);

    console.log(`  Load Time: ${metrics.loadTime}ms`);
    console.log(`  FCP: ${Math.round(metrics.firstContentfulPaint)}ms`);
    console.log(`  LCP: ${Math.round(metrics.largestContentfulPaint)}ms`);
    console.log(`  TTI: ${Math.round(metrics.timeToInteractive)}ms`);
    console.log(`  TBT: ${Math.round(metrics.totalBlockingTime)}ms`);
    console.log(`  CLS: ${metrics.cumulativeLayoutShift.toFixed(3)}`);
    console.log(`  JS Size: ${Math.round(metrics.jsSize / 1024)}KB`);
    console.log(`  Cache Hit Rate: ${metrics.cacheHitRate.toFixed(1)}%\n`);

    expect(metrics.loadTime).toBeLessThan(PERFORMANCE_BUDGETS.loadTime);
  });

  test.afterAll(async () => {
    console.log('\n📊 Frontend Performance Summary:\n');
    console.log('═'.repeat(120));
    console.log(
      'Page'.padEnd(25) +
      'Load'.padEnd(12) +
      'FCP'.padEnd(12) +
      'LCP'.padEnd(12) +
      'TTI'.padEnd(12) +
      'TBT'.padEnd(12) +
      'CLS'.padEnd(10) +
      'JS Size'.padEnd(12) +
      'Cache%'
    );
    console.log('═'.repeat(120));

    allMetrics.forEach(metric => {
      const loadWarning = metric.loadTime > PERFORMANCE_BUDGETS.loadTime ? '⚠️ ' : '✅ ';
      const fcpWarning = metric.firstContentfulPaint > PERFORMANCE_BUDGETS.firstContentfulPaint ? '⚠️ ' : '✅ ';
      const lcpWarning = metric.largestContentfulPaint > PERFORMANCE_BUDGETS.largestContentfulPaint ? '⚠️ ' : '✅ ';
      const clsWarning = metric.cumulativeLayoutShift > PERFORMANCE_BUDGETS.cumulativeLayoutShift ? '⚠️ ' : '✅ ';

      console.log(
        metric.page.padEnd(25) +
        `${loadWarning}${metric.loadTime}ms`.padEnd(12) +
        `${fcpWarning}${Math.round(metric.firstContentfulPaint)}ms`.padEnd(12) +
        `${lcpWarning}${Math.round(metric.largestContentfulPaint)}ms`.padEnd(12) +
        `${Math.round(metric.timeToInteractive)}ms`.padEnd(12) +
        `${Math.round(metric.totalBlockingTime)}ms`.padEnd(12) +
        `${clsWarning}${metric.cumulativeLayoutShift.toFixed(3)}`.padEnd(10) +
        `${Math.round(metric.jsSize / 1024)}KB`.padEnd(12) +
        `${metric.cacheHitRate.toFixed(1)}%`
      );
    });

    console.log('═'.repeat(120));

    // Identify performance issues
    const slowPages = allMetrics.filter(m =>
      m.loadTime > PERFORMANCE_BUDGETS.loadTime ||
      m.largestContentfulPaint > PERFORMANCE_BUDGETS.largestContentfulPaint
    );

    if (slowPages.length > 0) {
      console.log('\n⚠️  Performance Issues Detected:\n');
      slowPages.forEach(page => {
        console.log(`  ${page.page}`);
        if (page.loadTime > PERFORMANCE_BUDGETS.loadTime) {
          console.log(`    Load Time: ${page.loadTime}ms (budget: ${PERFORMANCE_BUDGETS.loadTime}ms)`);
        }
        if (page.largestContentfulPaint > PERFORMANCE_BUDGETS.largestContentfulPaint) {
          console.log(`    LCP: ${Math.round(page.largestContentfulPaint)}ms (budget: ${PERFORMANCE_BUDGETS.largestContentfulPaint}ms)`);
        }
      });
    }

    // Bundle size analysis
    const heavyPages = allMetrics.filter(m => m.jsSize > PERFORMANCE_BUDGETS.jsSize);
    if (heavyPages.length > 0) {
      console.log('\n📦 Large JavaScript Bundles:\n');
      heavyPages.forEach(page => {
        console.log(`  ${page.page}: ${Math.round(page.jsSize / 1024)}KB (budget: ${PERFORMANCE_BUDGETS.jsSize / 1024}KB)`);
      });
    }

    // Cache analysis
    const avgCacheHitRate = allMetrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / allMetrics.length;
    console.log(`\n💾 Average Cache Hit Rate: ${avgCacheHitRate.toFixed(1)}%`);
    if (avgCacheHitRate < 50) {
      console.log('   ⚠️  Low cache hit rate. Consider implementing better caching strategies.\n');
    }

    // Web Vitals summary
    console.log('\n📈 Core Web Vitals Summary:');
    console.log(`  Average FCP: ${Math.round(allMetrics.reduce((sum, m) => sum + m.firstContentfulPaint, 0) / allMetrics.length)}ms (target: <${PERFORMANCE_BUDGETS.firstContentfulPaint}ms)`);
    console.log(`  Average LCP: ${Math.round(allMetrics.reduce((sum, m) => sum + m.largestContentfulPaint, 0) / allMetrics.length)}ms (target: <${PERFORMANCE_BUDGETS.largestContentfulPaint}ms)`);
    console.log(`  Average TBT: ${Math.round(allMetrics.reduce((sum, m) => sum + m.totalBlockingTime, 0) / allMetrics.length)}ms (target: <${PERFORMANCE_BUDGETS.totalBlockingTime}ms)`);
    console.log(`  Average CLS: ${(allMetrics.reduce((sum, m) => sum + m.cumulativeLayoutShift, 0) / allMetrics.length).toFixed(3)} (target: <${PERFORMANCE_BUDGETS.cumulativeLayoutShift})\n`);
  });
});
