import { PerformanceService } from '@/lib/services/performance';

export interface PerformanceMetrics {
  // Core Web Vitals
  cls: number; // Cumulative Layout Shift
  fid: number; // First Input Delay
  lcp: number; // Largest Contentful Paint
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte

  // Additional metrics
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;

  // Resource timing
  resources: PerformanceResourceTiming[];
  navigation: PerformanceNavigationTiming;

  // Memory usage (if available)
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };

  // Network information
  networkInfo?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
}

export interface PerformanceThresholds {
  cls: { good: number; poor: number };
  fid: { good: number; poor: number };
  lcp: { good: number; poor: number };
  fcp: { good: number; poor: number };
  ttfb: { good: number; poor: number };
}

export const PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  cls: { good: 0.1, poor: 0.25 },
  fid: { good: 100, poor: 300 },
  lcp: { good: 2500, poor: 4000 },
  fcp: { good: 1800, poor: 3000 },
  ttfb: { good: 800, poor: 1800 },
};

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    this.setupCoreWebVitals();
    this.setupResourceMonitoring();
    this.setupNavigationMonitoring();
    this.setupMemoryMonitoring();
    this.setupNetworkMonitoring();
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  private setupCoreWebVitals(): void {
    // Cumulative Layout Shift (CLS)
    if ('PerformanceObserver' in window) {
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              const clsValue = (entry as any).value;
              this.updateMetric('cls', clsValue);
              this.reportMetric('cls', clsValue);
            }
          }
        });

        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (error) {
        console.warn('CLS monitoring not supported:', error);
      }

      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const fidValue = (entry as any).processingStart - entry.startTime;
            this.updateMetric('fid', fidValue);
            this.reportMetric('fid', fidValue);
          }
        });

        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (error) {
        console.warn('FID monitoring not supported:', error);
      }

      // Largest Contentful Paint (LCP)
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          const lcpValue = lastEntry.startTime;
          this.updateMetric('lcp', lcpValue);
          this.reportMetric('lcp', lcpValue);
        });

        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (error) {
        console.warn('LCP monitoring not supported:', error);
      }
    }

    // Fallback for browsers without PerformanceObserver
    this.measureFallbackMetrics();
  }

  private setupResourceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const resources = list.getEntries() as PerformanceResourceTiming[];
          this.updateMetric('resources', resources);

          // Analyze resource performance
          this.analyzeResourcePerformance(resources);
        });

        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Resource monitoring not supported:', error);
      }
    }
  }

  private setupNavigationMonitoring(): void {
    if ('PerformanceObserver' in window) {
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as PerformanceNavigationTiming[];
          if (entries.length > 0) {
            const navigation = entries[0];
            this.updateMetric('navigation', navigation);

            // Extract key timing metrics
            this.updateMetric('domContentLoaded', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart);
            this.updateMetric('loadComplete', navigation.loadEventEnd - navigation.loadEventStart);
            this.updateMetric('ttfb', navigation.responseStart - navigation.requestStart);
          }
        });

        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);
      } catch (error) {
        console.warn('Navigation monitoring not supported:', error);
      }
    }
  }

  private setupMemoryMonitoring(): void {
    // Memory monitoring (Chrome only)
    if ('memory' in performance) {
      const updateMemoryMetrics = () => {
        const memory = (performance as any).memory;
        this.updateMetric('memory', {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        });

        // Check for memory issues
        const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        if (usageRatio > 0.8) {
          console.warn('High memory usage detected:', usageRatio);
          this.reportMetric('memory_warning', usageRatio);
        }
      };

      // Update memory metrics periodically
      setInterval(updateMemoryMetrics, 30000); // Every 30 seconds
      updateMemoryMetrics(); // Initial measurement
    }
  }

  private setupNetworkMonitoring(): void {
    // Network Information API
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        const updateNetworkInfo = () => {
          this.updateMetric('networkInfo', {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
          });

          // Report poor connection
          if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
            console.warn('Poor network connection detected:', connection.effectiveType);
            this.reportMetric('network_warning', connection.effectiveType);
          }
        };

        updateNetworkInfo();

        // Listen for connection changes
        connection.addEventListener('change', updateNetworkInfo);
      }
    }
  }

  private measureFallbackMetrics(): void {
    // Fallback measurements for browsers without full PerformanceObserver support
    if ('performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (navigation) {
        this.updateMetric('domContentLoaded', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart);
        this.updateMetric('loadComplete', navigation.loadEventEnd - navigation.loadEventStart);
        this.updateMetric('ttfb', navigation.responseStart - navigation.requestStart);
      }

      // Paint timing
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach(entry => {
        if (entry.name === 'first-paint') {
          this.updateMetric('firstPaint', entry.startTime);
        } else if (entry.name === 'first-contentful-paint') {
          this.updateMetric('firstContentfulPaint', entry.startTime);
          this.updateMetric('fcp', entry.startTime);
        }
      });
    }
  }

  private analyzeResourcePerformance(resources: PerformanceResourceTiming[]): void {
    const slowResources = resources.filter(resource => {
      const duration = resource.responseEnd - resource.requestStart;
      return duration > 2000; // Resources taking more than 2 seconds
    });

    if (slowResources.length > 0) {
      console.warn('Slow resources detected:', slowResources.length);
      this.reportMetric('slow_resources', slowResources.length);
    }

    // Analyze resource sizes
    const largeResources = resources.filter(resource => {
      return resource.transferSize > 1024 * 1024; // Resources larger than 1MB
    });

    if (largeResources.length > 0) {
      console.warn('Large resources detected:', largeResources.length);
      this.reportMetric('large_resources', largeResources.length);
    }
  }

  private updateMetric(key: string, value: any): void {
    const currentMetrics = this.metrics.get(window.location.pathname) || {} as any;
    currentMetrics[key] = value;
    this.metrics.set(window.location.pathname, currentMetrics);
  }

  private reportMetric(metricName: string, value: any): void {
    // Send metrics to analytics service
    // PerformanceService.trackMetric(metricName, value, {
    //   page: window.location.pathname,
    //   userAgent: navigator.userAgent,
    //   timestamp: Date.now(),
    // });

    // Check against thresholds and report issues
    this.checkPerformanceThresholds(metricName, value);
  }

  private checkPerformanceThresholds(metricName: string, value: number): void {
    const thresholds = PERFORMANCE_THRESHOLDS[metricName as keyof PerformanceThresholds];

    if (thresholds) {
      let status: 'good' | 'needs-improvement' | 'poor';

      if (value <= thresholds.good) {
        status = 'good';
      } else if (value <= thresholds.poor) {
        status = 'needs-improvement';
      } else {
        status = 'poor';
      }

      if (status !== 'good') {
        console.warn(`Poor ${metricName} performance:`, value, `(${status})`);
        // PerformanceService.trackPerformanceIssue(metricName, value, status);
      }
    }
  }

  getMetrics(page?: string): PerformanceMetrics | null {
    return this.metrics.get(page || window.location.pathname) || null;
  }

  getAllMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }

  clearMetrics(): void {
    this.metrics.clear();
  }

  // Public API for manual measurements
  measureStart(name: string): void {
    if ('mark' in performance) {
      performance.mark(`${name}-start`);
    }
  }

  measureEnd(name: string): number | null {
    if ('mark' in performance && 'measure' in performance) {
      try {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        const measure = performance.getEntriesByName(name)[0];
        return measure.duration;
      } catch (error) {
        console.warn('Performance measurement failed:', error);
        return null;
      }
    }
    return null;
  }

  // User Experience tracking
  trackUserInteraction(interaction: string, duration?: number): void {
    // PerformanceService.trackUserInteraction(interaction, {
    //   duration,
    //   page: window.location.pathname,
    //   timestamp: Date.now(),
    // });
  }

  trackError(error: Error, context?: any): void {
    // PerformanceService.trackError(error, {
    //   page: window.location.pathname,
    //   userAgent: navigator.userAgent,
    //   timestamp: Date.now(),
    //   ...context,
    // });
  }

  trackRouteChange(from: string, to: string, duration?: number): void {
    // PerformanceService.trackRouteChange(from, to, {
    //   duration,
    //   timestamp: Date.now(),
    // });
  }
}
