/**
 * API Performance Testing Suite
 * Tests major API endpoints for response times and identifies bottlenecks
 */

import { test, expect } from '@playwright/test';

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  p50: number;
  p95: number;
  p99: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requests: number;
  errors: number;
}

const PERFORMANCE_THRESHOLDS = {
  p50: 200, // 200ms for 50th percentile
  p95: 500, // 500ms for 95th percentile
  p99: 1000, // 1s for 99th percentile
};

async function measureEndpointPerformance(
  page: any,
  endpoint: string,
  method: string = 'GET',
  body?: any,
  iterations: number = 20
): Promise<PerformanceMetrics> {
  const responseTimes: number[] = [];
  let errors = 0;

  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();

    try {
      const response = await page.request[method.toLowerCase()](endpoint, {
        data: body,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (response.status() >= 400) {
        errors++;
      }

      responseTimes.push(responseTime);
    } catch (error) {
      errors++;
      responseTimes.push(10000); // 10s penalty for errors
    }

    // Small delay between requests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Sort for percentile calculations
  responseTimes.sort((a, b) => a - b);

  const p50Index = Math.floor(responseTimes.length * 0.5);
  const p95Index = Math.floor(responseTimes.length * 0.95);
  const p99Index = Math.floor(responseTimes.length * 0.99);

  return {
    endpoint,
    method,
    p50: responseTimes[p50Index],
    p95: responseTimes[p95Index],
    p99: responseTimes[p99Index],
    avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
    minResponseTime: responseTimes[0],
    maxResponseTime: responseTimes[responseTimes.length - 1],
    requests: iterations,
    errors,
  };
}

test.describe('API Performance Analysis', () => {
  let allMetrics: PerformanceMetrics[] = [];

  test.beforeAll(async ({ request }) => {
    console.log('\n🚀 Starting API Performance Analysis...\n');
  });

  test('GET /api/tasks - List tasks performance', async ({ request, page }) => {
    console.log('Testing GET /api/tasks...');

    const metrics = await measureEndpointPerformance(
      page,
      '/api/tasks?limit=100',
      'GET'
    );

    allMetrics.push(metrics);

    console.log(`  p50: ${metrics.p50}ms`);
    console.log(`  p95: ${metrics.p95}ms`);
    console.log(`  p99: ${metrics.p99}ms`);
    console.log(`  Avg: ${Math.round(metrics.avgResponseTime)}ms`);
    console.log(`  Errors: ${metrics.errors}/${metrics.requests}\n`);

    // Performance assertions
    expect(metrics.p50, `p50 should be under ${PERFORMANCE_THRESHOLDS.p50}ms`).toBeLessThan(PERFORMANCE_THRESHOLDS.p50);
    expect(metrics.p95, `p95 should be under ${PERFORMANCE_THRESHOLDS.p95}ms`).toBeLessThan(PERFORMANCE_THRESHOLDS.p95);
    expect(metrics.errors).toBe(0);
  });

  test('GET /api/tasks with filters - Filtered query performance', async ({ request, page }) => {
    console.log('Testing GET /api/tasks with filters...');

    const metrics = await measureEndpointPerformance(
      page,
      '/api/tasks?status=in_progress&limit=50',
      'GET'
    );

    allMetrics.push(metrics);

    console.log(`  p50: ${metrics.p50}ms`);
    console.log(`  p95: ${metrics.p95}ms`);
    console.log(`  p99: ${metrics.p99}ms`);
    console.log(`  Avg: ${Math.round(metrics.avgResponseTime)}ms`);
    console.log(`  Errors: ${metrics.errors}/${metrics.requests}\n`);

    expect(metrics.p50).toBeLessThan(PERFORMANCE_THRESHOLDS.p50);
    expect(metrics.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.p95);
  });

  test('GET /api/projects - List projects performance', async ({ request, page }) => {
    console.log('Testing GET /api/projects...');

    const metrics = await measureEndpointPerformance(
      page,
      '/api/projects?limit=100',
      'GET'
    );

    allMetrics.push(metrics);

    console.log(`  p50: ${metrics.p50}ms`);
    console.log(`  p95: ${metrics.p95}ms`);
    console.log(`  p99: ${metrics.p99}ms`);
    console.log(`  Avg: ${Math.round(metrics.avgResponseTime)}ms`);
    console.log(`  Errors: ${metrics.errors}/${metrics.requests}\n`);

    expect(metrics.p50).toBeLessThan(PERFORMANCE_THRESHOLDS.p50);
    expect(metrics.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.p95);
  });

  test('GET /api/workspaces - List workspaces performance', async ({ request, page }) => {
    console.log('Testing GET /api/workspaces...');

    const metrics = await measureEndpointPerformance(
      page,
      '/api/workspaces',
      'GET'
    );

    allMetrics.push(metrics);

    console.log(`  p50: ${metrics.p50}ms`);
    console.log(`  p95: ${metrics.p95}ms`);
    console.log(`  p99: ${metrics.p99}ms`);
    console.log(`  Avg: ${Math.round(metrics.avgResponseTime)}ms`);
    console.log(`  Errors: ${metrics.errors}/${metrics.requests}\n`);

    expect(metrics.p50).toBeLessThan(PERFORMANCE_THRESHOLDS.p50);
  });

  test('POST /api/tasks - Create task performance', async ({ request, page }) => {
    console.log('Testing POST /api/tasks...');

    const taskBody = {
      title: 'Performance Test Task',
      description: 'Testing task creation performance',
      status: 'backlog',
      priority: 'medium',
      project_id: 'test-project-id',
    };

    const metrics = await measureEndpointPerformance(
      page,
      '/api/tasks',
      'POST',
      taskBody,
      10 // Fewer iterations for write operations
    );

    allMetrics.push(metrics);

    console.log(`  p50: ${metrics.p50}ms`);
    console.log(`  p95: ${metrics.p95}ms`);
    console.log(`  p99: ${metrics.p99}ms`);
    console.log(`  Avg: ${Math.round(metrics.avgResponseTime)}ms`);
    console.log(`  Errors: ${metrics.errors}/${metrics.requests}\n`);

    // More lenient thresholds for write operations
    expect(metrics.p50).toBeLessThan(PERFORMANCE_THRESHOLDS.p50 * 2);
    expect(metrics.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.p95 * 2);
  });

  test('GET /api/activity - Activity feed performance', async ({ request, page }) => {
    console.log('Testing GET /api/activity...');

    const metrics = await measureEndpointPerformance(
      page,
      '/api/activity?limit=50',
      'GET'
    );

    allMetrics.push(metrics);

    console.log(`  p50: ${metrics.p50}ms`);
    console.log(`  p95: ${metrics.p95}ms`);
    console.log(`  p99: ${metrics.p99}ms`);
    console.log(`  Avg: ${Math.round(metrics.avgResponseTime)}ms`);
    console.log(`  Errors: ${metrics.errors}/${metrics.requests}\n`);

    expect(metrics.p50).toBeLessThan(PERFORMANCE_THRESHOLDS.p50);
  });

  test('GET /api/search - Search performance', async ({ request, page }) => {
    console.log('Testing GET /api/search...');

    const metrics = await measureEndpointPerformance(
      page,
      '/api/search?q=test&limit=20',
      'GET'
    );

    allMetrics.push(metrics);

    console.log(`  p50: ${metrics.p50}ms`);
    console.log(`  p95: ${metrics.p95}ms`);
    console.log(`  p99: ${metrics.p99}ms`);
    console.log(`  Avg: ${Math.round(metrics.avgResponseTime)}ms`);
    console.log(`  Errors: ${metrics.errors}/${metrics.requests}\n`);

    // Search can be slower
    expect(metrics.p50).toBeLessThan(PERFORMANCE_THRESHOLDS.p50 * 3);
    expect(metrics.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.p95 * 2);
  });

  test.afterAll(async () => {
    console.log('\n📊 API Performance Summary:\n');
    console.log('═'.repeat(100));
    console.log(
      'Endpoint'.padEnd(40) +
      'Method'.padEnd(8) +
      'p50'.padEnd(10) +
      'p95'.padEnd(10) +
      'p99'.padEnd(10) +
      'Avg'.padEnd(10) +
      'Errors'
    );
    console.log('═'.repeat(100));

    allMetrics.forEach(metric => {
      const warningP50 = metric.p50 > PERFORMANCE_THRESHOLDS.p50 ? '⚠️ ' : '✅ ';
      const warningP95 = metric.p95 > PERFORMANCE_THRESHOLDS.p95 ? '⚠️ ' : '✅ ';
      const warningP99 = metric.p99 > PERFORMANCE_THRESHOLDS.p99 ? '⚠️ ' : '✅ ';

      console.log(
        metric.endpoint.padEnd(40) +
        metric.method.padEnd(8) +
        `${warningP50}${metric.p50}ms`.padEnd(10) +
        `${warningP95}${metric.p95}ms`.padEnd(10) +
        `${warningP99}${metric.p99}ms`.padEnd(10) +
        `${Math.round(metric.avgResponseTime)}ms`.padEnd(10) +
        `${metric.errors}/${metric.requests}`
      );
    });

    console.log('═'.repeat(100));

    // Identify slow endpoints
    const slowEndpoints = allMetrics.filter(
      m => m.p95 > PERFORMANCE_THRESHOLDS.p95 || m.p99 > PERFORMANCE_THRESHOLDS.p99
    );

    if (slowEndpoints.length > 0) {
      console.log('\n⚠️  Slow Endpoints Detected:\n');
      slowEndpoints.forEach(endpoint => {
        console.log(`  ${endpoint.method} ${endpoint.endpoint}`);
        console.log(`    p95: ${endpoint.p95}ms (threshold: ${PERFORMANCE_THRESHOLDS.p95}ms)`);
        console.log(`    p99: ${endpoint.p99}ms (threshold: ${PERFORMANCE_THRESHOLDS.p99}ms)`);
      });
    }

    // Calculate overall API health
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errors, 0);
    const totalRequests = allMetrics.reduce((sum, m) => sum + m.requests, 0);
    const errorRate = (totalErrors / totalRequests) * 100;

    console.log('\n📈 Overall API Health:');
    console.log(`  Total Requests: ${totalRequests}`);
    console.log(`  Total Errors: ${totalErrors}`);
    console.log(`  Error Rate: ${errorRate.toFixed(2)}%`);
    console.log(`  Average p50: ${Math.round(allMetrics.reduce((sum, m) => sum + m.p50, 0) / allMetrics.length)}ms`);
    console.log(`  Average p95: ${Math.round(allMetrics.reduce((sum, m) => sum + m.p95, 0) / allMetrics.length)}ms`);
    console.log(`  Average p99: ${Math.round(allMetrics.reduce((sum, m) => sum + m.p99, 0) / allMetrics.length)}ms\n`);
  });
});
