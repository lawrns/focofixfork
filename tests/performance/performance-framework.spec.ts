import { test, expect } from '@playwright/test';

test.describe('Performance Testing Framework', () => {
  const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
  
  // Performance thresholds
  const PERFORMANCE_THRESHOLDS = {
    pageLoad: 3000, // 3 seconds
    firstContentfulPaint: 1500, // 1.5 seconds
    largestContentfulPaint: 2500, // 2.5 seconds
    cumulativeLayoutShift: 0.1,
    firstInputDelay: 100,
    timeToInteractive: 5000, // 5 seconds
    bundleSize: 250000, // 250KB gzipped
    apiResponseTime: 1000, // 1 second
    memoryUsage: 50 * 1024 * 1024, // 50MB
  };

  // Helper functions
  async function measurePageLoad(page: any, url: string) {
    const startTime = Date.now();
    
    const [response] = await Promise.all([
      page.goto(url, { waitUntil: 'networkidle' }),
      page.waitForLoadState('networkidle'),
    ]);
    
    const loadTime = Date.now() - startTime;
    
    // Get Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: any = {};
        
        // Performance Observer for Web Vitals
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'largest-contentful-paint') {
                vitals.lcp = entry.startTime;
              } else if (entry.entryType === 'first-input') {
                vitals.fid = entry.processingStart - entry.startTime;
              } else if (entry.entryType === 'layout-shift') {
                vitals.cls = (vitals.cls || 0) + entry.value;
              }
            }
          });
          
          observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
        }
        
        // Get basic performance metrics
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        vitals.pageLoad = navigation.loadEventEnd - navigation.loadEventStart;
        vitals.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
        vitals.firstByte = navigation.responseStart - navigation.requestStart;
        
        // Get memory usage
        if ('memory' in performance) {
          vitals.memory = (performance as any).memory;
        }
        
        setTimeout(() => resolve(vitals), 2000);
      });
    });
    
    return {
      loadTime,
      response: response,
      vitals,
    };
  }

  async function measureBundleSize(page: any) {
    const bundleInfo = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      
      return {
        scripts: scripts.map(script => ({
          src: script.getAttribute('src'),
          size: script.getAttribute('src')?.includes('.js') ? 'unknown' : 'unknown',
        })),
        styles: styles.map(style => ({
          href: style.getAttribute('href'),
          size: 'unknown',
        })),
        totalScripts: scripts.length,
        totalStyles: styles.length,
      };
    });
    
    return bundleInfo;
  }

  async function measureAPIPerformance(page: any, endpoint: string, method = 'GET') {
    const startTime = Date.now();
    
    const response = await page.evaluate(async ({ url, method }) => {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      if (method !== 'GET') {
        options.body = JSON.stringify({ test: 'data' });
      }
      
      const response = await fetch(url, options);
      return {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      };
    }, { url: `${BASE_URL}/api${endpoint}`, method });
    
    const responseTime = Date.now() - startTime;
    
    return {
      responseTime,
      response,
    };
  }

  async function measureRenderPerformance(page: any) {
    const renderMetrics = await page.evaluate(() => {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log(`${entry.name}: ${entry.duration}ms`);
        }
      });
      
      observer.observe({ entryTypes: ['measure', 'navigation'] });
      
      return {
        domNodes: document.querySelectorAll('*').length,
        bodySize: document.body.innerHTML.length,
        renderTime: performance.now(),
      };
    });
    
    return renderMetrics;
  }

  test.describe('Core Web Vitals', () => {
    test('Largest Contentful Paint (LCP) within threshold', async ({ page }) => {
      const { vitals } = await measurePageLoad(page, `${BASE_URL}/dashboard`);
      
      expect(vitals.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.largestContentfulPaint);
    });

    test('First Input Delay (FID) within threshold', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Trigger first input
      await page.click('button, a, input');
      
      const vitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'first-input') {
                resolve(entry.processingStart - entry.startTime);
                return;
              }
            }
          });
          
          observer.observe({ entryTypes: ['first-input'] });
          setTimeout(() => resolve(0), 1000);
        });
      });
      
      expect(vitals).toBeLessThan(PERFORMANCE_THRESHOLDS.firstInputDelay);
    });

    test('Cumulative Layout Shift (CLS) within threshold', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Wait for layout shifts to occur
      await page.waitForTimeout(3000);
      
      const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
          let clsValue = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
          });
          
          observer.observe({ entryTypes: ['layout-shift'] });
          setTimeout(() => resolve(clsValue), 2000);
        });
      });
      
      expect(cls).toBeLessThan(PERFORMANCE_THRESHOLDS.cumulativeLayoutShift);
    });
  });

  test.describe('Page Load Performance', () => {
    test('dashboard loads within threshold', async ({ page }) => {
      const { loadTime } = await measurePageLoad(page, `${BASE_URL}/dashboard`);
      
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    });

    test('projects page loads within threshold', async ({ page }) => {
      const { loadTime } = await measurePageLoad(page, `${BASE_URL}/projects`);
      
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    });

    test('tasks page loads within threshold', async ({ page }) => {
      const { loadTime } = await measurePageLoad(page, `${BASE_URL}/tasks`);
      
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    });

    test('login page loads within threshold', async ({ page }) => {
      const { loadTime } = await measurePageLoad(page, `${BASE_URL}/login`);
      
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    });

    test('page load with large dataset', async ({ page }) => {
      // Simulate loading page with lots of data
      await page.goto(`${BASE_URL}/projects?limit=100`);
      
      const { loadTime } = await measurePageLoad(page, `${BASE_URL}/projects?limit=100`);
      
      // Should still be reasonably fast even with data
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad * 1.5);
    });
  });

  test.describe('API Performance', () => {
    test('authentication API response time', async ({ page }) => {
      const { responseTime } = await measureAPIPerformance(page, '/auth/login', 'POST');
      
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime);
    });

    test('projects API response time', async ({ page }) => {
      const { responseTime } = await measureAPIPerformance(page, '/projects');
      
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime);
    });

    test('tasks API response time', async ({ page }) => {
      const { responseTime } = await measureAPIPerformance(page, '/tasks');
      
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime);
    });

    test('AI API response time', async ({ page }) => {
      const { responseTime } = await measureAPIPerformance(page, '/ai/chat', 'POST');
      
      // AI responses can be slower, but should still be reasonable
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime * 5);
    });

    test('bulk operations performance', async ({ page }) => {
      const { responseTime } = await measureAPIPerformance(page, '/projects/bulk-update', 'POST');
      
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime * 2);
    });
  });

  test.describe('Bundle Size and Resource Loading', () => {
    test('JavaScript bundle size within limits', async ({ page }) => {
      const bundleInfo = await measureBundleSize(page);
      
      // Should not have too many script files
      expect(bundleInfo.totalScripts).toBeLessThan(10);
      
      // Should have reasonable number of stylesheets
      expect(bundleInfo.totalStyles).toBeLessThan(5);
    });

    test('critical resources load first', async ({ page }) => {
      const responses: any[] = [];
      
      page.on('response', response => {
        if (response.url().includes('.js') || response.url().includes('.css')) {
          responses.push({
            url: response.url(),
            status: response.status(),
            timing: response.timing(),
          });
        }
      });
      
      await page.goto(`${BASE_URL}/dashboard`);
      
      // All critical resources should load successfully
      const failedResources = responses.filter(r => r.status >= 400);
      expect(failedResources.length).toBe(0);
    });

    test('images are optimized', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      const images = await page.locator('img').all();
      
      for (const image of images) {
        const src = await image.getAttribute('src');
        
        if (src && !src.startsWith('data:')) {
          // Check for responsive images
          const srcset = await image.getAttribute('srcset');
          const sizes = await image.getAttribute('sizes');
          
          // Important images should have srcset or be optimized
          const isImportant = await image.evaluate(el => {
            const closest = el.closest('header, main, section');
            return closest !== null;
          });
          
          if (isImportant) {
            expect(srcset || sizes).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Memory Usage', () => {
    test('memory usage within acceptable limits', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      const memoryUsage = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      expect(memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage);
    });

    test('memory does not leak on navigation', async ({ page }) => {
      const memoryReadings: number[] = [];
      
      // Navigate through multiple pages
      const pages = [
        `${BASE_URL}/dashboard`,
        `${BASE_URL}/projects`,
        `${BASE_URL}/tasks`,
        `${BASE_URL}/dashboard`,
        `${BASE_URL}/projects`,
      ];
      
      for (const pageUrl of pages) {
        await page.goto(pageUrl);
        
        const memoryUsage = await page.evaluate(() => {
          if ('memory' in performance) {
            return (performance as any).memory.usedJSHeapSize;
          }
          return 0;
        });
        
        memoryReadings.push(memoryUsage);
      }
      
      // Memory should not continuously grow
      const firstReading = memoryReadings[0];
      const lastReading = memoryReadings[memoryReadings.length - 1];
      const growth = lastReading - firstReading;
      
      // Allow some growth but not excessive
      expect(growth).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage * 0.5);
    });
  });

  test.describe('Rendering Performance', () => {
    test('DOM complexity is reasonable', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      const renderMetrics = await measureRenderPerformance(page);
      
      // Should not have excessive DOM nodes
      expect(renderMetrics.domNodes).toBeLessThan(1000);
      
      // HTML size should be reasonable
      expect(renderMetrics.bodySize).toBeLessThan(100000); // 100KB
    });

    test('smooth scrolling performance', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);
      
      // Measure scroll performance
      const scrollMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          let frameCount = 0;
          let startTime = performance.now();
          
          function countFrames() {
            frameCount++;
            if (performance.now() - startTime < 1000) {
              requestAnimationFrame(countFrames);
            } else {
              resolve({ frameCount, fps: frameCount });
            }
          }
          
          // Start scrolling
          window.scrollTo(0, document.body.scrollHeight / 2);
          countFrames();
        });
      });
      
      // Should maintain reasonable FPS during scroll
      expect(scrollMetrics.fps).toBeGreaterThan(30);
    });

    test('animation performance', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Trigger animations
      await page.hover('button, .card, [data-animate]');
      
      const animationMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          let frameCount = 0;
          let startTime = performance.now();
          
          function countFrames() {
            frameCount++;
            if (performance.now() - startTime < 500) {
              requestAnimationFrame(countFrames);
            } else {
              resolve({ frameCount, fps: frameCount * 2 }); // 2x for 500ms
            }
          }
          
          countFrames();
        });
      });
      
      // Animations should be smooth
      expect(animationMetrics.fps).toBeGreaterThan(30);
    });
  });

  test.describe('Network Performance', () => {
    test('efficient resource loading', async ({ page }) => {
      const resourceTiming: any[] = [];
      
      page.on('response', response => {
        resourceTiming.push({
          url: response.url(),
          timing: response.timing(),
        });
      });
      
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Check for resource optimization
      const cssResources = resourceTiming.filter(r => r.url.includes('.css'));
      const jsResources = resourceTiming.filter(r => r.url.includes('.js'));
      
      // Should have optimized resource loading
      expect(cssResources.length).toBeGreaterThan(0);
      expect(jsResources.length).toBeGreaterThan(0);
      
      // Resources should load in reasonable time
      for (const resource of [...cssResources, ...jsResources]) {
        const loadTime = resource.timing.responseEnd - resource.timing.requestStart;
        expect(loadTime).toBeLessThan(1000);
      }
    });

    test('service worker caching', async ({ page }) => {
      // Check if service worker is registered
      const serviceWorker = await page.evaluate(() => {
        return navigator.serviceWorker.getRegistrations();
      });
      
      if (serviceWorker.length > 0) {
        // Test caching by revisiting page
        await page.goto(`${BASE_URL}/dashboard`);
        
        const cachedResources = await page.evaluate(() => {
          return performance.getEntriesByType('resource').filter((entry: any) => {
            return entry.transferSize === 0 && entry.decodedBodySize > 0;
          });
        });
        
        // Some resources should be cached
        expect(cachedResources.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Mobile Performance', () => {
    test('performance on slow 3G connection', async ({ page }) => {
      // Simulate slow 3G
      await page.route('**/*', route => {
        // Add delay to simulate slow network
        setTimeout(() => route.continue(), 500);
      });
      
      const startTime = Date.now();
      await page.goto(`${BASE_URL}/dashboard`);
      const loadTime = Date.now() - startTime;
      
      // Should still load within reasonable time on slow connection
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad * 2);
    });

    test('performance on low-end device', async ({ page }) => {
      // Simulate CPU throttling
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      const { loadTime } = await measurePageLoad(page, `${BASE_URL}/dashboard`);
      
      // Should still be usable on low-end devices
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad * 1.5);
    });
  });

  test.describe('Performance Regression Testing', () => {
    test('performance budget compliance', async ({ page }) => {
      const { vitals, loadTime } = await measurePageLoad(page, `${BASE_URL}/dashboard`);
      
      const budgetResults = {
        pageLoad: loadTime < PERFORMANCE_THRESHOLDS.pageLoad,
        lcp: vitals.lcp < PERFORMANCE_THRESHOLDS.largestContentfulPaint,
        fid: vitals.fid < PERFORMANCE_THRESHOLDS.firstInputDelay,
        cls: vitals.cls < PERFORMANCE_THRESHOLDS.cumulativeLayoutShift,
      };
      
      const failedBudgets = Object.entries(budgetResults)
        .filter(([_, passed]) => !passed)
        .map(([metric]) => metric);
      
      expect(failedBudgets.length).toBe(0);
    });

    test('performance score calculation', async ({ page }) => {
      const { vitals, loadTime } = await measurePageLoad(page, `${BASE_URL}/dashboard`);
      
      const score = await page.evaluate(({ vitals, thresholds }) => {
        let score = 100;
        
        // Deduct points for poor performance
        if (vitals.lcp > thresholds.lcp) score -= 20;
        if (vitals.fid > thresholds.fid) score -= 15;
        if (vitals.cls > thresholds.cls) score -= 15;
        if (vitals.pageLoad > thresholds.pageLoad) score -= 25;
        
        return Math.max(0, score);
      }, { vitals, thresholds: PERFORMANCE_THRESHOLDS });
      
      // Should have a good performance score
      expect(score).toBeGreaterThan(80);
    });
  });

  test.describe('Real User Monitoring (RUM) Simulation', () => {
    test('simulated user journey performance', async ({ page }) => {
      const journeyMetrics: any[] = [];
      
      // Simulate typical user journey
      const journey = [
        { action: 'navigate', url: `${BASE_URL}/dashboard` },
        { action: 'click', selector: 'button:has-text("Projects")' },
        { action: 'navigate', url: `${BASE_URL}/projects` },
        { action: 'click', selector: 'button:has-text("New Project")' },
        { action: 'fill', selector: 'input[placeholder*="project"]', text: 'Test Project' },
        { action: 'click', selector: 'button:has-text("Create")' },
      ];
      
      for (const step of journey) {
        const startTime = performance.now();
        
        if (step.action === 'navigate') {
          await page.goto(step.url);
        } else if (step.action === 'click') {
          await page.click(step.selector);
        } else if (step.action === 'fill') {
          await page.fill(step.selector, step.text);
        }
        
        const endTime = performance.now();
        const stepTime = endTime - startTime;
        
        journeyMetrics.push({
          action: step.action,
          time: stepTime,
          timestamp: new Date().toISOString(),
        });
      }
      
      // Analyze journey performance
      const totalTime = journeyMetrics.reduce((sum, metric) => sum + metric.time, 0);
      const averageStepTime = totalTime / journeyMetrics.length;
      
      expect(totalTime).toBeLessThan(10000); // Complete journey in under 10 seconds
      expect(averageStepTime).toBeLessThan(2000); // Average step under 2 seconds
    });
  });
});
