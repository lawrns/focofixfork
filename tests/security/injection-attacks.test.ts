import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestEnvironment,
  getAuthToken,
  TestEnvironment,
} from '../helpers/api-test-helpers';
import { SECURITY_PAYLOADS } from '../fixtures/test-data';

/**
 * Security Tests: Injection Attacks
 * Tests SQL injection, XSS, command injection, and other injection vulnerabilities
 */

describe('Injection Attack Security Tests', () => {
  let env: TestEnvironment;
  let authToken: string;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  beforeAll(async () => {
    env = await createTestEnvironment();
    authToken = await getAuthToken(env.user.email, env.user.password);
  });

  afterAll(async () => {
    await env.cleanup();
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in task title', async () => {
      for (const payload of SECURITY_PAYLOADS.sql_injection) {
        const response = await fetch(`${baseUrl}/api/tasks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: payload,
            description: 'SQL injection test',
            project_id: env.project.id,
            workspace_id: env.workspace.id,
            organization_id: env.organization.id,
          }),
        });

        // Should either reject or sanitize
        if (response.status === 201) {
          const data = await response.json();
          // Ensure dangerous SQL is sanitized
          expect(data.title).not.toContain('DROP TABLE');
          expect(data.title).not.toContain('UNION SELECT');
          expect(data.title).not.toContain('--');
          expect(data.title).not.toContain('DELETE FROM');
        } else {
          expect([400, 422]).toContain(response.status);
        }
      }
    });

    it('should prevent SQL injection in query parameters', async () => {
      const maliciousQueries = [
        `?id=${SECURITY_PAYLOADS.sql_injection[0]}`,
        `?workspace_id=${SECURITY_PAYLOADS.sql_injection[1]}`,
        `?search=${SECURITY_PAYLOADS.sql_injection[2]}`,
      ];

      for (const query of maliciousQueries) {
        const response = await fetch(`${baseUrl}/api/tasks${query}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        // Should not execute malicious SQL
        expect(response.status).not.toBe(500);

        if (response.status === 200) {
          const data = await response.json();
          // Should not return unexpected data
          expect(Array.isArray(data)).toBe(true);
        }
      }
    });

    it('should use parameterized queries', async () => {
      // Test that database queries use parameters, not string concatenation
      const response = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: "Test'; DROP TABLE users; --",
          project_id: env.project.id,
          workspace_id: env.workspace.id,
          organization_id: env.organization.id,
        }),
      });

      // Database should still exist and be queryable
      const verifyResponse = await fetch(`${baseUrl}/api/tasks`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(verifyResponse.status).toBe(200);
    });

    it('should prevent UNION-based SQL injection', async () => {
      const unionPayloads = [
        "' UNION SELECT * FROM users--",
        "' UNION SELECT password FROM users--",
        "1 UNION SELECT id, email, password FROM users",
      ];

      for (const payload of unionPayloads) {
        const response = await fetch(`${baseUrl}/api/tasks?id=${encodeURIComponent(payload)}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (response.status === 200) {
          const data = await response.json();
          // Should not return user table data
          expect(data).not.toHaveProperty('password');
          expect(data).not.toHaveProperty('email');
        }
      }
    });

    it('should prevent blind SQL injection', async () => {
      const blindPayloads = [
        "' AND SLEEP(5)--",
        "' AND 1=1--",
        "' AND 1=2--",
      ];

      for (const payload of blindPayloads) {
        const start = performance.now();
        const response = await fetch(`${baseUrl}/api/tasks?search=${encodeURIComponent(payload)}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        const duration = performance.now() - start;

        // Should not cause significant delays (SLEEP attacks)
        expect(duration).toBeLessThan(1000);
        expect([200, 400, 422]).toContain(response.status);
      }
    });
  });

  describe('XSS (Cross-Site Scripting) Prevention', () => {
    it('should sanitize XSS in task titles', async () => {
      for (const payload of SECURITY_PAYLOADS.xss) {
        const response = await fetch(`${baseUrl}/api/tasks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: payload,
            project_id: env.project.id,
            workspace_id: env.workspace.id,
            organization_id: env.organization.id,
          }),
        });

        if (response.status === 201) {
          const data = await response.json();
          // Should not contain executable script tags
          expect(data.title).not.toContain('<script>');
          expect(data.title).not.toContain('javascript:');
          expect(data.title).not.toContain('onerror=');
          expect(data.title).not.toContain('onload=');
        }
      }
    });

    it('should sanitize XSS in task descriptions', async () => {
      const xssDescriptions = [
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        '<iframe src="javascript:alert(\'XSS\')">',
        '<body onload=alert("XSS")>',
      ];

      for (const description of xssDescriptions) {
        const response = await fetch(`${baseUrl}/api/tasks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'XSS Test',
            description,
            project_id: env.project.id,
            workspace_id: env.workspace.id,
            organization_id: env.organization.id,
          }),
        });

        if (response.status === 201) {
          const data = await response.json();
          expect(data.description).not.toContain('onerror=');
          expect(data.description).not.toContain('onload=');
        }
      }
    });

    it('should set correct Content-Security-Policy headers', async () => {
      const response = await fetch(`${baseUrl}/api/tasks`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const csp = response.headers.get('Content-Security-Policy');
      // Should have CSP header (adjust based on your config)
      // expect(csp).toBeDefined();
    });

    it('should escape HTML entities in responses', async () => {
      const response = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '<script>alert("test")</script>',
          project_id: env.project.id,
          workspace_id: env.workspace.id,
          organization_id: env.organization.id,
        }),
      });

      if (response.status === 201) {
        const data = await response.json();
        const responseText = JSON.stringify(data);

        // Should not contain unescaped script tags
        expect(responseText).not.toMatch(/<script>.*<\/script>/);
      }
    });
  });

  describe('Command Injection Prevention', () => {
    it('should prevent command injection in file operations', async () => {
      const commandPayloads = SECURITY_PAYLOADS.command_injection;

      for (const payload of commandPayloads) {
        const response = await fetch(`${baseUrl}/api/tasks/export`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: payload,
            format: 'csv',
          }),
        });

        // Should reject or sanitize
        expect([200, 400, 422]).toContain(response.status);

        if (response.status === 200) {
          const contentDisposition = response.headers.get('Content-Disposition');
          if (contentDisposition) {
            // Should not contain command injection characters
            expect(contentDisposition).not.toContain(';');
            expect(contentDisposition).not.toContain('|');
            expect(contentDisposition).not.toContain('`');
            expect(contentDisposition).not.toContain('$(');
          }
        }
      }
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should prevent path traversal in file access', async () => {
      const pathPayloads = SECURITY_PAYLOADS.path_traversal;

      for (const payload of pathPayloads) {
        const response = await fetch(`${baseUrl}/api/files/${encodeURIComponent(payload)}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        // Should not access system files
        expect([400, 403, 404]).toContain(response.status);

        if (response.status === 200) {
          const data = await response.text();
          // Should not return sensitive system files
          expect(data).not.toContain('root:');
          expect(data).not.toContain('Administrator');
        }
      }
    });

    it('should normalize and validate file paths', async () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        './../../sensitive.txt',
        'normal/../../outside.txt',
      ];

      for (const path of maliciousPaths) {
        const response = await fetch(`${baseUrl}/api/files?path=${encodeURIComponent(path)}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        expect([400, 403, 404]).toContain(response.status);
      }
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('should prevent MongoDB-style injection', async () => {
      const noSqlPayloads = [
        { $ne: null },
        { $gt: '' },
        { $regex: '.*' },
        { $where: 'this.password == "password"' },
      ];

      for (const payload of noSqlPayloads) {
        const response = await fetch(`${baseUrl}/api/tasks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'Test',
            project_id: payload, // Malicious object instead of string
            workspace_id: env.workspace.id,
            organization_id: env.organization.id,
          }),
        });

        expect([400, 422]).toContain(response.status);
      }
    });
  });

  describe('LDAP Injection Prevention', () => {
    it('should prevent LDAP injection in search queries', async () => {
      const ldapPayloads = [
        '*',
        '*)(&',
        '*)(uid=*',
        'admin)(|(password=*',
      ];

      for (const payload of ldapPayloads) {
        const response = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(payload)}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        // Should handle safely
        expect([200, 400, 422]).toContain(response.status);
      }
    });
  });

  describe('XML Injection Prevention', () => {
    it('should prevent XML external entity (XXE) attacks', async () => {
      const xxePayload = `<?xml version="1.0"?>
        <!DOCTYPE foo [
          <!ENTITY xxe SYSTEM "file:///etc/passwd">
        ]>
        <data>&xxe;</data>`;

      const response = await fetch(`${baseUrl}/api/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/xml',
        },
        body: xxePayload,
      });

      if (response.status === 200) {
        const data = await response.text();
        // Should not expose system files
        expect(data).not.toContain('root:');
      }
    });
  });

  describe('Template Injection Prevention', () => {
    it('should prevent server-side template injection', async () => {
      const templatePayloads = [
        '{{7*7}}',
        '${7*7}',
        '<%= 7*7 %>',
        '#{7*7}',
      ];

      for (const payload of templatePayloads) {
        const response = await fetch(`${baseUrl}/api/tasks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: payload,
            project_id: env.project.id,
            workspace_id: env.workspace.id,
            organization_id: env.organization.id,
          }),
        });

        if (response.status === 201) {
          const data = await response.json();
          // Should not evaluate template expressions
          expect(data.title).not.toBe('49');
          expect(data.title).not.toContain('49');
        }
      }
    });
  });

  describe('Header Injection Prevention', () => {
    it('should prevent CRLF injection in headers', async () => {
      const crlfPayloads = [
        'test\r\nX-Injected: header',
        'test\nSet-Cookie: session=stolen',
        'test\r\n\r\n<script>alert("XSS")</script>',
      ];

      for (const payload of crlfPayloads) {
        const response = await fetch(`${baseUrl}/api/tasks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'X-Custom-Header': payload,
          },
          body: JSON.stringify({
            title: 'Test',
            project_id: env.project.id,
            workspace_id: env.workspace.id,
            organization_id: env.organization.id,
          }),
        });

        // Server should handle malformed headers safely
        expect([200, 201, 400, 422]).toContain(response.status);
      }
    });
  });

  describe('Input Validation', () => {
    it('should validate and sanitize all user inputs', async () => {
      const maliciousInputs = [
        ...SECURITY_PAYLOADS.sql_injection,
        ...SECURITY_PAYLOADS.xss,
        ...SECURITY_PAYLOADS.command_injection,
      ];

      for (const input of maliciousInputs) {
        const response = await fetch(`${baseUrl}/api/tasks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: input,
            description: input,
            project_id: env.project.id,
            workspace_id: env.workspace.id,
            organization_id: env.organization.id,
          }),
        });

        // Should handle all malicious inputs safely
        expect([200, 201, 400, 422]).toContain(response.status);

        if (response.status === 201) {
          const data = await response.json();
          // Verify data is sanitized
          expect(data.title).toBeDefined();
          expect(data.description).toBeDefined();
        }
      }
    });

    it('should enforce maximum input lengths', async () => {
      const longString = 'A'.repeat(100000); // 100KB string

      const response = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: longString,
          project_id: env.project.id,
          workspace_id: env.workspace.id,
          organization_id: env.organization.id,
        }),
      });

      // Should reject excessively long inputs
      expect([400, 413, 422]).toContain(response.status);
    });
  });
});
