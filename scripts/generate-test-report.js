#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class TestReportGenerator {
  constructor() {
    this.results = {
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        timestamp: new Date().toISOString(),
      },
      categories: {
        unit: { total: 0, passed: 0, failed: 0, skipped: 0, coverage: {} },
        integration: { total: 0, passed: 0, failed: 0, skipped: 0 },
        contract: { total: 0, passed: 0, failed: 0, skipped: 0 },
        e2e: { total: 0, passed: 0, failed: 0, skipped: 0 },
        accessibility: { total: 0, passed: 0, failed: 0, skipped: 0, violations: [] },
        performance: { score: 0, metrics: {} },
        security: { passed: true, vulnerabilities: 0, issues: [] },
        visual: { total: 0, passed: 0, failed: 0, skipped: 0 },
        load: { passed: true, metrics: {} },
      },
      details: {
        failures: [],
        warnings: [],
        recommendations: [],
      },
    };
  }

  async generateReport() {
    console.log('🔍 Gathering test results...');
    
    await this.collectUnitTestResults();
    await this.collectIntegrationTestResults();
    await this.collectContractTestResults();
    await this.collectE2ETestResults();
    await this.collectAccessibilityResults();
    await this.collectPerformanceResults();
    await this.collectSecurityResults();
    await this.collectVisualResults();
    await this.collectLoadTestResults();
    
    this.calculateSummary();
    this.generateRecommendations();
    
    await this.saveJsonReport();
    await this.saveHtmlReport();
    await this.saveMarkdownReport();
    
    console.log('✅ Test report generated successfully!');
  }

  async collectUnitTestResults() {
    const unitResultsPath = 'all-artifacts/unit-test-results-18/unit-results.json';
    
    if (fs.existsSync(unitResultsPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(unitResultsPath, 'utf8'));
        this.results.categories.unit = {
          total: data.numTotalTests || 0,
          passed: data.numPassedTests || 0,
          failed: data.numFailedTests || 0,
          skipped: data.numPendingTests || 0,
          coverage: this.extractCoverageData(),
        };
      } catch (error) {
        console.warn('⚠️  Could not parse unit test results:', error.message);
      }
    }

    // Check coverage
    const coveragePath = 'all-artifacts/unit-test-results-18/coverage/coverage-summary.json';
    if (fs.existsSync(coveragePath)) {
      try {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        this.results.categories.unit.coverage = {
          lines: coverage.total.lines.pct,
          functions: coverage.total.functions.pct,
          branches: coverage.total.branches.pct,
          statements: coverage.total.statements.pct,
        };
      } catch (error) {
        console.warn('⚠️  Could not parse coverage data:', error.message);
      }
    }
  }

  async collectIntegrationTestResults() {
    const integrationResultsPath = 'all-artifacts/integration-test-results-18/integration-results.json';
    
    if (fs.existsSync(integrationResultsPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(integrationResultsPath, 'utf8'));
        this.results.categories.integration = {
          total: data.numTotalTests || 0,
          passed: data.numPassedTests || 0,
          failed: data.numFailedTests || 0,
          skipped: data.numPendingTests || 0,
        };
      } catch (error) {
        console.warn('⚠️  Could not parse integration test results:', error.message);
      }
    }
  }

  async collectContractTestResults() {
    const contractResultsPath = 'all-artifacts/contract-test-results/contract-results.json';
    
    if (fs.existsSync(contractResultsPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(contractResultsPath, 'utf8'));
        this.results.categories.contract = {
          total: data.numTotalTests || 0,
          passed: data.numPassedTests || 0,
          failed: data.numFailedTests || 0,
          skipped: data.numPendingTests || 0,
        };
      } catch (error) {
        console.warn('⚠️  Could not parse contract test results:', error.message);
      }
    }
  }

  async collectE2ETestResults() {
    const e2eResultsPath = 'all-artifacts/e2e-results-chromium-desktop/test-results/results.json';
    
    if (fs.existsSync(e2eResultsPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(e2eResultsPath, 'utf8'));
        this.results.categories.e2e = {
          total: data.suites.reduce((acc, suite) => acc + suite.specs.length, 0),
          passed: data.suites.reduce((acc, suite) => 
            acc + suite.specs.filter(spec => spec.ok).length, 0),
          failed: data.suites.reduce((acc, suite) => 
            acc + suite.specs.filter(spec => !spec.ok).length, 0),
          skipped: 0,
        };
      } catch (error) {
        console.warn('⚠️  Could not parse E2E test results:', error.message);
      }
    }
  }

  async collectAccessibilityResults() {
    const a11yResultsPath = 'all-artifacts/accessibility-report/test-results/results.json';
    
    if (fs.existsSync(a11yResultsPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(a11yResultsPath, 'utf8'));
        const violations = data.suites.flatMap(suite => 
          suite.specs.flatMap(spec => 
            spec.tests.filter(test => !test.ok)
          )
        );
        
        this.results.categories.accessibility = {
          total: data.suites.reduce((acc, suite) => acc + suite.specs.length, 0),
          passed: data.suites.reduce((acc, suite) => 
            acc + suite.specs.filter(spec => spec.ok).length, 0),
          failed: violations.length,
          skipped: 0,
          violations: violations.map(v => ({
            title: v.title,
            error: v.error?.message || 'Unknown error',
            severity: this.determineA11ySeverity(v.title),
          })),
        };
      } catch (error) {
        console.warn('⚠️  Could not parse accessibility test results:', error.message);
      }
    }
  }

  async collectPerformanceResults() {
    const perfResultsPath = 'all-artifacts/performance-report/results.json';
    
    if (fs.existsSync(perfResultsPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(perfResultsPath, 'utf8'));
        
        this.results.categories.performance = {
          score: this.calculatePerformanceScore(data),
          metrics: {
            pageLoad: data.pageLoad || 0,
            firstContentfulPaint: data.fcp || 0,
            largestContentfulPaint: data.lcp || 0,
            cumulativeLayoutShift: data.cls || 0,
            firstInputDelay: data.fid || 0,
            bundleSize: data.bundleSize || 0,
          },
        };
      } catch (error) {
        console.warn('⚠️  Could not parse performance test results:', error.message);
      }
    }
  }

  async collectSecurityResults() {
    const securityResultsPath = 'all-artifacts/security-report/results.json';
    
    if (fs.existsSync(securityResultsPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(securityResultsPath, 'utf8'));
        const issues = data.suites.flatMap(suite => 
          suite.specs.flatMap(spec => 
            spec.tests.filter(test => !test.ok)
          )
        );
        
        this.results.categories.security = {
          passed: issues.length === 0,
          vulnerabilities: issues.length,
          issues: issues.map(issue => ({
            title: issue.title,
            severity: this.determineSecuritySeverity(issue.title),
            description: issue.error?.message || 'Security issue detected',
          })),
        };
      } catch (error) {
        console.warn('⚠️  Could not parse security test results:', error.message);
      }
    }
  }

  async collectVisualResults() {
    const visualResultsPath = 'all-artifacts/visual-test-results/test-results/results.json';
    
    if (fs.existsSync(visualResultsPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(visualResultsPath, 'utf8'));
        this.results.categories.visual = {
          total: data.suites.reduce((acc, suite) => acc + suite.specs.length, 0),
          passed: data.suites.reduce((acc, suite) => 
            acc + suite.specs.filter(spec => spec.ok).length, 0),
          failed: data.suites.reduce((acc, suite) => 
            acc + suite.specs.filter(spec => !spec.ok).length, 0),
          skipped: 0,
        };
      } catch (error) {
        console.warn('⚠️  Could not parse visual test results:', error.message);
      }
    }
  }

  async collectLoadTestResults() {
    const loadResultsPath = 'all-artifacts/load-test-results/results.json';
    
    if (fs.existsSync(loadResultsPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(loadResultsPath, 'utf8'));
        this.results.categories.load = {
          passed: data.successRate > 95, // Consider passed if 95%+ success rate
          metrics: {
            successRate: data.successRate || 0,
            averageResponseTime: data.averageResponseTime || 0,
            requestsPerSecond: data.requestsPerSecond || 0,
            errors: data.errors || 0,
          },
        };
      } catch (error) {
        console.warn('⚠️  Could not parse load test results:', error.message);
      }
    }
  }

  extractCoverageData() {
    const coveragePath = 'all-artifacts/unit-test-results-18/coverage/coverage-summary.json';
    
    if (fs.existsSync(coveragePath)) {
      try {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        return {
          lines: coverage.total.lines.pct,
          functions: coverage.total.functions.pct,
          branches: coverage.total.branches.pct,
          statements: coverage.total.statements.pct,
        };
      } catch (error) {
        return {};
      }
    }
    return {};
  }

  calculatePerformanceScore(data) {
    let score = 100;
    
    // Deduct points for poor performance
    if (data.pageLoad > 3000) score -= 25;
    if (data.lcp > 2500) score -= 20;
    if (data.fid > 100) score -= 15;
    if (data.cls > 0.1) score -= 20;
    if (data.bundleSize > 250000) score -= 20;
    
    return Math.max(0, score);
  }

  determineA11ySeverity(title) {
    if (title.includes('critical') || title.includes('screen reader')) return 'critical';
    if (title.includes('serious') || title.includes('keyboard')) return 'serious';
    if (title.includes('moderate') || title.includes('contrast')) return 'moderate';
    return 'minor';
  }

  determineSecuritySeverity(title) {
    if (title.includes('xss') || title.includes('sql injection') || title.includes('csrf')) return 'critical';
    if (title.includes('authentication') || title.includes('authorization')) return 'serious';
    if (title.includes('header') || title.includes('cookie')) return 'moderate';
    return 'minor';
  }

  calculateSummary() {
    const categories = this.results.categories;
    
    this.results.summary.total = Object.values(categories).reduce((acc, cat) => 
      acc + (cat.total || 0), 0);
    this.results.summary.passed = Object.values(categories).reduce((acc, cat) => 
      acc + (cat.passed || 0), 0);
    this.results.summary.failed = Object.values(categories).reduce((acc, cat) => 
      acc + (cat.failed || 0), 0);
    this.results.summary.skipped = Object.values(categories).reduce((acc, cat) => 
      acc + (cat.skipped || 0), 0);
    
    // Overall pass status
    this.results.summary.overallPassed = 
      this.results.summary.failed === 0 && 
      categories.security.passed && 
      categories.accessibility.violations.length === 0 &&
      categories.performance.score >= 80;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Coverage recommendations
    const coverage = this.results.categories.unit.coverage;
    if (coverage.lines < 80) {
      recommendations.push({
        type: 'coverage',
        priority: 'high',
        message: `Increase test coverage. Current line coverage: ${coverage.lines}% (target: 80%)`,
      });
    }
    
    // Performance recommendations
    const perf = this.results.categories.performance;
    if (perf.score < 80) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: `Improve performance score. Current: ${perf.score}/100 (target: 80+)`,
      });
    }
    
    // Accessibility recommendations
    const a11y = this.results.categories.accessibility;
    if (a11y.violations.length > 0) {
      const criticalViolations = a11y.violations.filter(v => v.severity === 'critical');
      if (criticalViolations.length > 0) {
        recommendations.push({
          type: 'accessibility',
          priority: 'high',
          message: `Fix ${criticalViolations.length} critical accessibility violations`,
        });
      }
    }
    
    // Security recommendations
    if (!this.results.categories.security.passed) {
      recommendations.push({
        type: 'security',
        priority: 'critical',
        message: 'Address security vulnerabilities before deployment',
      });
    }
    
    this.results.details.recommendations = recommendations;
  }

  async saveJsonReport() {
    const outputPath = 'test-summary.json';
    fs.writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
    console.log(`📄 JSON report saved to ${outputPath}`);
  }

  async saveHtmlReport() {
    const html = this.generateHtmlReport();
    const outputPath = 'comprehensive-test-report.html';
    fs.writeFileSync(outputPath, html);
    console.log(`🌐 HTML report saved to ${outputPath}`);
  }

  async saveMarkdownReport() {
    const markdown = this.generateMarkdownReport();
    const outputPath = 'test-summary.md';
    fs.writeFileSync(outputPath, markdown);
    console.log(`📝 Markdown report saved to ${outputPath}`);
  }

  generateHtmlReport() {
    const { summary, categories, details } = this.results;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprehensive Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header .timestamp { opacity: 0.9; margin-top: 10px; }
        .content { padding: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric .value { font-size: 2em; font-weight: bold; color: #333; }
        .metric .label { color: #666; margin-top: 5px; }
        .metric.passed .value { color: #28a745; }
        .metric.failed .value { color: #dc3545; }
        .section { margin-bottom: 40px; }
        .section h2 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .category-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .category { background: #f8f9fa; padding: 20px; border-radius: 8px; }
        .category h3 { margin-top: 0; color: #333; }
        .progress-bar { background: #e9ecef; border-radius: 4px; height: 8px; margin: 10px 0; }
        .progress-fill { background: #28a745; height: 100%; border-radius: 4px; transition: width 0.3s ease; }
        .violations { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 10px; margin-top: 10px; }
        .recommendations { background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 4px; padding: 15px; }
        .recommendation { margin-bottom: 10px; }
        .priority-high { border-left: 4px solid #dc3545; padding-left: 10px; }
        .priority-medium { border-left: 4px solid #ffc107; padding-left: 10px; }
        .priority-critical { border-left: 4px solid #721c24; padding-left: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Comprehensive Test Report</h1>
            <div class="timestamp">Generated on ${new Date(summary.timestamp).toLocaleString()}</div>
        </div>
        
        <div class="content">
            <div class="summary">
                <div class="metric ${summary.overallPassed ? 'passed' : 'failed'}">
                    <div class="value">${summary.overallPassed ? '✅ PASSED' : '❌ FAILED'}</div>
                    <div class="label">Overall Status</div>
                </div>
                <div class="metric">
                    <div class="value">${summary.total}</div>
                    <div class="label">Total Tests</div>
                </div>
                <div class="metric passed">
                    <div class="value">${summary.passed}</div>
                    <div class="label">Passed</div>
                </div>
                <div class="metric failed">
                    <div class="value">${summary.failed}</div>
                    <div class="label">Failed</div>
                </div>
            </div>

            <div class="section">
                <h2>📊 Test Categories</h2>
                <div class="category-grid">
                    <div class="category">
                        <h3>Unit Tests</h3>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${categories.unit.total > 0 ? (categories.unit.passed / categories.unit.total * 100) : 0}%"></div>
                        </div>
                        <div>${categories.unit.passed}/${categories.unit.total} passed</div>
                        ${categories.unit.coverage.lines ? `<div>Coverage: ${categories.unit.coverage.lines}%</div>` : ''}
                    </div>
                    
                    <div class="category">
                        <h3>Integration Tests</h3>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${categories.integration.total > 0 ? (categories.integration.passed / categories.integration.total * 100) : 0}%"></div>
                        </div>
                        <div>${categories.integration.passed}/${categories.integration.total} passed</div>
                    </div>
                    
                    <div class="category">
                        <h3>E2E Tests</h3>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${categories.e2e.total > 0 ? (categories.e2e.passed / categories.e2e.total * 100) : 0}%"></div>
                        </div>
                        <div>${categories.e2e.passed}/${categories.e2e.total} passed</div>
                    </div>
                    
                    <div class="category">
                        <h3>Accessibility</h3>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${categories.accessibility.total > 0 ? (categories.accessibility.passed / categories.accessibility.total * 100) : 0}%"></div>
                        </div>
                        <div>${categories.accessibility.passed}/${categories.accessibility.total} passed</div>
                        ${categories.accessibility.violations.length > 0 ? `
                            <div class="violations">
                                <strong>${categories.accessibility.violations.length} violations found</strong>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="category">
                        <h3>Performance</h3>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${categories.performance.score}%"></div>
                        </div>
                        <div>Score: ${categories.performance.score}/100</div>
                        <div>Page Load: ${categories.performance.metrics.pageLoad}ms</div>
                    </div>
                    
                    <div class="category">
                        <h3>Security</h3>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${categories.security.passed ? '100' : '0'}%"></div>
                        </div>
                        <div>${categories.security.passed ? '✅ Passed' : '❌ Issues found'}</div>
                        <div>${categories.security.vulnerabilities} vulnerabilities</div>
                    </div>
                </div>
            </div>

            ${details.recommendations.length > 0 ? `
                <div class="section">
                    <h2>💡 Recommendations</h2>
                    <div class="recommendations">
                        ${details.recommendations.map(rec => `
                            <div class="recommendation priority-${rec.priority}">
                                <strong>${rec.type.toUpperCase()}:</strong> ${rec.message}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
  }

  generateMarkdownReport() {
    const { summary, categories, details } = this.results;
    
    return `
# 🧪 Comprehensive Test Report

**Generated on:** ${new Date(summary.timestamp).toLocaleString()}

## 📊 Summary

| Metric | Value |
|--------|-------|
| Overall Status | ${summary.overallPassed ? '✅ PASSED' : '❌ FAILED'} |
| Total Tests | ${summary.total} |
| Passed | ${summary.passed} |
| Failed | ${summary.failed} |
| Skipped | ${summary.skipped} |

## 📋 Test Categories

### Unit Tests
- **Results:** ${categories.unit.passed}/${categories.unit.total} passed
- **Coverage:** ${categories.unit.coverage.lines ? `${categories.unit.coverage.lines}% lines, ${categories.unit.coverage.functions}% functions` : 'N/A'}

### Integration Tests
- **Results:** ${categories.integration.passed}/${categories.integration.total} passed

### Contract Tests
- **Results:** ${categories.contract.passed}/${categories.contract.total} passed

### E2E Tests
- **Results:** ${categories.e2e.passed}/${categories.e2e.total} passed

### Accessibility Tests
- **Results:** ${categories.accessibility.passed}/${categories.accessibility.total} passed
- **Violations:** ${categories.accessibility.violations.length}

### Performance Tests
- **Score:** ${categories.performance.score}/100
- **Page Load Time:** ${categories.performance.metrics.pageLoad}ms
- **LCP:** ${categories.performance.metrics.largestContentfulPaint}ms
- **FID:** ${categories.performance.metrics.firstInputDelay}ms

### Security Tests
- **Status:** ${categories.security.passed ? '✅ Passed' : '❌ Issues found'}
- **Vulnerabilities:** ${categories.security.vulnerabilities}

## 💡 Recommendations

${details.recommendations.length > 0 ? 
  details.recommendations.map(rec => `- **${rec.type.toUpperCase()}** [${rec.priority}]: ${rec.message}`).join('\n') :
  '✅ No recommendations - all tests passed!'
}

---
*This report was generated automatically by the comprehensive testing pipeline.*
`;
  }
}

// Run the report generator
if (require.main === module) {
  const generator = new TestReportGenerator();
  generator.generateReport().catch(error => {
    console.error('❌ Failed to generate test report:', error);
    process.exit(1);
  });
}

module.exports = TestReportGenerator;
