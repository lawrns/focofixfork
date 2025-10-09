import { supabase } from '@/lib/supabase-client';

export interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  databaseQueryTime: number;
  memoryUsage: number;
  networkRequests: number;
  errorRate: number;
  userSatisfaction: number;
  timestamp: string;
}

export interface PagePerformanceData {
  page: string;
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timestamp: string;
}

export interface APIPerformanceData {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  error?: string;
  timestamp: string;
}

export interface PerformanceReport {
  summary: {
    averagePageLoadTime: number;
    averageAPIResponseTime: number;
    errorRate: number;
    uptimePercentage: number;
    totalRequests: number;
  };
  pageMetrics: PagePerformanceData[];
  apiMetrics: APIPerformanceData[];
  trends: {
    pageLoadTimeTrend: number[];
    apiResponseTimeTrend: number[];
    errorRateTrend: number[];
  };
  recommendations: string[];
}

export class PerformanceService {
  private static metrics: PerformanceMetrics[] = [];
  private static pageMetrics: PagePerformanceData[] = [];
  private static apiMetrics: APIPerformanceData[] = [];

  // Track page performance
  static trackPagePerformance(page: string): void {
    if (typeof window === 'undefined') return;

    // Use Performance API
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintEntries = performance.getEntriesByType('paint');

    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0;
    const largestContentfulPaint = performance.getEntriesByType('largest-contentful-paint')[0]?.startTime || 0;

    // Calculate CLS (Cumulative Layout Shift)
    let clsValue = 0;
    const layoutShiftEntries = performance.getEntriesByType('layout-shift');
    layoutShiftEntries.forEach((entry: any) => {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
      }
    });

    // Calculate FID (First Input Delay)
    let fidValue = 0;
    const fidEntries = performance.getEntriesByType('first-input');
    if (fidEntries.length > 0) {
      const fidEntry = fidEntries[0] as any;
      fidValue = fidEntry.processingStart - fidEntry.startTime;
    }

    const pageMetric: PagePerformanceData = {
      page,
      loadTime: navigation.loadEventEnd - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      firstPaint,
      largestContentfulPaint,
      cumulativeLayoutShift: clsValue,
      firstInputDelay: fidValue,
      timestamp: new Date().toISOString(),
    };

    this.pageMetrics.push(pageMetric);

    // Keep only last 100 entries
    if (this.pageMetrics.length > 100) {
      this.pageMetrics = this.pageMetrics.slice(-100);
    }
  }

  // Track API performance
  static trackAPIPerformance(endpoint: string, method: string, responseTime: number, statusCode: number, error?: string): void {
    const apiMetric: APIPerformanceData = {
      endpoint,
      method,
      responseTime,
      statusCode,
      error,
      timestamp: new Date().toISOString(),
    };

    this.apiMetrics.push(apiMetric);

    // Keep only last 500 entries
    if (this.apiMetrics.length > 500) {
      this.apiMetrics = this.apiMetrics.slice(-500);
    }
  }

  // Get performance report
  static async getPerformanceReport(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<PerformanceReport> {
    const now = Date.now();
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[timeRange];

    const startTime = now - timeRangeMs;

    // Filter metrics by time range
    const recentPageMetrics = this.pageMetrics.filter(m => new Date(m.timestamp).getTime() >= startTime);
    const recentAPIMetrics = this.apiMetrics.filter(m => new Date(m.timestamp).getTime() >= startTime);

    // Calculate summary statistics
    const averagePageLoadTime = recentPageMetrics.length > 0
      ? recentPageMetrics.reduce((sum, m) => sum + m.loadTime, 0) / recentPageMetrics.length
      : 0;

    const averageAPIResponseTime = recentAPIMetrics.length > 0
      ? recentAPIMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentAPIMetrics.length
      : 0;

    const errorCount = recentAPIMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = recentAPIMetrics.length > 0 ? (errorCount / recentAPIMetrics.length) * 100 : 0;

    // Calculate uptime (mock - in real app would track actual uptime)
    const uptimePercentage = Math.max(0, 100 - errorRate);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      averagePageLoadTime,
      averageAPIResponseTime,
      errorRate,
      recentPageMetrics,
      recentAPIMetrics
    );

    // Calculate trends (simplified - last 10 data points each)
    const pageLoadTimeTrend = recentPageMetrics.slice(-10).map(m => m.loadTime);
    const apiResponseTimeTrend = recentAPIMetrics.slice(-10).map(m => m.responseTime);
    const errorRateTrend = this.calculateErrorRateTrend(recentAPIMetrics);

    return {
      summary: {
        averagePageLoadTime,
        averageAPIResponseTime,
        errorRate,
        uptimePercentage,
        totalRequests: recentAPIMetrics.length,
      },
      pageMetrics: recentPageMetrics.slice(-50), // Last 50 entries
      apiMetrics: recentAPIMetrics.slice(-100), // Last 100 entries
      trends: {
        pageLoadTimeTrend,
        apiResponseTimeTrend,
        errorRateTrend,
      },
      recommendations,
    };
  }

  // Generate performance recommendations
  private static generateRecommendations(
    avgPageLoadTime: number,
    avgAPIResponseTime: number,
    errorRate: number,
    pageMetrics: PagePerformanceData[],
    apiMetrics: APIPerformanceData[]
  ): string[] {
    const recommendations: string[] = [];

    // Page load time recommendations
    if (avgPageLoadTime > 3000) {
      recommendations.push('Page load time is high. Consider optimizing images, reducing bundle size, and implementing code splitting.');
    }

    if (avgPageLoadTime > 2000) {
      recommendations.push('Consider implementing caching strategies and lazy loading for better performance.');
    }

    // API response time recommendations
    if (avgAPIResponseTime > 1000) {
      recommendations.push('API response times are slow. Optimize database queries and consider implementing caching.');
    }

    if (avgAPIResponseTime > 500) {
      recommendations.push('Consider adding database indexes and optimizing API endpoints.');
    }

    // Error rate recommendations
    if (errorRate > 5) {
      recommendations.push('Error rate is high. Review error logs and implement better error handling.');
    }

    // Core Web Vitals recommendations
    const avgCLS = pageMetrics.reduce((sum, m) => sum + m.cumulativeLayoutShift, 0) / pageMetrics.length;
    if (avgCLS > 0.1) {
      recommendations.push('Layout shift is high. Fix positioning and sizing issues to improve user experience.');
    }

    const avgFID = pageMetrics.reduce((sum, m) => sum + m.firstInputDelay, 0) / pageMetrics.length;
    if (avgFID > 100) {
      recommendations.push('First input delay is high. Reduce JavaScript execution time and optimize event handlers.');
    }

    // Default recommendations
    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! Continue monitoring and optimizing as your application grows.');
    }

    return recommendations;
  }

  // Calculate error rate trend
  private static calculateErrorRateTrend(apiMetrics: APIPerformanceData[]): number[] {
    const chunks = 10;
    const chunkSize = Math.ceil(apiMetrics.length / chunks);
    const trend: number[] = [];

    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, apiMetrics.length);
      const chunk = apiMetrics.slice(start, end);

      const errorCount = chunk.filter(m => m.statusCode >= 400).length;
      const errorRate = chunk.length > 0 ? (errorCount / chunk.length) * 100 : 0;
      trend.push(errorRate);
    }

    return trend;
  }

  // Export performance data
  static async exportPerformanceData(): Promise<void> {
    const report = await this.getPerformanceReport('30d');

    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `foco-performance-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Clear performance data
  static clearPerformanceData(): void {
    this.metrics = [];
    this.pageMetrics = [];
    this.apiMetrics = [];
  }

  // Get real-time performance metrics
  static getRealTimeMetrics(): PerformanceMetrics {
    if (typeof window === 'undefined') {
      return {
        pageLoadTime: 0,
        apiResponseTime: 0,
        databaseQueryTime: 0,
        memoryUsage: 0,
        networkRequests: 0,
        errorRate: 0,
        userSatisfaction: 0,
        timestamp: new Date().toISOString(),
      };
    }

    // Get basic memory info
    const memory = (performance as any).memory;
    const memoryUsage = memory ? (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100 : 0;

    // Get network requests
    const networkRequests = performance.getEntriesByType('resource').length;

    return {
      pageLoadTime: this.pageMetrics.length > 0 ? this.pageMetrics[this.pageMetrics.length - 1].loadTime : 0,
      apiResponseTime: this.apiMetrics.length > 0 ? this.apiMetrics[this.apiMetrics.length - 1].responseTime : 0,
      databaseQueryTime: 0, // Would need database monitoring integration
      memoryUsage,
      networkRequests,
      errorRate: 0, // Would need error tracking integration
      userSatisfaction: 0, // Would need user feedback integration
      timestamp: new Date().toISOString(),
    };
  }
}
