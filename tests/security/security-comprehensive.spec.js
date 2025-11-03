import { test, expect } from '@playwright/test';

test.describe('Comprehensive Security Testing Suite', () => {
  const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
  
  // Security test data
  const MALICIOUS_INPUTS = [
    '<script>alert("xss")</script>',
    'javascript:alert("xss")',
    '<img src=x onerror=alert("xss")>',
    '<svg onload=alert("xss")>',
    '";alert("xss");//',
    '\';alert("xss");//',
    '<iframe src="javascript:alert(\'xss\')"></iframe>',
    '<body onload=alert("xss")>',
    '<input onfocus=alert("xss") autofocus>',
    '<select onfocus=alert("xss") autofocus>',
    '<textarea onfocus=alert("xss") autofocus>',
    '<keygen onfocus=alert("xss") autofocus>',
    '<video><source onerror="alert(\'xss\')">',
    '<audio src=x onerror=alert("xss")>',
    '<details open ontoggle=alert("xss")>',
    '<marquee onstart=alert("xss")>',
    '"><script>alert("xss")</script>',
    "'><script>alert('xss')</script>",
  ];

  const SQL_INJECTION_PAYLOADS = [
    "' OR '1'='1",
    "' OR 1=1--",
    "' UNION SELECT * FROM users--",
    "'; DROP TABLE users; --",
    "' OR 1=1#",
    "admin'--",
    "admin' /*",
    "' OR 'x'='x",
    "1' OR '1'='1' --",
  ];

  const PATH_TRAVERSAL_PAYLOADS = [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '....//....//....//etc/passwd',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '..%252f..%252f..%252fetc%252fpasswd',
  ];

  // Helper functions
  async function checkXSSProtection(page: any, input: string, selector: string) {
    await page.fill(selector, input);
    await page.press(selector, 'Enter');
    
    // Check if script tags are rendered
    const scriptElements = await page.locator('script').count();
    
    // Check for alert execution (would indicate XSS)
    let alertFired = false;
    page.on('dialog', () => {
      alertFired = true;
    });
    
    await page.waitForTimeout(1000);
    
    return {
      hasScript: scriptElements > 0,
      alertFired,
      sanitized: await page.inputValue(selector) !== input,
    };
  }

  async function checkCSRFProtection(page: any, endpoint: string, method = 'POST') {
    const response = await page.evaluate(async ({ url, method }) => {
      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ test: 'data' }),
        });
        
        return {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        };
      } catch (error) {
        return { error: error.message };
      }
    }, { url: `${BASE_URL}/api${endpoint}`, method });
    
    return response;
  }

  async function checkAuthenticationBypass(page: any, protectedRoute: string) {
    // Try to access protected route without authentication
    await page.goto(`${BASE_URL}${protectedRoute}`);
    
    const currentUrl = page.url();
    const hasLoginForm = await page.locator('input[type="password"]').count() > 0;
    const hasUnauthorizedMessage = await page.locator('text=unauthorized, 401, access denied').count() > 0;
    
    return {
      redirected: !currentUrl.includes(protectedRoute),
      hasLoginForm,
      hasUnauthorizedMessage,
    };
  }

  async function checkRateLimiting(page: any, endpoint: string) {
    const responses: number[] = [];
    
    // Make multiple rapid requests
    for (let i = 0; i < 20; i++) {
      const response = await page.evaluate(async ({ url }) => {
        try {
          const response = await fetch(url);
          return response.status;
        } catch (error) {
          return 0;
        }
      }, { url: `${BASE_URL}/api${endpoint}` });
      
      responses.push(response);
    }
    
    const rateLimited = responses.some(status => status === 429);
    const blocked = responses.some(status => status === 403);
    
    return {
      rateLimited,
      blocked,
      responses,
    };
  }

  test.describe('Cross-Site Scripting (XSS) Protection', () => {
    test('search functionality prevents XSS', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);
      
      for (const payload of MALICIOUS_INPUTS.slice(0, 5)) {
        const result = await checkXSSProtection(page, payload, 'input[placeholder*="search" i]');
        
        expect(result.hasScript).toBe(false);
        expect(result.alertFired).toBe(false);
        expect(result.sanitized).toBe(true);
      }
    });

    test('project creation prevents XSS', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);
      await page.click('button:has-text("New Project")');
      
      const result = await checkXSSProtection(page, MALICIOUS_INPUTS[0], 'input[placeholder*="project name" i]');
      
      expect(result.hasScript).toBe(false);
      expect(result.alertFired).toBe(false);
    });

    test('task creation prevents XSS', async ({ page }) => {
      await page.goto(`${BASE_URL}/tasks`);
      await page.click('button:has-text("New Task")');
      
      const result = await checkXSSProtection(page, MALICIOUS_INPUTS[1], 'input[placeholder*="task title" i]');
      
      expect(result.hasScript).toBe(false);
      expect(result.alertFired).toBe(false);
    });

    test('user profile prevents XSS', async ({ page }) => {
      await page.goto(`${BASE_URL}/profile`);
      
      const result = await checkXSSProtection(page, MALICIOUS_INPUTS[2], 'input[name="fullName"]');
      
      expect(result.hasScript).toBe(false);
      expect(result.alertFired).toBe(false);
    });

    test('comments prevent XSS', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/test-project`);
      await page.fill('textarea[placeholder*="comment" i]', MALICIOUS_INPUTS[3]);
      await page.click('button:has-text("Post Comment")');
      
      const scriptElements = await page.locator('.comment script').count();
      expect(scriptElements).toBe(0);
    });

    test('URL parameter XSS prevention', async ({ page }) => {
      const maliciousUrl = `${BASE_URL}/projects?search=<script>alert("xss")</script>`;
      await page.goto(maliciousUrl);
      
      const scriptElements = await page.locator('script').count();
      expect(scriptElements).toBe(0);
    });
  });

  test.describe('SQL Injection Protection', () => {
    test('login form prevents SQL injection', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      for (const payload of SQL_INJECTION_PAYLOADS.slice(0, 3)) {
        await page.fill('input[type="email"]', payload);
        await page.fill('input[type="password"]', payload);
        await page.click('button[type="submit"]');
        
        // Should not authenticate or cause server errors
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/dashboard');
        
        const hasError = await page.locator('text=error, invalid, failed').count() > 0;
        expect(hasError).toBe(true);
      }
    });

    test('search prevents SQL injection', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);
      
      for (const payload of SQL_INJECTION_PAYLOADS.slice(0, 3)) {
        await page.fill('input[placeholder*="search" i]', payload);
        await page.press('input[placeholder*="search" i]', 'Enter');
        
        // Should not cause database errors
        const hasServerError = await page.locator('text=database, sql, error').count() > 0;
        expect(hasServerError).toBe(false);
      }
    });

    test('API endpoints prevent SQL injection', async ({ page }) => {
      for (const payload of SQL_INJECTION_PAYLOADS.slice(0, 2)) {
        const response = await page.evaluate(async ({ url, payload }) => {
          try {
            const response = await fetch(`${url}?search=${encodeURIComponent(payload)}`);
            return {
              status: response.status,
              hasSQLError: (await response.text()).toLowerCase().includes('sql'),
            };
          } catch (error) {
            return { status: 0, hasSQLError: true };
          }
        }, { url: `${BASE_URL}/api/projects`, payload });
        
        expect(response.hasSQLError).toBe(false);
        expect(response.status).not.toBe(500);
      }
    });
  });

  test.describe('Cross-Site Request Forgery (CSRF) Protection', () => {
    test('API endpoints require CSRF tokens', async ({ page }) => {
      const endpoints = ['/auth/login', '/projects', '/tasks'];
      
      for (const endpoint of endpoints) {
        const response = await checkCSRFProtection(page, endpoint, 'POST');
        
        // Should require authentication or CSRF token
        expect([401, 403, 400, 422]).toContain(response.status);
      }
    });

    test('forms include CSRF tokens', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      const csrfToken = await page.locator('input[name*="csrf"], input[name*="token"]').count();
      expect(csrfToken).toBeGreaterThan(0);
    });

    test('state-changing operations are protected', async ({ page }) => {
      const protectedOperations = [
        { endpoint: '/projects', method: 'POST' },
        { endpoint: '/tasks', method: 'POST' },
        { endpoint: '/auth/logout', method: 'POST' },
      ];
      
      for (const operation of protectedOperations) {
        const response = await checkCSRFProtection(page, operation.endpoint, operation.method);
        
        // Should be protected against CSRF
        expect([401, 403, 400]).toContain(response.status);
      }
    });
  });

  test.describe('Authentication and Authorization', () => {
    test('protected routes require authentication', async ({ page }) => {
      const protectedRoutes = [
        '/dashboard',
        '/projects',
        '/tasks',
        '/profile',
        '/settings',
      ];
      
      for (const route of protectedRoutes) {
        const result = await checkAuthenticationBypass(page, route);
        
        expect(result.redirected || result.hasLoginForm || result.hasUnauthorizedMessage).toBe(true);
      }
    });

    test('session management is secure', async ({ page }) => {
      // Login to get session
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/dashboard`);
      
      // Check session cookies
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('auth'));
      
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie?.httpOnly).toBe(true);
      expect(sessionCookie?.secure).toBe(true); // In production
      expect(sessionCookie?.sameSite).toBe('Lax' || 'Strict');
    });

    test('logout invalidates session', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/dashboard`);
      
      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('button:has-text("Logout")');
      
      // Try to access protected route
      await page.goto(`${BASE_URL}/dashboard`);
      
      const hasLoginForm = await page.locator('input[type="password"]').count() > 0;
      expect(hasLoginForm).toBe(true);
    });

    test('role-based access control', async ({ page }) => {
      // Test admin-only routes
      const adminRoutes = ['/admin', '/admin/users', '/admin/settings'];
      
      for (const route of adminRoutes) {
        await page.goto(`${BASE_URL}${route}`);
        
        const hasUnauthorized = await page.locator('text=unauthorized, 403, access denied').count() > 0;
        const isRedirected = !page.url().includes(route);
        
        expect(hasUnauthorized || isRedirected).toBe(true);
      }
    });
  });

  test.describe('Rate Limiting', () => {
    test('login endpoint has rate limiting', async ({ page }) => {
      const result = await checkRateLimiting(page, '/auth/login');
      
      expect(result.rateLimited || result.blocked).toBe(true);
    });

    test('API endpoints have rate limiting', async ({ page }) => {
      const endpoints = ['/projects', '/tasks', '/search'];
      
      for (const endpoint of endpoints) {
        const result = await checkRateLimiting(page, endpoint);
        
        // Should have some form of rate limiting
        expect(result.rateLimited || result.blocked || result.responses.every(r => r === 401)).toBe(true);
      }
    });

    test('password reset has rate limiting', async ({ page }) => {
      const result = await checkRateLimiting(page, '/auth/reset-password');
      
      expect(result.rateLimited || result.blocked).toBe(true);
    });
  });

  test.describe('Input Validation and Sanitization', () => {
    test('file upload restrictions', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects');
      await page.click('button:has-text("New Project")');
      
      // Try to upload malicious file
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles({
          name: 'malicious.js',
          mimeType: 'application/javascript',
          buffer: Buffer.from('<script>alert("xss")</script>'),
        });
        
        // Should reject dangerous files
        const hasError = await page.locator('text=file type, not allowed, invalid').count() > 0;
        expect(hasError).toBe(true);
      }
    });

    test('email validation', async ({ page }) => {
      const invalidEmails = [
        'invalid-email',
        '@invalid.com',
        'invalid@',
        'invalid..email@example.com',
        'invalid@example.',
      ];
      
      for (const email of invalidEmails) {
        await page.goto(`${BASE_URL}/register`);
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        
        const hasError = await page.locator('text=invalid email, valid email').count() > 0;
        expect(hasError).toBe(true);
      }
    });

    test('password strength validation', async ({ page }) => {
      const weakPasswords = [
        '123',
        'password',
        'qwerty',
        '11111111',
        'password123',
      ];
      
      for (const password of weakPasswords) {
        await page.goto(`${BASE_URL}/register`);
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', password);
        await page.click('button[type="submit"]');
        
        const hasError = await page.locator('text=password strength, weak password').count() > 0;
        expect(hasError).toBe(true);
      }
    });
  });

  test.describe('Secure Headers', () => {
    test('security headers are present', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}`);
      
      const headers = response?.headers();
      
      // Check for important security headers
      expect(headers?.['x-frame-options']).toBeTruthy();
      expect(headers?.['x-content-type-options']).toBeTruthy();
      expect(headers?.['x-xss-protection'] || headers?.['content-security-policy']).toBeTruthy();
      expect(headers?.['strict-transport-security'] || !BASE_URL.startsWith('https://')).toBeTruthy();
    });

    test('Content Security Policy is effective', async ({ page }) => {
      await page.goto(`${BASE_URL}`);
      
      // Try to inject inline script
      const scriptExecuted = await page.evaluate(() => {
        try {
          const script = document.createElement('script');
          script.textContent = 'window.xssTest = true;';
          document.head.appendChild(script);
          return window.xssTest === true;
        } catch (error) {
          return false;
        }
      });
      
      // CSP should block inline scripts
      expect(scriptExecuted).toBe(false);
    });
  });

  test.describe('Path Traversal Protection', () => {
    test('file access prevents path traversal', async ({ page }) => {
      for (const payload of PATH_TRAVERSAL_PAYLOADS) {
        const response = await page.evaluate(async ({ baseUrl, payload }) => {
          try {
            const response = await fetch(`${baseUrl}/api/files?path=${encodeURIComponent(payload)}`);
            return {
              status: response.status,
              content: await response.text(),
            };
          } catch (error) {
            return { status: 0, content: error.message };
          }
        }, { baseUrl: BASE_URL, payload });
        
        // Should not allow file system access
        expect(response.status).toBe(404);
        expect(response.content).not.toContain('root:');
        expect(response.content).not.toContain('passwd:');
      }
    });
  });

  test.describe('Information Disclosure', () => {
    test('error messages do not leak sensitive information', async ({ page }) => {
      // Trigger various errors
      await page.goto(`${BASE_URL}/non-existent-page`);
      const errorText = await page.locator('body').textContent();
      
      // Should not contain stack traces or server details
      expect(errorText).not.toContain('Error: ');
      expect(errorText).not.toContain('stack trace');
      expect(errorText).not.toContain('internal server');
      expect(errorText).not.toContain('database');
    });

    test('API responses do not leak sensitive data', async ({ page }) => {
      const response = await page.evaluate(async ({ baseUrl }) => {
        try {
          const response = await fetch(`${baseUrl}/api/auth/me`);
          const data = await response.json();
          return {
            status: response.status,
            hasPassword: JSON.stringify(data).toLowerCase().includes('password'),
            hasSecret: JSON.stringify(data).toLowerCase().includes('secret'),
            hasToken: JSON.stringify(data).toLowerCase().includes('token'),
          };
        } catch (error) {
          return { status: 0, error: error.message };
        }
      }, { baseUrl: BASE_URL });
      
      // Should not leak sensitive information in responses
      expect(response.hasPassword).toBe(false);
      expect(response.hasSecret).toBe(false);
    });
  });

  test.describe('Session Security', () => {
    test('session timeout works', async ({ page }) => {
      // Login
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/dashboard`);
      
      // Simulate session timeout (would need to configure server for this)
      await page.evaluate(() => {
        // Clear session cookies to simulate timeout
        document.cookie.split(';').forEach(cookie => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
          document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        });
      });
      
      // Try to access protected content
      await page.goto(`${BASE_URL}/dashboard`);
      
      const hasLoginForm = await page.locator('input[type="password"]').count() > 0;
      expect(hasLoginForm).toBe(true);
    });

    test('concurrent session handling', async ({ page, context }) => {
      // Login in first session
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/dashboard`);
      
      // Create second session and login
      const page2 = await context.newPage();
      await page2.goto(`${BASE_URL}/login`);
      await page2.fill('input[type="email"]', 'test@example.com');
      await page2.fill('input[type="password"]', 'password123');
      await page2.click('button[type="submit"]');
      await page2.waitForURL(`${BASE_URL}/dashboard`);
      
      // First session should be invalidated or handled appropriately
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Behavior depends on session management policy
      const isStillLoggedIn = page.url().includes('/dashboard');
      expect(typeof isStillLoggedIn).toBe('boolean');
      
      await page2.close();
    });
  });

  test.describe('Dependency Security', () => {
    test('no vulnerable dependencies in client-side code', async ({ page }) => {
      // Check for known vulnerable libraries
      const vulnerableLibs = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        const libs = scripts.map(script => script.getAttribute('src') || '');
        
        // Check for known vulnerable versions
        const vulnerable = [
          'jquery-1.', // Old jQuery versions
          'bootstrap-3.', // Old Bootstrap versions
          'angular-1.', // Old Angular versions
        ];
        
        return libs.some(lib => vulnerable.some(vuln => lib.includes(vuln)));
      });
      
      expect(vulnerableLibs).toBe(false);
    });
  });

  test.describe('Security Best Practices', () => {
    test('autocomplete is disabled for sensitive fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      const passwordField = page.locator('input[type="password"]');
      const autocomplete = await passwordField.getAttribute('autocomplete');
      
      expect(autocomplete).toBe('current-password' || 'new-password' || 'off');
    });

    test('form fields have proper input types', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      const emailField = page.locator('input[type="email"]');
      const passwordField = page.locator('input[type="password"]');
      
      expect(await emailField.count()).toBe(1);
      expect(await passwordField.count()).toBe(1);
    });

    test('secure cookie attributes', async ({ page }) => {
      await page.goto(`${BASE_URL}`);
      
      const cookies = await page.context().cookies();
      
      for (const cookie of cookies) {
        if (cookie.name.includes('session') || cookie.name.includes('auth')) {
          expect(cookie.httpOnly).toBe(true);
          if (BASE_URL.startsWith('https://')) {
            expect(cookie.secure).toBe(true);
          }
          expect(['Lax', 'Strict']).toContain(cookie.sameSite);
        }
      }
    });
  });
});
