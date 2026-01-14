# Performance Testing Guide

This guide provides instructions for running the comprehensive performance analysis on the Foco production system.

## Overview

The performance testing suite includes:

1. **API Performance Tests** - Measure endpoint response times (p50, p95, p99)
2. **Frontend Performance Tests** - Analyze Core Web Vitals and page load times
3. **Load Testing** - Test system under concurrent user load
4. **Database Analysis** - Identify missing indexes and N+1 query problems
5. **Bundle Size Analysis** - Analyze JavaScript bundle sizes
6. **Caching Strategy Analysis** - Review caching implementation

## Prerequisites

```bash
# Install dependencies
npm install

# Install k6 for load testing (macOS)
brew install k6

# For other platforms, see: https://k6.io/docs/getting-started/installation/
```

## Running Individual Tests

### 1. API Performance Tests

Tests all major API endpoints for response time performance.

```bash
# Run API performance tests
npm run test:performance

# Or with Playwright directly
playwright test tests/performance/api-performance.test.ts

# Generate HTML report
playwright test tests/performance/api-performance.test.ts --reporter=html
```

**What it tests:**
- GET /api/tasks (list and filtered queries)
- GET /api/projects
- GET /api/workspaces
- POST /api/tasks
- GET /api/activity
- GET /api/search

**Output:** Console report with p50, p95, p99 latencies and recommendations

### 2. Frontend Performance Tests

Measures Core Web Vitals and page load performance.

```bash
# Run frontend performance tests
playwright test tests/performance/frontend-performance.test.ts

# With detailed output
playwright test tests/performance/frontend-performance.test.ts --reporter=list
```

**What it tests:**
- Page load times for /tasks, /tasks/new, /people, /projects
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Total Blocking Time (TBT)
- Cumulative Layout Shift (CLS)
- Bundle sizes (JS, CSS)
- Cache hit rates

**Output:** Console report with Web Vitals metrics and performance budget status

### 3. Load Testing

Tests system performance under concurrent user load using k6.

```bash
# Run load test (local)
k6 run tests/performance/load-test.js

# Run against production (use with caution!)
BASE_URL=https://your-production-url.com k6 run tests/performance/load-test.js

# Run with custom stages
k6 run --stage 30s:10,1m:10,30s:50,1m:50,30s:0 tests/performance/load-test.js
```

**Load test stages:**
1. Ramp up to 10 users (30s)
2. Stay at 10 users (1m)
3. Ramp up to 25 users (30s)
4. Stay at 25 users (1m)
5. Ramp up to 50 users (30s)
6. Stay at 50 users (1m)
7. Ramp down to 0 users (30s)

**What it tests:**
- Multiple user scenarios (list tasks, view details, create tasks, search)
- Response times under load
- Error rates
- System stability

**Output:** Load test summary with request rates, response times, and error rates

### 4. Database Analysis

Analyzes database schema, indexes, and identifies N+1 query problems.

```bash
# Run database analysis
npx ts-node scripts/analyze-database-performance.ts

# Or compile first
npm run build
node dist/scripts/analyze-database-performance.js
```

**What it analyzes:**
- Table statistics and row counts
- Existing and missing indexes
- N+1 query patterns in code
- Connection pooling configuration
- Query optimization opportunities

**Output:** Console report with index recommendations and optimization strategies

### 5. Bundle Size Analysis

Analyzes Next.js bundle sizes and identifies optimization opportunities.

```bash
# Build the project first
npm run build

# Run bundle analysis
node scripts/analyze-bundle-size.js

# Or use Next.js bundle analyzer
npm run analyze
```

**What it analyzes:**
- First Load JS sizes per page
- Total bundle sizes
- Largest pages and dependencies
- Code splitting effectiveness

**Output:** Console report with bundle sizes and optimization recommendations

### 6. Caching Strategy Analysis

Reviews current caching implementation and provides recommendations.

```bash
# Run caching analysis
npx ts-node scripts/analyze-caching-strategy.ts
```

**What it analyzes:**
- API endpoint caching status
- Static asset caching headers
- Database query caching opportunities
- Client-side caching configuration

**Output:** Comprehensive caching strategy report with implementation examples

## Running All Tests

```bash
# Run complete performance analysis suite
npm run build
npm run test:performance
playwright test tests/performance/
k6 run tests/performance/load-test.js
node scripts/analyze-bundle-size.js
npx ts-node scripts/analyze-database-performance.ts
npx ts-node scripts/analyze-caching-strategy.ts
```

## Interpreting Results

### Performance Thresholds

**API Response Times:**
- p50 (50th percentile): < 200ms ✅
- p95 (95th percentile): < 500ms ✅
- p99 (99th percentile): < 1000ms ✅

**Core Web Vitals:**
- First Contentful Paint (FCP): < 1.8s ✅
- Largest Contentful Paint (LCP): < 2.5s ✅
- Time to Interactive (TTI): < 3.8s ✅
- Total Blocking Time (TBT): < 300ms ✅
- Cumulative Layout Shift (CLS): < 0.1 ✅

**Bundle Sizes:**
- First Load JS: < 200 KB ✅
- Page Bundle: < 100 KB ✅

**Load Testing:**
- p95 response time: < 500ms ✅
- p99 response time: < 1000ms ✅
- Error rate: < 5% ✅

### Status Indicators

- ✅ **Green (Good):** Within performance budget
- ⚠️ **Yellow (Warning):** Close to limit, needs monitoring
- 🔴 **Red (Critical):** Exceeds threshold, needs immediate attention

## Continuous Monitoring

### Setting Up CI/CD Performance Tests

Add to your GitHub Actions workflow:

```yaml
name: Performance Tests

on:
  pull_request:
    branches: [main, master]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build

      - name: Run performance tests
        run: |
          npx playwright install --with-deps
          npm run test:performance

      - name: Analyze bundle size
        run: node scripts/analyze-bundle-size.js

      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: playwright-report/
```

### Performance Budgets

Set performance budgets in your CI/CD:

```javascript
// playwright.config.ts
export default {
  use: {
    // Fail tests if response time exceeds threshold
    launchOptions: {
      slowMo: 0, // No artificial delay
    },
  },
  expect: {
    timeout: 5000, // Fail if any operation takes > 5s
  },
};
```

## Troubleshooting

### Test Failures

**"Connection refused" errors:**
- Ensure the dev server is running: `npm run dev`
- Check the BASE_URL environment variable

**"Timeout" errors:**
- Increase timeout in test configuration
- Check network connectivity
- Verify API endpoints are accessible

**"DYNAMIC_SERVER_USAGE" errors during build:**
- This is expected for API routes that use cookies
- These routes are automatically rendered dynamically

### Database Analysis Errors

**"Permission denied" errors:**
- Ensure you have the correct Supabase credentials
- Verify SUPABASE_SERVICE_ROLE_KEY is set
- Check that you have admin access to the database

## Best Practices

1. **Run tests regularly** - Weekly or after major changes
2. **Compare with baselines** - Track performance over time
3. **Test in production-like environment** - Staging with production data size
4. **Monitor real users** - Complement synthetic tests with RUM
5. **Set up alerts** - Get notified when performance degrades

## Next Steps

After running the tests:

1. Review the comprehensive report: `PERFORMANCE_ANALYSIS_REPORT.md`
2. Prioritize optimizations based on impact
3. Implement Phase 1 critical optimizations
4. Re-run tests to validate improvements
5. Set up continuous monitoring

## Support

For questions or issues with performance testing:

1. Check the comprehensive report for recommendations
2. Review test scripts in `/tests/performance/` and `/scripts/`
3. Consult the Performance Analysis Report for optimization strategies

---

**Last Updated:** January 13, 2026
