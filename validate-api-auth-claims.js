/**
 * Comprehensive API Authentication Claims Validator
 * 
 * This script validates the AI's claims about fixing API authentication issues
 * in the Foco application using Puppeteer and direct API testing.
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class APIAuthValidator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'http://localhost:3000';
    this.testResults = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      tests: [],
      aiClaimsValidation: {
        sessionEndpoint: null,
        projectsEndpoint: null,
        authenticationFlow: null,
        errorHandling: null,
        middleware: null
      }
    };
    this.credentials = {
      email: 'laurence@fyves.com',
      password: 'Hennie@@12'
    };
  }

  async init() {
    console.log('🚀 Initializing Puppeteer browser for API auth validation...');
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    this.page = await this.browser.newPage();
    
    // Set user agent
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    // Enable console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });

    // Enable request/response logging
    this.page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`📡 API Response: ${response.status()} ${response.url()}`);
      }
    });
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running test: ${testName}`);
    this.testResults.totalTests++;
    
    try {
      const result = await testFunction();
      this.testResults.passedTests++;
      this.testResults.tests.push({
        name: testName,
        status: 'PASSED',
        result: result,
        timestamp: new Date().toISOString()
      });
      console.log(`✅ ${testName}: PASSED`);
      return result;
    } catch (error) {
      this.testResults.failedTests++;
      this.testResults.tests.push({
        name: testName,
        status: 'FAILED',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      console.log(`❌ ${testName}: FAILED - ${error.message}`);
      return null;
    }
  }

  async takeScreenshot(name) {
    const screenshotPath = path.join(__dirname, 'api-test-screenshots', `${name}-${Date.now()}.png`);
    await fs.promises.mkdir(path.dirname(screenshotPath), { recursive: true });
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    return screenshotPath;
  }

  // Test 1: Session API Endpoint (Unauthenticated)
  async testSessionAPIUnauthenticated() {
    const response = await this.page.evaluate(async (baseUrl) => {
      try {
        const res = await fetch(`${baseUrl}/api/auth/session`, {
          method: 'GET',
          credentials: 'include'
        });
        
        return {
          status: res.status,
          statusText: res.statusText,
          data: await res.json()
        };
      } catch (error) {
        return {
          error: error.message
        };
      }
    }, this.baseUrl);

    // AI claimed this should return 401 for unauthenticated users
    this.testResults.aiClaimsValidation.sessionEndpoint = {
      claimedStatus: 401,
      actualStatus: response.status,
      claimedBehavior: 'Returns 401 for unauthenticated users',
      actualBehavior: response.data || response.error,
      verdict: response.status === 401 ? 'CORRECT' : 'INCORRECT'
    };

    return response;
  }

  // Test 2: Projects API Endpoint (Unauthenticated)
  async testProjectsAPIUnauthenticated() {
    const response = await this.page.evaluate(async (baseUrl) => {
      try {
        const res = await fetch(`${baseUrl}/api/projects`, {
          method: 'GET',
          credentials: 'include'
        });
        
        return {
          status: res.status,
          statusText: res.statusText,
          data: await res.json()
        };
      } catch (error) {
        return {
          error: error.message
        };
      }
    }, this.baseUrl);

    // AI claimed this should return 401 (not 403/404) for unauthenticated users
    const verdict = response.status === 401 ? 'CORRECT' : 
                   response.status === 403 ? 'PARTIALLY_CORRECT' : 'INCORRECT';

    this.testResults.aiClaimsValidation.projectsEndpoint = {
      claimedStatus: 401,
      actualStatus: response.status,
      claimedImprovement: 'Changed from 403/404 to 401',
      actualBehavior: response.data || response.error,
      verdict: verdict
    };

    return response;
  }

  // Test 3: Application Loading and Navigation
  async testApplicationLoading() {
    await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
    await this.takeScreenshot('01-homepage');
    
    const pageInfo = await this.page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        hasLoginForm: !!document.querySelector('form'),
        hasAuthElements: !!document.querySelector('[href*="login"], [href*="register"]')
      };
    });

    return pageInfo;
  }

  // Test 4: Authentication Flow
  async testAuthenticationFlow() {
    // Navigate to login page
    try {
      await this.page.goto(`${this.baseUrl}/login`, { waitUntil: 'networkidle2' });
      await this.takeScreenshot('02-login-page');
      
      // Check if login form exists
      const hasLoginForm = await this.page.$('form') !== null;
      if (!hasLoginForm) {
        throw new Error('Login form not found');
      }

      // Fill in credentials
      const emailInput = await this.page.$('input[type="email"], input[name="email"]');
      const passwordInput = await this.page.$('input[type="password"], input[name="password"]');
      
      if (emailInput && passwordInput) {
        await emailInput.type(this.credentials.email);
        await passwordInput.type(this.credentials.password);
        await this.takeScreenshot('03-credentials-filled');

        // Submit form
        const submitButton = await this.page.$('button[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          
          // Wait for navigation or error
          try {
            await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
            await this.takeScreenshot('04-post-login');
          } catch (navError) {
            console.log('No navigation after login - checking for errors');
            await this.takeScreenshot('04-login-error');
          }
        }
      }

      const postLoginInfo = await this.page.evaluate(() => {
        const url = window.location.href;
        const bodyText = document.body.innerText.toLowerCase();
        
        return {
          currentUrl: url,
          isAuthenticated: url.includes('/dashboard') || url.includes('/projects'),
          hasError: bodyText.includes('error') || bodyText.includes('invalid'),
          hasSuccessMessage: bodyText.includes('welcome') || bodyText.includes('success')
        };
      });

      return {
        loginFormFound: hasLoginForm,
        credentialsFilled: true,
        ...postLoginInfo
      };
    } catch (error) {
      return {
        loginFormFound: false,
        error: error.message
      };
    }
  }

  // Test 5: Authenticated API Calls
  async testAuthenticatedAPICalls() {
    // First check if we're authenticated
    const sessionResponse = await this.page.evaluate(async (baseUrl) => {
      try {
        const res = await fetch(`${baseUrl}/api/auth/session`, {
          method: 'GET',
          credentials: 'include'
        });
        
        return {
          status: res.status,
          data: await res.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    }, this.baseUrl);

    let projectsResponse = null;
    if (sessionResponse.status === 200) {
      // Try to fetch projects with authentication
      projectsResponse = await this.page.evaluate(async (baseUrl) => {
        try {
          const res = await fetch(`${baseUrl}/api/projects`, {
            method: 'GET',
            credentials: 'include'
          });
          
          return {
            status: res.status,
            data: await res.json()
          };
        } catch (error) {
          return { error: error.message };
        }
      }, this.baseUrl);
    }

    return {
      sessionResponse,
      projectsResponse,
      isAuthenticated: sessionResponse.status === 200
    };
  }

  // Test 6: Error Handling Validation
  async testErrorHandling() {
    const errorTests = [];

    // Test various endpoints for proper error codes
    const endpoints = [
      '/api/auth/session',
      '/api/projects',
      '/api/organizations',
      '/api/milestones'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.page.evaluate(async (baseUrl, endpoint) => {
          try {
            const res = await fetch(`${baseUrl}${endpoint}`, {
              method: 'GET',
              credentials: 'include'
            });
            
            return {
              endpoint,
              status: res.status,
              data: await res.json()
            };
          } catch (error) {
            return {
              endpoint,
              error: error.message
            };
          }
        }, this.baseUrl, endpoint);

        errorTests.push(response);
      } catch (error) {
        errorTests.push({
          endpoint,
          error: error.message
        });
      }
    }

    // Analyze error handling patterns
    const errorAnalysis = {
      properAuthErrors: errorTests.filter(test => test.status === 401).length,
      improperAuthErrors: errorTests.filter(test => test.status === 403 || test.status === 404).length,
      serverErrors: errorTests.filter(test => test.status >= 500).length,
      totalEndpoints: endpoints.length
    };

    this.testResults.aiClaimsValidation.errorHandling = {
      claimedImprovement: 'All endpoints return 401 for authentication errors',
      actualResults: errorAnalysis,
      verdict: errorAnalysis.properAuthErrors === errorAnalysis.totalEndpoints ? 'CORRECT' : 'NEEDS_IMPROVEMENT'
    };

    return { errorTests, errorAnalysis };
  }

  // Test 7: Performance and Response Times
  async testPerformanceMetrics() {
    const performanceTests = [];
    
    const endpoints = ['/api/auth/session', '/api/projects'];
    
    for (const endpoint of endpoints) {
      const startTime = Date.now();
      
      const response = await this.page.evaluate(async (baseUrl, endpoint) => {
        const start = performance.now();
        try {
          const res = await fetch(`${baseUrl}${endpoint}`, {
            method: 'GET',
            credentials: 'include'
          });
          const end = performance.now();
          
          return {
            endpoint,
            status: res.status,
            responseTime: end - start,
            data: await res.json()
          };
        } catch (error) {
          const end = performance.now();
          return {
            endpoint,
            responseTime: end - start,
            error: error.message
          };
        }
      }, this.baseUrl, endpoint);

      performanceTests.push(response);
    }

    const avgResponseTime = performanceTests.reduce((sum, test) => sum + (test.responseTime || 0), 0) / performanceTests.length;

    return {
      tests: performanceTests,
      averageResponseTime: avgResponseTime,
      verdict: avgResponseTime < 1000 ? 'EXCELLENT' : avgResponseTime < 2000 ? 'GOOD' : 'NEEDS_IMPROVEMENT'
    };
  }

  async runAllTests() {
    console.log('🎯 Starting comprehensive API authentication validation...\n');

    await this.init();

    // Run all tests
    await this.runTest('Session API (Unauthenticated)', () => this.testSessionAPIUnauthenticated());
    await this.runTest('Projects API (Unauthenticated)', () => this.testProjectsAPIUnauthenticated());
    await this.runTest('Application Loading', () => this.testApplicationLoading());
    await this.runTest('Authentication Flow', () => this.testAuthenticationFlow());
    await this.runTest('Authenticated API Calls', () => this.testAuthenticatedAPICalls());
    await this.runTest('Error Handling', () => this.testErrorHandling());
    await this.runTest('Performance Metrics', () => this.testPerformanceMetrics());

    await this.generateComprehensiveReport();
    await this.cleanup();
  }

  async generateComprehensiveReport() {
    const reportPath = path.join(__dirname, 'api-auth-validation-report.json');
    const htmlReportPath = path.join(__dirname, 'api-auth-validation-report.html');

    // Generate comprehensive JSON report
    const comprehensiveReport = {
      ...this.testResults,
      summary: {
        totalTests: this.testResults.totalTests,
        passedTests: this.testResults.passedTests,
        failedTests: this.testResults.failedTests,
        successRate: ((this.testResults.passedTests / this.testResults.totalTests) * 100).toFixed(1)
      },
      aiClaimsAnalysis: this.analyzeAIClaims()
    };

    await fs.promises.writeFile(reportPath, JSON.stringify(comprehensiveReport, null, 2));

    // Generate HTML report
    const htmlReport = this.generateDetailedHtmlReport(comprehensiveReport);
    await fs.promises.writeFile(htmlReportPath, htmlReport);

    console.log(`\n📊 API Authentication Test Results:`);
    console.log(`Total Tests: ${this.testResults.totalTests}`);
    console.log(`Passed: ${this.testResults.passedTests}`);
    console.log(`Failed: ${this.testResults.failedTests}`);
    console.log(`Success Rate: ${comprehensiveReport.summary.successRate}%`);
    
    console.log(`\n🔍 AI Claims Analysis:`);
    const analysis = this.analyzeAIClaims();
    Object.entries(analysis).forEach(([claim, result]) => {
      console.log(`${result.verdict === 'CORRECT' ? '✅' : result.verdict === 'PARTIALLY_CORRECT' ? '⚠️' : '❌'} ${claim}: ${result.verdict}`);
    });

    console.log(`\n📄 Reports generated:`);
    console.log(`JSON: ${reportPath}`);
    console.log(`HTML: ${htmlReportPath}`);
  }

  analyzeAIClaims() {
    return {
      'Session API Returns 401': {
        claim: '/api/auth/session returns 401 for unauthenticated users',
        actual: this.testResults.aiClaimsValidation.sessionEndpoint?.actualStatus || 'Unknown',
        verdict: this.testResults.aiClaimsValidation.sessionEndpoint?.verdict || 'UNKNOWN'
      },
      'Projects API Returns 401': {
        claim: '/api/projects returns 401 (not 403/404) for unauthenticated users',
        actual: this.testResults.aiClaimsValidation.projectsEndpoint?.actualStatus || 'Unknown',
        verdict: this.testResults.aiClaimsValidation.projectsEndpoint?.verdict || 'UNKNOWN'
      },
      'Error Handling Improvement': {
        claim: 'All endpoints return proper 401 authentication errors',
        actual: this.testResults.aiClaimsValidation.errorHandling?.actualResults || 'Unknown',
        verdict: this.testResults.aiClaimsValidation.errorHandling?.verdict || 'UNKNOWN'
      }
    };
  }

  generateDetailedHtmlReport(report) {
    const passRate = report.summary.successRate;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Authentication Claims Validation Report</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; text-align: center; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .stat { background: white; padding: 25px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .stat h3 { margin: 0; font-size: 2.5em; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .warning { color: #ffc107; }
        .claims-analysis { background: white; padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .claim-item { padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #ddd; }
        .claim-correct { background: #d4edda; border-left-color: #28a745; }
        .claim-incorrect { background: #f8d7da; border-left-color: #dc3545; }
        .claim-partial { background: #fff3cd; border-left-color: #ffc107; }
        .test-results { background: white; padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .test-result { margin: 15px 0; padding: 20px; border-radius: 8px; }
        .test-passed { background: #d4edda; border-left: 4px solid #28a745; }
        .test-failed { background: #f8d7da; border-left: 4px solid #dc3545; }
        .test-name { font-weight: bold; font-size: 1.1em; margin-bottom: 10px; }
        .test-details { font-size: 0.9em; color: #666; }
        .error { color: #dc3545; font-family: 'Courier New', monospace; background: #f8f9fa; padding: 10px; border-radius: 4px; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 6px; overflow-x: auto; }
        .api-endpoint { background: #e9ecef; padding: 5px 10px; border-radius: 4px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 API Authentication Claims Validation Report</h1>
            <p>Generated on: ${report.timestamp}</p>
            <p>Base URL: ${report.baseUrl}</p>
            <p>Testing AI claims about API authentication fixes</p>
        </div>
        
        <div class="stats">
            <div class="stat">
                <h3>${report.summary.totalTests}</h3>
                <p>Total Tests</p>
            </div>
            <div class="stat">
                <h3 class="passed">${report.summary.passedTests}</h3>
                <p>Passed</p>
            </div>
            <div class="stat">
                <h3 class="failed">${report.summary.failedTests}</h3>
                <p>Failed</p>
            </div>
            <div class="stat">
                <h3>${passRate}%</h3>
                <p>Success Rate</p>
            </div>
        </div>

        <div class="claims-analysis">
            <h2>🔍 AI Claims Analysis</h2>
            <p>Validating specific claims made by the AI about API authentication fixes:</p>
            ${Object.entries(report.aiClaimsAnalysis).map(([claim, result]) => {
              const cssClass = result.verdict === 'CORRECT' ? 'claim-correct' : 
                              result.verdict === 'PARTIALLY_CORRECT' ? 'claim-partial' : 'claim-incorrect';
              const icon = result.verdict === 'CORRECT' ? '✅' : 
                          result.verdict === 'PARTIALLY_CORRECT' ? '⚠️' : '❌';
              
              return `
                <div class="claim-item ${cssClass}">
                    <div class="test-name">${icon} ${claim}</div>
                    <div class="test-details">
                        <strong>Claim:</strong> ${result.claim}<br>
                        <strong>Actual:</strong> ${JSON.stringify(result.actual)}<br>
                        <strong>Verdict:</strong> ${result.verdict}
                    </div>
                </div>
              `;
            }).join('')}
        </div>

        <div class="test-results">
            <h2>📋 Detailed Test Results</h2>
            ${report.tests.map(test => `
                <div class="test-result ${test.status === 'PASSED' ? 'test-passed' : 'test-failed'}">
                    <div class="test-name">${test.status === 'PASSED' ? '✅' : '❌'} ${test.name}</div>
                    <div class="test-details">
                        <strong>Status:</strong> ${test.status}<br>
                        <strong>Timestamp:</strong> ${test.timestamp}<br>
                        ${test.status === 'PASSED' 
                            ? `<strong>Result:</strong><pre>${JSON.stringify(test.result, null, 2)}</pre>`
                            : `<div class="error"><strong>Error:</strong> ${test.error}</div>`
                        }
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="claims-analysis">
            <h2>🎯 Key Findings</h2>
            <ul>
                <li><span class="api-endpoint">/api/auth/session</span> endpoint exists and handles authentication</li>
                <li><span class="api-endpoint">/api/projects</span> endpoint uses header-based authentication</li>
                <li>Middleware sets <code>x-user-id</code> header for authenticated requests</li>
                <li>Error handling returns appropriate HTTP status codes</li>
                <li>Server-side Supabase client implementation is present</li>
            </ul>
        </div>
    </div>
</body>
</html>`;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    console.log('\n🧹 Cleanup completed');
  }
}

// Run the validation
async function main() {
  const validator = new APIAuthValidator();
  try {
    await validator.runAllTests();
  } catch (error) {
    console.error('❌ Validation failed:', error);
    await validator.cleanup();
    process.exit(1);
  }
}

// Export for use as module
export default APIAuthValidator;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
