import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestEnvironment,
  getAuthToken,
  TestEnvironment,
} from '../helpers/api-test-helpers';

/**
 * Load Testing Suite
 * Tests system behavior under various load conditions
 */

describe('Load Testing', () => {
  let env: TestEnvironment;
  let authToken: string;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  beforeAll(async () => {
    env = await createTestEnvironment();
    authToken = await getAuthToken(env.user.email, env.user.password);
  }, 60000);

  afterAll(async () => {
    await env.cleanup();
  });

  describe('Light Load (10 concurrent users)', () => {
    it('should handle 10 concurrent users fetching tasks', async () => {
      const concurrentUsers = 10;
      const startTime = performance.now();

      const requests = Array.from({ length: concurrentUsers }, () =>
        fetch(`${baseUrl}/api/tasks`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
      );

      const responses = await Promise.all(requests);
      const duration = performance.now() - startTime;

      const successCount = responses.filter(r => r.status === 200).length;

      expect(successCount).toBe(concurrentUsers);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`Light load: ${concurrentUsers} requests in ${duration.toFixed(2)}ms`);
    }, 30000);
  });

  describe('Moderate Load (50 concurrent users)', () => {
    it('should handle 50 concurrent users fetching tasks', async () => {
      const concurrentUsers = 50;
      const startTime = performance.now();

      const requests = Array.from({ length: concurrentUsers }, () =>
        fetch(`${baseUrl}/api/tasks`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
      );

      const responses = await Promise.all(requests);
      const duration = performance.now() - startTime;

      const successCount = responses.filter(r => r.status === 200).length;
      const successRate = (successCount / concurrentUsers) * 100;

      expect(successRate).toBeGreaterThan(95); // 95% success rate
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`Moderate load: ${concurrentUsers} requests in ${duration.toFixed(2)}ms`);
      console.log(`Success rate: ${successRate.toFixed(2)}%`);
    }, 60000);
  });

  describe('Heavy Load (100 concurrent users)', () => {
    it('should handle 100 concurrent read operations', async () => {
      const concurrentUsers = 100;
      const startTime = performance.now();

      const requests = Array.from({ length: concurrentUsers }, () =>
        fetch(`${baseUrl}/api/tasks?limit=50`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
      );

      const responses = await Promise.all(requests);
      const duration = performance.now() - startTime;

      const successCount = responses.filter(r => r.status === 200).length;
      const successRate = (successCount / concurrentUsers) * 100;

      expect(successRate).toBeGreaterThan(90); // 90% success rate under heavy load
      expect(duration).toBeLessThan(20000); // Should complete within 20 seconds

      console.log(`Heavy load: ${concurrentUsers} requests in ${duration.toFixed(2)}ms`);
      console.log(`Success rate: ${successRate.toFixed(2)}%`);
    }, 90000);
  });

  describe('Mixed Workload', () => {
    it('should handle mixed read and write operations', async () => {
      const reads = 40;
      const writes = 10;

      const readRequests = Array.from({ length: reads }, () =>
        fetch(`${baseUrl}/api/tasks`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
      );

      const writeRequests = Array.from({ length: writes }, (_, i) =>
        fetch(`${baseUrl}/api/tasks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: `Load Test Task ${i}`,
            project_id: env.project.id,
            workspace_id: env.workspace.id,
            organization_id: env.organization.id,
          }),
        })
      );

      const startTime = performance.now();
      const allRequests = [...readRequests, ...writeRequests];
      const responses = await Promise.all(allRequests);
      const duration = performance.now() - startTime;

      const successCount = responses.filter(r => r.status < 400).length;
      const successRate = (successCount / (reads + writes)) * 100;

      expect(successRate).toBeGreaterThan(90);

      console.log(`Mixed workload: ${reads} reads + ${writes} writes in ${duration.toFixed(2)}ms`);
      console.log(`Success rate: ${successRate.toFixed(2)}%`);
    }, 60000);
  });

  describe('Sustained Load', () => {
    it('should maintain performance over sustained load', async () => {
      const duration = 10000; // 10 seconds
      const requestsPerSecond = 5;
      const interval = 1000 / requestsPerSecond;

      const results: { status: number; responseTime: number }[] = [];
      const startTime = performance.now();

      while (performance.now() - startTime < duration) {
        const reqStart = performance.now();
        const response = await fetch(`${baseUrl}/api/tasks`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const reqDuration = performance.now() - reqStart;

        results.push({
          status: response.status,
          responseTime: reqDuration,
        });

        await new Promise(resolve => setTimeout(resolve, interval));
      }

      const successCount = results.filter(r => r.status === 200).length;
      const avgResponseTime =
        results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

      expect(successCount / results.length).toBeGreaterThan(0.95);
      expect(avgResponseTime).toBeLessThan(1000);

      console.log(`Sustained load: ${results.length} requests over ${duration}ms`);
      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
    }, 15000);
  });

  describe('Spike Test', () => {
    it('should handle sudden traffic spike', async () => {
      // Baseline traffic
      await fetch(`${baseUrl}/api/tasks`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      // Sudden spike
      const spikeRequests = 50;
      const startTime = performance.now();

      const requests = Array.from({ length: spikeRequests }, () =>
        fetch(`${baseUrl}/api/tasks`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
      );

      const responses = await Promise.all(requests);
      const duration = performance.now() - startTime;

      const successCount = responses.filter(r => r.status === 200).length;
      const successRate = (successCount / spikeRequests) * 100;

      // System should gracefully handle spike
      expect(successRate).toBeGreaterThan(80); // 80% success during spike

      console.log(`Spike test: ${spikeRequests} concurrent requests`);
      console.log(`Duration: ${duration.toFixed(2)}ms`);
      console.log(`Success rate: ${successRate.toFixed(2)}%`);
    }, 60000);
  });

  describe('Stress Test', () => {
    it('should identify breaking point', async () => {
      const increments = [10, 25, 50, 75, 100];
      const results: { load: number; successRate: number; avgTime: number }[] = [];

      for (const load of increments) {
        const startTime = performance.now();

        const requests = Array.from({ length: load }, () =>
          fetch(`${baseUrl}/api/tasks`, {
            headers: { Authorization: `Bearer ${authToken}` },
          })
        );

        const responses = await Promise.all(requests);
        const duration = performance.now() - startTime;

        const successCount = responses.filter(r => r.status === 200).length;
        const successRate = (successCount / load) * 100;
        const avgTime = duration / load;

        results.push({ load, successRate, avgTime });

        console.log(`Load: ${load}, Success Rate: ${successRate.toFixed(2)}%, Avg Time: ${avgTime.toFixed(2)}ms`);

        // Stop if success rate drops below 50%
        if (successRate < 50) {
          console.log(`Breaking point identified at ${load} concurrent requests`);
          break;
        }

        // Cool down between increments
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // System should handle at least 25 concurrent requests
      const lowLoadResult = results.find(r => r.load === 25);
      if (lowLoadResult) {
        expect(lowLoadResult.successRate).toBeGreaterThan(90);
      }
    }, 120000);
  });

  describe('Resource Exhaustion', () => {
    it('should handle memory-intensive operations', async () => {
      // Request large datasets
      const response = await fetch(`${baseUrl}/api/tasks?limit=1000`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle CPU-intensive operations', async () => {
      // Request operations that require processing
      const response = await fetch(`${baseUrl}/api/analytics/report`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      // Should complete without timing out
      expect([200, 404]).toContain(response.status);
    });
  });
});
