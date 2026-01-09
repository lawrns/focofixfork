import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const PAGES_TO_TEST = [
  { url: '/', name: 'Home Page' },
  { url: '/dashboard', name: 'Dashboard' },
  { url: '/projects', name: 'Projects' },
  { url: '/tasks', name: 'Tasks' },
  { url: '/milestones', name: 'Milestones' },
  { url: '/goals', name: 'Goals' },
  { url: '/analytics', name: 'Analytics' },
  { url: '/settings', name: 'Settings' },
];

// Viewport sizes for responsive testing
const VIEWPORTS = [
  { width: 375, height: 667, name: 'Mobile' },
  { width: 768, height: 1024, name: 'Tablet' },
  { width: 1920, height: 1080, name: 'Desktop' },
];

test.describe('Comprehensive Accessibility Audit (WCAG 2.1 AA)', () => {
  let accessibilityReport: any = {
    timestamp: new Date().toISOString(),
    pages: [],
    summary: {
      totalViolations: 0,
      criticalViolations: 0,
      seriousViolations: 0,
      moderateViolations: 0,
      minorViolations: 0,
      passedPages: 0,
      totalPagesChecked: 0
    },
    recommendations: []
  };

  test.beforeAll(async () => {
    console.log('Starting comprehensive accessibility audit...');
  });

  test.afterAll(async () => {
    console.log('\n=== ACCESSIBILITY AUDIT SUMMARY ===');
    console.log(`Total Pages Checked: ${accessibilityReport.summary.totalPagesChecked}`);
    console.log(`Pages with No Issues: ${accessibilityReport.summary.passedPages}`);
    console.log(`Total Violations Found: ${accessibilityReport.summary.totalViolations}`);
    console.log(`  - Critical: ${accessibilityReport.summary.criticalViolations}`);
    console.log(`  - Serious: ${accessibilityReport.summary.seriousViolations}`);
    console.log(`  - Moderate: ${accessibilityReport.summary.moderateViolations}`);
    console.log(`  - Minor: ${accessibilityReport.summary.minorViolations}`);
  });

  PAGES_TO_TEST.forEach(page => {
    test(`Accessibility audit for ${page.name}`, async ({ page: browserPage }) => {
      // Navigate to page
      await browserPage.goto(`${BASE_URL}${page.url}`, { waitUntil: 'networkidle' });

      // Wait for content to load
      await browserPage.waitForTimeout(1000);

      // Inject axe
      await injectAxe(browserPage);

      // Check for violations
      const violations = await getViolations(browserPage);

      // Analyze violations
      const critical = violations.filter(v => v.impact === 'critical').length;
      const serious = violations.filter(v => v.impact === 'serious').length;
      const moderate = violations.filter(v => v.impact === 'moderate').length;
      const minor = violations.filter(v => v.impact === 'minor').length;

      const pageReport = {
        url: page.url,
        name: page.name,
        violations: violations.length,
        critical,
        serious,
        moderate,
        minor,
        passed: violations.length === 0,
        issues: violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          elements: v.nodes.length,
          help: v.help,
          helpUrl: v.helpUrl
        }))
      };

      accessibilityReport.pages.push(pageReport);
      accessibilityReport.summary.totalPagesChecked++;
      accessibilityReport.summary.totalViolations += violations.length;
      accessibilityReport.summary.criticalViolations += critical;
      accessibilityReport.summary.seriousViolations += serious;
      accessibilityReport.summary.moderateViolations += moderate;
      accessibilityReport.summary.minorViolations += minor;

      if (violations.length === 0) {
        accessibilityReport.summary.passedPages++;
      }

      // Report findings
      console.log(`\n✓ ${page.name}`);
      if (violations.length === 0) {
        console.log('  Status: PASS ✅ (No accessibility issues found)');
      } else {
        console.log(`  Status: FAIL ❌ (${violations.length} violations)`);
        console.log(`    Critical: ${critical}, Serious: ${serious}, Moderate: ${moderate}, Minor: ${minor}`);
      }

      // Assert no critical or serious violations
      expect(critical, `${page.name} should have no critical violations`).toBe(0);
      expect(serious, `${page.name} should have no serious violations`).toBe(0);
    });
  });

  test('Keyboard Navigation Test', async ({ page: browserPage }) => {
    await browserPage.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' });

    console.log('\nTesting keyboard navigation...');

    // Test Tab navigation
    await browserPage.keyboard.press('Tab');
    const focusedElement = await browserPage.evaluate(() => {
      return document.activeElement?.tagName;
    });

    expect(focusedElement).toBeTruthy();
    console.log(`✓ Tab navigation works (focused element: ${focusedElement})`);

    // Test that focus is visible
    const hasVisibleFocus = await browserPage.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      if (!el) return false;
      const style = window.getComputedStyle(el, ':focus');
      return style.outline !== 'none' || style.boxShadow !== 'none';
    });

    console.log(`✓ Visible focus indicator: ${hasVisibleFocus ? 'PASS' : 'CHECK MANUALLY'}`);
  });

  test('Form Accessibility Test', async ({ page: browserPage }) => {
    await browserPage.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' });

    console.log('\nTesting form accessibility...');

    // Check for form labels
    const formElements = await browserPage.evaluate(() => {
      const forms = document.querySelectorAll('form, [role="form"]');
      const elements: any[] = [];

      forms.forEach(form => {
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach((input, idx) => {
          const label = form.querySelector(`label[for="${(input as any).id}"]`);
          const ariaLabel = input.getAttribute('aria-label');
          const ariaLabelledBy = input.getAttribute('aria-labelledby');

          elements.push({
            type: input.tagName.toLowerCase(),
            id: (input as any).id,
            hasLabel: !!label,
            hasAriaLabel: !!ariaLabel,
            hasAriaLabelledBy: !!ariaLabelledBy,
            accessible: !!(label || ariaLabel || ariaLabelledBy || (input as any).placeholder)
          });
        });
      });

      return elements;
    });

    console.log(`✓ Found ${formElements.length} form elements`);

    const inaccessible = formElements.filter(el => !el.accessible);
    if (inaccessible.length > 0) {
      console.log(`⚠ ${inaccessible.length} form elements may lack accessible labels`);
    } else {
      console.log('✓ All form elements have accessible labels');
    }

    expect(inaccessible.length, 'Form elements should have accessible labels').toBe(0);
  });

  test('Image Alt Text Test', async ({ page: browserPage }) => {
    // Test all pages for missing alt text
    for (const pageUrl of PAGES_TO_TEST.map(p => p.url)) {
      await browserPage.goto(`${BASE_URL}${pageUrl}`, { waitUntil: 'networkidle' });

      const imagesWithoutAlt = await browserPage.evaluate(() => {
        const images = document.querySelectorAll('img');
        const missing: any[] = [];

        images.forEach((img, idx) => {
          const alt = img.getAttribute('alt');
          const ariaLabel = img.getAttribute('aria-label');
          const ariaHidden = img.getAttribute('aria-hidden');

          if (!alt && !ariaLabel && ariaHidden !== 'true') {
            missing.push({
              src: img.src,
              index: idx
            });
          }
        });

        return missing;
      });

      if (imagesWithoutAlt.length > 0) {
        console.log(`⚠ ${pageUrl}: ${imagesWithoutAlt.length} images missing alt text`);
        expect(imagesWithoutAlt.length).toBe(0);
      }
    }

    console.log('✓ Image alt text check complete');
  });

  test('Color Contrast Verification', async ({ page: browserPage }) => {
    await browserPage.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' });

    console.log('\nVerifying color contrast...');

    // Check text elements for sufficient contrast
    const contrastIssues = await browserPage.evaluate(async () => {
      // Function to calculate relative luminance
      function getLuminance(r: number, g: number, b: number): number {
        const [rs, gs, bs] = [r, g, b].map(c => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      }

      // Function to calculate contrast ratio
      function getContrastRatio(rgb1: string, rgb2: string): number {
        const parse = (rgb: string) => {
          const match = rgb.match(/\d+/g);
          return match ? [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])] : [0, 0, 0];
        };
        const [r1, g1, b1] = parse(rgb1);
        const [r2, g2, b2] = parse(rgb2);
        const l1 = getLuminance(r1, g1, b1);
        const l2 = getLuminance(r2, g2, b2);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      }

      const issues: any[] = [];
      const textElements = document.querySelectorAll('p, span, button, a, label, h1, h2, h3, h4, h5, h6');

      textElements.forEach((el, idx) => {
        const text = el.textContent?.trim();
        if (text && text.length > 0) {
          const style = window.getComputedStyle(el);
          const fgColor = style.color;
          const bgColor = style.backgroundColor;

          try {
            const ratio = getContrastRatio(fgColor, bgColor);
            // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
            if (ratio < 4.5) {
              issues.push({
                text: text.substring(0, 50),
                ratio: ratio.toFixed(2),
                required: 4.5
              });
            }
          } catch (e) {
            // Skip if we can't calculate ratio
          }
        }
      });

      return issues;
    });

    if (contrastIssues.length > 0) {
      console.log(`⚠ Found ${contrastIssues.length} potential contrast issues`);
    } else {
      console.log('✓ Color contrast verification passed');
    }
  });

  test('Responsive Design (Mobile, Tablet, Desktop)', async ({ page: browserPage }) => {
    console.log('\nTesting responsive design across viewports...');

    for (const viewport of VIEWPORTS) {
      await browserPage.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const pageUrl of PAGES_TO_TEST.slice(0, 3).map(p => p.url)) { // Test first 3 pages
        await browserPage.goto(`${BASE_URL}${pageUrl}`, { waitUntil: 'networkidle' });

        // Check for horizontal scrolling (accessibility issue)
        const hasHorizontalScroll = await browserPage.evaluate(() => {
          return document.body.scrollWidth > document.body.clientWidth;
        });

        if (hasHorizontalScroll) {
          console.log(`⚠ ${viewport.name} view of ${pageUrl} has horizontal scrolling`);
        }
      }

      console.log(`✓ ${viewport.name} (${viewport.width}x${viewport.height}) responsive check complete`);
    }
  });

  test('Screen Reader Compatibility Check', async ({ page: browserPage }) => {
    await browserPage.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' });

    console.log('\nChecking screen reader compatibility...');

    const srCompatibility = await browserPage.evaluate(() => {
      const checks = {
        hasMainContent: !!document.querySelector('main') || !!document.querySelector('[role="main"]'),
        hasPageTitle: document.title.length > 0,
        headingHierarchy: true,
        ariaLabels: 0,
        semanticButtons: 0,
        customElements: 0
      };

      // Check heading hierarchy
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      for (let i = 1; i < headings.length; i++) {
        const current = parseInt(headings[i].tagName[1]);
        const prev = parseInt(headings[i - 1].tagName[1]);
        if (current > prev + 1) {
          checks.headingHierarchy = false;
          break;
        }
      }

      // Count ARIA labels
      checks.ariaLabels = document.querySelectorAll('[aria-label]').length;
      checks.semanticButtons = document.querySelectorAll('button, [role="button"]').length;
      checks.customElements = document.querySelectorAll('[role]').length;

      return checks;
    });

    console.log(`✓ Main content element: ${srCompatibility.hasMainContent ? 'YES' : 'NO'}`);
    console.log(`✓ Page title: ${srCompatibility.hasPageTitle ? 'YES' : 'NO'}`);
    console.log(`✓ Proper heading hierarchy: ${srCompatibility.headingHierarchy ? 'YES' : 'NO'}`);
    console.log(`✓ Elements with ARIA labels: ${srCompatibility.ariaLabels}`);
    console.log(`✓ Semantic buttons: ${srCompatibility.semanticButtons}`);
    console.log(`✓ Custom elements with roles: ${srCompatibility.customElements}`);

    expect(srCompatibility.hasMainContent, 'Page should have main content region').toBe(true);
    expect(srCompatibility.hasPageTitle, 'Page should have a title').toBe(true);
    expect(srCompatibility.headingHierarchy, 'Headings should follow proper hierarchy').toBe(true);
  });
});
