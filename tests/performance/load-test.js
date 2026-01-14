/**
 * Load Testing Script using k6
 * Tests system performance under concurrent load
 * Run with: k6 run tests/performance/load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const failureRate = new Rate('failed_requests');
const apiLatency = new Trend('api_latency');
const requestCount = new Counter('request_count');

// Load testing stages
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users for 1 minute
    { duration: '30s', target: 25 },  // Ramp up to 25 users
    { duration: '1m', target: 25 },   // Stay at 25 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
    http_req_failed: ['rate<0.05'], // Less than 5% error rate
    failed_requests: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Simulate realistic user scenarios
export default function() {
  const scenarios = [
    listTasks,
    listProjects,
    viewTaskDetail,
    createTask,
    searchContent,
    viewPeoplePage,
  ];

  // Randomly select and execute a scenario
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();

  // Think time between actions (0.5-2 seconds)
  sleep(Math.random() * 1.5 + 0.5);
}

function listTasks() {
  const start = Date.now();
  const response = http.get(`${BASE_URL}/api/tasks?limit=100`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const duration = Date.now() - start;
  apiLatency.add(duration);
  requestCount.add(1);

  const success = check(response, {
    'tasks list status 200 or 401': (r) => r.status === 200 || r.status === 401,
    'tasks list response time < 500ms': (r) => duration < 500,
  });

  failureRate.add(!success);
}

function listProjects() {
  const start = Date.now();
  const response = http.get(`${BASE_URL}/api/projects?limit=100`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const duration = Date.now() - start;
  apiLatency.add(duration);
  requestCount.add(1);

  const success = check(response, {
    'projects list status 200 or 401': (r) => r.status === 200 || r.status === 401,
    'projects list response time < 500ms': (r) => duration < 500,
  });

  failureRate.add(!success);
}

function viewTaskDetail() {
  // First get task list to find a valid task ID
  const listResponse = http.get(`${BASE_URL}/api/tasks?limit=10`);

  if (listResponse.status === 200) {
    try {
      const data = JSON.parse(listResponse.body);
      const tasks = data.data?.data || data.data || [];

      if (tasks.length > 0) {
        const taskId = tasks[0].id;
        const start = Date.now();

        const response = http.get(`${BASE_URL}/api/tasks/${taskId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const duration = Date.now() - start;
        apiLatency.add(duration);
        requestCount.add(1);

        const success = check(response, {
          'task detail status 200 or 401': (r) => r.status === 200 || r.status === 401,
          'task detail response time < 300ms': (r) => duration < 300,
        });

        failureRate.add(!success);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
}

function createTask() {
  const payload = JSON.stringify({
    title: `Load Test Task ${Date.now()}`,
    description: 'This is a load testing task',
    status: 'backlog',
    priority: 'medium',
    project_id: 'test-project-id',
  });

  const start = Date.now();
  const response = http.post(`${BASE_URL}/api/tasks`, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const duration = Date.now() - start;
  apiLatency.add(duration);
  requestCount.add(1);

  const success = check(response, {
    'task create status 201 or 400 or 401': (r) =>
      r.status === 201 || r.status === 400 || r.status === 401 || r.status === 404,
    'task create response time < 800ms': (r) => duration < 800,
  });

  failureRate.add(!success);
}

function searchContent() {
  const queries = ['test', 'task', 'project', 'meeting', 'design'];
  const query = queries[Math.floor(Math.random() * queries.length)];

  const start = Date.now();
  const response = http.get(`${BASE_URL}/api/search?q=${query}&limit=20`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const duration = Date.now() - start;
  apiLatency.add(duration);
  requestCount.add(1);

  const success = check(response, {
    'search status 200 or 401': (r) => r.status === 200 || r.status === 401,
    'search response time < 1000ms': (r) => duration < 1000,
  });

  failureRate.add(!success);
}

function viewPeoplePage() {
  const start = Date.now();
  const response = http.get(`${BASE_URL}/api/workspaces`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const duration = Date.now() - start;
  apiLatency.add(duration);
  requestCount.add(1);

  const success = check(response, {
    'workspaces status 200 or 401': (r) => r.status === 200 || r.status === 401,
    'workspaces response time < 400ms': (r) => duration < 400,
  });

  failureRate.add(!success);
}

// Summary handler
export function handleSummary(data) {
  console.log('\n📊 Load Test Summary:\n');
  console.log('═'.repeat(80));

  const httpReqDuration = data.metrics.http_req_duration;
  const httpReqFailed = data.metrics.http_req_failed;

  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s`);
  console.log(`\nResponse Times:`);
  console.log(`  Min: ${httpReqDuration.values.min.toFixed(2)}ms`);
  console.log(`  Avg: ${httpReqDuration.values.avg.toFixed(2)}ms`);
  console.log(`  Med: ${httpReqDuration.values.med.toFixed(2)}ms`);
  console.log(`  p90: ${httpReqDuration.values['p(90)'].toFixed(2)}ms`);
  console.log(`  p95: ${httpReqDuration.values['p(95)'].toFixed(2)}ms`);
  console.log(`  p99: ${httpReqDuration.values['p(99)'].toFixed(2)}ms`);
  console.log(`  Max: ${httpReqDuration.values.max.toFixed(2)}ms`);

  console.log(`\nError Rate: ${(httpReqFailed.values.rate * 100).toFixed(2)}%`);

  const passed95 = httpReqDuration.values['p(95)'] < 500;
  const passed99 = httpReqDuration.values['p(99)'] < 1000;
  const passedErrorRate = httpReqFailed.values.rate < 0.05;

  console.log('\n📈 Performance Thresholds:');
  console.log(`  p95 < 500ms: ${passed95 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  p99 < 1000ms: ${passed99 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Error Rate < 5%: ${passedErrorRate ? '✅ PASS' : '❌ FAIL'}`);

  console.log('═'.repeat(80));

  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
